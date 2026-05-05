import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fg from 'fast-glob';
import { SECRET_RULES } from '../../rules/secrets.js';
import { scanSecrets } from '../../engines/secret-regex.js';
import type { Severity } from '../../core/types.js';
import type { AgentDetected, AgentFinding } from '../types.js';

/**
 * Rule A — hardcoded secrets in agent skill files, configs, and .env.
 *
 * v1 already ships 27 secret rules (`src/rules/secrets.ts`). We reuse
 * them verbatim — same regex, same entropy threshold, same placeholder
 * exclusions — and just extend the path target from "user code" to
 * "agent skill files / configs / env".
 *
 * Per-agent target file matrix:
 *   - skillsPath/**\/SKILL.md          (frontmatter + body)
 *   - skillsPath/**\/scripts/**\/*     (script files in skill bundles)
 *   - configPath                       (openclaw.json / mcp.json /
 *                                       settings.json / config.yaml)
 *   - envPath                          (~/.<agent>/.env — Hermes
 *                                       stores ALL secrets here)
 *   - openclaw extra: workspace/comms/*.json (bot tokens / webhooks)
 */

/**
 * v1's `Severity` includes `'critical'` (top tier for confirmed
 * leaked secrets). The agent-scan reporter uses 4 levels — collapse
 * `critical` to `high` so existing brutalist `[ HIGH ]` styling
 * surfaces them. The underlying `vh-secret-openai` rule ID is
 * preserved so users searching the rule registry get the same hit.
 */
function mapSeverity(s: Severity): AgentFinding['severity'] {
  if (s === 'critical' || s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return 'info';
}

export interface RuleAResult {
  findings: AgentFinding[];
  filesScanned: number;
}

export async function applyRuleA(
  agents: AgentDetected[],
): Promise<RuleAResult> {
  const findings: AgentFinding[] = [];
  let filesScanned = 0;

  for (const agent of agents) {
    const targets = await collectTargetFiles(agent);

    // Concurrency cap of 10 — readFile is fast but a user with 1000+
    // skills shouldn't see node burn 1000 fds in flight. The actual
    // bottleneck is regex evaluation downstream, which is sync, so
    // batching read I/O above that gives plenty of throughput.
    const BATCH = 10;
    for (let i = 0; i < targets.length; i += BATCH) {
      const slice = targets.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map(async (path) => {
          const content = await readFile(path, 'utf8');
          return { path, content };
        }),
      );

      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        filesScanned++;
        const ctx = { path: r.value.path, content: r.value.content };
        const v1Findings = scanSecrets(ctx, SECRET_RULES);
        for (const f of v1Findings) {
          findings.push({
            ruleId: f.ruleId,
            severity: mapSeverity(f.severity),
            category: 'secret',
            file: f.file,
            line: f.line,
            column: f.column,
            snippet: f.snippet,
            message: f.message,
            fixHint: f.remediation,
          });
        }
      }
    }
  }

  return { findings, filesScanned };
}

/**
 * Build the list of file paths to scan for one detected agent.
 * Resilient to missing optional dirs — only enumerates dirs that
 * actually exist (fg returns [] gracefully when cwd is missing
 * because `suppressErrors: true` is the default).
 */
async function collectTargetFiles(agent: AgentDetected): Promise<string[]> {
  const targets: string[] = [];

  if (agent.configPath) targets.push(agent.configPath);
  if (agent.envPath) targets.push(agent.envPath);

  if (agent.skillsPath) {
    const skillFiles = await fg(
      ['**/SKILL.md', '**/scripts/**/*'],
      {
        cwd: agent.skillsPath,
        absolute: true,
        onlyFiles: true,
        // Don't follow symlinks — agents that auto-import skills from
        // foreign paths could trick us into scanning arbitrary FS.
        followSymbolicLinks: false,
      },
    );
    targets.push(...skillFiles);
  }

  // OpenClaw-specific: workspace/comms/*.json holds bot tokens
  // (Telegram, Slack, Discord webhooks) in plaintext. v1.0 spec
  // §2.1 listed this; here we surface it as a rule A target.
  if (agent.id === 'openclaw') {
    const commsPath = join(agent.rootPath, 'workspace', 'comms');
    const commsFiles = await fg(['**/*.json'], {
      cwd: commsPath,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    targets.push(...commsFiles);
  }

  return targets;
}
