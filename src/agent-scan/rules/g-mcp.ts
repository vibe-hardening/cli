import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import fg from 'fast-glob';
import { parseJsonConfigContent } from '../parsers/json-config.js';
import { SECRET_RULES } from '../../rules/secrets.js';
import { scanSecrets } from '../../engines/secret-regex.js';
import type { AgentDetected, AgentFinding } from '../types.js';
import type { Severity } from '../../core/types.js';

/**
 * Rule G — MCP server config issues in mcp.json files.
 *
 * Targets:
 *   - agent.configPath when it ends in `mcp.json`
 *   - <cwd>/.cursor/mcp.json (project-level)
 *   - other configPath files where the parsed JSON contains a top-level
 *     `mcpServers` key (some agents nest MCP config inside a larger
 *     settings.json)
 *
 * Sub-rules:
 *   G01  command/args contains http:// (not https)
 *   G02  command/args contains localhost / 127.0.0.1 / [::1]
 *   G03  env value matches a v1 SECRET_RULES pattern (delegated to A)
 *   G04  server name typosquats a known MCP server (Levenshtein ≤ 2)
 *   G05  server count > 20 (large attack surface)
 *   G06  args[0] is `npx -y` and package isn't in our small known list
 */

export interface RuleGResult {
  findings: AgentFinding[];
  filesScanned: number;
}

const KNOWN_MCP_SERVERS = new Set<string>([
  'github',
  'sentry',
  'linear',
  'notion',
  'slack',
  'stripe',
  'openai',
  'anthropic',
  'supabase',
  'vercel',
  'fetch',
  'filesystem',
  'memory',
  'puppeteer',
  'sqlite',
  'postgres',
  'time',
  'sequential-thinking',
]);

const KNOWN_NPX_PACKAGES = new Set<string>([
  '@modelcontextprotocol/server-github',
  '@modelcontextprotocol/server-fetch',
  '@modelcontextprotocol/server-filesystem',
  '@modelcontextprotocol/server-memory',
  '@modelcontextprotocol/server-puppeteer',
  '@modelcontextprotocol/server-sqlite',
  '@modelcontextprotocol/server-postgres',
  '@modelcontextprotocol/server-slack',
  '@modelcontextprotocol/server-time',
  '@modelcontextprotocol/server-sequential-thinking',
  'mcp-server-stripe',
  'mcp-server-supabase',
  '@sentry/mcp-server',
]);

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
}

interface McpServerEntry {
  command?: unknown;
  args?: unknown;
  env?: unknown;
  url?: unknown;
}

function isMcpServersShape(
  obj: unknown,
): obj is { mcpServers: Record<string, McpServerEntry> } {
  if (typeof obj !== 'object' || obj === null) return false;
  const ms = (obj as { mcpServers?: unknown }).mcpServers;
  return typeof ms === 'object' && ms !== null && !Array.isArray(ms);
}

function mapSecretSeverity(s: Severity): AgentFinding['severity'] {
  if (s === 'critical' || s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return 'info';
}

function scanOneMcpFile(
  filePath: string,
  raw: string,
): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const parsed = parseJsonConfigContent(filePath, raw);
  if (!isMcpServersShape(parsed.parsed)) return findings;

  const mcp = parsed.parsed.mcpServers;
  const serverNames = Object.keys(mcp);

  // G05 — server count > 20
  if (serverNames.length > 20) {
    findings.push({
      ruleId: 'vh-agent-g05',
      severity: 'low',
      category: 'mcp',
      file: filePath,
      line: 1,
      column: 1,
      snippet: `${serverNames.length} servers configured`,
      message: `mcp.json registers ${serverNames.length} servers — large potential attack surface`,
      fixHint:
        'Each MCP server is code that can be invoked by the agent. Disable any servers you no longer use.',
    });
  }

  for (const [name, entry] of Object.entries(mcp)) {
    const command = typeof entry.command === 'string' ? entry.command : '';
    const args = Array.isArray(entry.args) ? entry.args : [];
    const url = typeof entry.url === 'string' ? entry.url : '';
    const argsJoined = args
      .map((a) => (typeof a === 'string' ? a : ''))
      .join(' ');
    const cmdLine = `${command} ${argsJoined} ${url}`.trim();

    // G01 — http:// (not https)
    if (/\bhttp:\/\//i.test(cmdLine)) {
      findings.push({
        ruleId: 'vh-agent-g01',
        severity: 'medium',
        category: 'mcp',
        file: filePath,
        line: 1,
        column: 1,
        snippet: `${name}: ${cmdLine.slice(0, 80)}`,
        message: `MCP server "${name}" uses http:// (non-TLS)`,
        fixHint: 'Switch to https:// — MCP traffic can include sensitive context.',
      });
    }

    // G02 — localhost / 127.0.0.1 / [::1]
    if (/\b(?:localhost|127\.0\.0\.1|\[::1\])\b/i.test(cmdLine)) {
      findings.push({
        ruleId: 'vh-agent-g02',
        severity: 'low',
        category: 'mcp',
        file: filePath,
        line: 1,
        column: 1,
        snippet: `${name}: ${cmdLine.slice(0, 80)}`,
        message: `MCP server "${name}" points at localhost (likely dev residue)`,
        fixHint:
          'Local MCP servers are fine for development, but verify you intended to keep this in your global config.',
      });
    }

    // G03 — env value contains a secret pattern
    if (
      typeof entry.env === 'object' &&
      entry.env !== null &&
      !Array.isArray(entry.env)
    ) {
      const envObj = entry.env as Record<string, unknown>;
      for (const [envKey, envVal] of Object.entries(envObj)) {
        if (typeof envVal !== 'string' || envVal.length < 12) continue;
        const ctx = {
          path: filePath,
          content: `${envKey}=${envVal}`,
        };
        const hits = scanSecrets(ctx, SECRET_RULES);
        for (const h of hits) {
          findings.push({
            ruleId: h.ruleId, // preserve original (e.g. vh-secret-openai)
            severity: mapSecretSeverity(h.severity),
            category: 'mcp',
            file: filePath,
            line: 1,
            column: 1,
            snippet: `${name}.env.${envKey}: ${h.snippet}`,
            message: `MCP server "${name}" stores a secret in env (${h.message.toLowerCase()})`,
            fixHint:
              'Use a secret manager or environment-injected variables instead of plaintext in mcp.json.',
          });
        }
      }
    }

    // G04 — server name typosquats a known MCP server
    if (
      name.length >= 4 &&
      !KNOWN_MCP_SERVERS.has(name.toLowerCase())
    ) {
      for (const known of KNOWN_MCP_SERVERS) {
        const d = levenshtein(name.toLowerCase(), known);
        if (d > 0 && d <= 2) {
          findings.push({
            ruleId: 'vh-agent-g04',
            severity: 'medium',
            category: 'mcp',
            file: filePath,
            line: 1,
            column: 1,
            snippet: `${name} (≈ ${known})`,
            message: `MCP server name "${name}" suspiciously close to known "${known}" (Levenshtein ${d})`,
            fixHint:
              'Typosquatted MCP server names are a known supply-chain pattern. Verify the source.',
          });
          break;
        }
      }
    }

    // G06 — `npx -y <pkg>` not in known list
    if (
      command === 'npx' &&
      args.length >= 2 &&
      args[0] === '-y' &&
      typeof args[1] === 'string'
    ) {
      const pkg = args[1];
      if (!KNOWN_NPX_PACKAGES.has(pkg)) {
        findings.push({
          ruleId: 'vh-agent-g06',
          severity: 'low',
          category: 'mcp',
          file: filePath,
          line: 1,
          column: 1,
          snippet: `npx -y ${pkg}`,
          message: `MCP server "${name}" auto-installs unverified npm package via \`npx -y ${pkg}\``,
          fixHint:
            'npx -y will auto-install and run the package every time the MCP server starts. Pin a version, audit the package, or vendor it locally.',
        });
      }
    }
  }

  return findings;
}

export async function applyRuleG(
  agents: AgentDetected[],
  cwd?: string,
): Promise<RuleGResult> {
  const findings: AgentFinding[] = [];
  let filesScanned = 0;

  // Collect all candidate JSON config paths
  const candidates = new Set<string>();
  for (const agent of agents) {
    if (agent.configPath && agent.configPath.endsWith('.json')) {
      candidates.add(agent.configPath);
    }
  }
  // Project-level: <cwd>/.cursor/mcp.json
  if (cwd) {
    const projMcp = join(cwd, '.cursor', 'mcp.json');
    if (existsSync(projMcp)) candidates.add(projMcp);
  }

  for (const path of candidates) {
    try {
      const raw = await readFile(path, 'utf8');
      filesScanned++;
      findings.push(...scanOneMcpFile(path, raw));
    } catch {
      // unreadable — skip
    }
  }

  return { findings, filesScanned };
}
