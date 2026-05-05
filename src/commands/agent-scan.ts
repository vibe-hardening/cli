import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pc from 'picocolors';
import { runAgentScan } from '../agent-scan/runner.js';
import {
  renderAgentJson,
  renderAgentText,
  summarize,
} from '../agent-scan/reporter.js';
import type {
  AgentFinding,
  AgentScanResult,
  AgentSeverity,
} from '../agent-scan/types.js';
import {
  buildAgentScanEvent,
  ensureConfig,
  postEvent,
} from '../core/telemetry.js';

const VALID_FORMATS = new Set(['console', 'json']);
const VALID_SEVERITIES: AgentSeverity[] = ['high', 'medium', 'low', 'info'];

/** Public platform IDs this CLI version probes. Stable across runs;
 *  used in telemetry's `agents_detected` presence vector. */
const KNOWN_AGENT_IDS: readonly string[] = [
  'openclaw',
  'hermes',
  'cursor',
  'claude-code',
  'gemini-cli',
  'goose',
  'opencode',
  'codex',
  'trae',
  'factory',
];

export interface AgentScanCommandOptions {
  cwd: string;
  format: 'console' | 'json';
  output?: string;
  severity: AgentSeverity;
  /** Optional rule-ID allowlist (comma-separated). Case-insensitive
   *  prefix match — `--rule A` matches all rule-A findings, `--rule
   *  vh-secret-openai` matches that one rule. Empty = all rules. */
  rule?: string;
  /** Optional rule-ID denylist (same syntax as --rule). */
  exclude?: string;
  /** Optional target agent — restricts scan to one platform. Empty = all. */
  target?: string;
  /** When true, skip telemetry POST even if user has opted in via
   *  `vh config set telemetry on`. Per-invocation override. */
  noTelemetry: boolean;
  version: string;
}

/**
 * `vibe-hardening agent scan` — scans local agent skill files for
 * security issues. End-to-end:
 *   1. detect agents installed
 *   2. apply rule packs A/B/C/D/G in parallel
 *   3. filter findings by severity / rule / exclude
 *   4. render text or JSON
 *   5. fire telemetry (if opted in and not --no-telemetry)
 *   6. exit code 0 / 1 / 2 mirroring v1 scan
 */
export async function runAgentScanCommand(
  opts: AgentScanCommandOptions,
): Promise<number> {
  if (!VALID_FORMATS.has(opts.format)) {
    process.stderr.write(
      pc.red(`error: unknown format "${opts.format}". use console | json.\n`),
    );
    return 2;
  }
  if (!VALID_SEVERITIES.includes(opts.severity)) {
    process.stderr.write(
      pc.red(`error: unknown severity "${opts.severity}".\n`),
    );
    return 2;
  }

  const result = await runAgentScan({ cwd: resolve(opts.cwd) });

  // --target filter — restrict findings to one platform's findings
  // (post-hoc filter on the file path; cheap and avoids re-walking).
  if (opts.target && opts.target !== 'all') {
    const targetAgent = result.agentsDetected.find(
      (a) => a.id === opts.target,
    );
    if (!targetAgent) {
      // Target not detected — clear findings + agents so output is
      // explicit "no findings". Keep duration/files for transparency.
      result.agentsDetected = [];
      result.findings = [];
    } else {
      const targetRoot = targetAgent.rootPath;
      result.agentsDetected = [targetAgent];
      result.findings = result.findings.filter((f) =>
        // Normalise both sides to forward slashes for the prefix check
        // (fast-glob returns `/`, our root may be `\` on Windows).
        f.file.split('\\').join('/').startsWith(
          targetRoot.split('\\').join('/'),
        ),
      );
    }
  }

  // --rule allowlist / --exclude denylist — case-insensitive prefix
  // match against the finding's ruleId. So `--rule A,B` keeps any
  // finding whose ID contains `vh-agent-a` or `vh-agent-b` or
  // `vh-secret-` (rule A reuses the v1 secret pack).
  const allow = parseRuleList(opts.rule);
  const deny = parseRuleList(opts.exclude);
  if (allow) {
    result.findings = result.findings.filter((f) =>
      matchesAnyRule(f.ruleId, allow),
    );
  }
  if (deny) {
    result.findings = result.findings.filter(
      (f) => !matchesAnyRule(f.ruleId, deny),
    );
  }

  // --severity gate (apply LAST so allow/deny lists work above the
  // severity threshold)
  const minRank = severityRank(opts.severity);
  result.findings = result.findings.filter(
    (f) => severityRank(f.severity) >= minRank,
  );

  // Render output
  let out: string;
  if (opts.format === 'json') {
    out = renderAgentJson(result, opts.version);
  } else {
    out = renderAgentText(result);
  }

  if (opts.output) {
    const target = resolve(opts.output);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, out, 'utf8');
    if (opts.format === 'console') {
      process.stdout.write(
        `${pc.green('✓')} report written to ${pc.cyan(target)}\n`,
      );
    }
  } else {
    process.stdout.write(out);
  }

  // Telemetry — fire after rendering so the user sees results before
  // the network wait. Guarded by:
  //   1. --no-telemetry flag (per-invocation override)
  //   2. ensureConfig returns null in non-interactive / opted-out runs
  //   3. config.enabled === true (explicit opt-in, default off)
  if (!opts.noTelemetry) {
    await fireTelemetry(result, opts);
  }

  // Exit codes mirror v1 `vibe-hardening scan`:
  //   0 = clean
  //   1 = LOW / MEDIUM findings
  //   2 = HIGH findings (CI should fail)
  const sev = summarize(result.findings);
  if (sev.high > 0) return 2;
  if (sev.medium > 0 || sev.low > 0) return 1;
  return 0;
}

async function fireTelemetry(
  result: AgentScanResult,
  opts: AgentScanCommandOptions,
): Promise<void> {
  // Detect interactive vs piped/file/JSON. We never PROMPT in agent
  // scan (the v1 scan command is responsible for that on first run);
  // here we only post if the user has already opted in.
  const interactive =
    opts.format === 'console' &&
    !opts.output &&
    process.stdout.isTTY === true;

  const config = await ensureConfig({ interactive });
  if (!config?.enabled) return;

  const rulesFired: Record<string, number> = {};
  for (const f of result.findings) {
    rulesFired[f.ruleId] = (rulesFired[f.ruleId] || 0) + 1;
  }

  const event = buildAgentScanEvent({
    config,
    vhVersion: opts.version,
    agentsDetected: result.agentsDetected.map((a) => a.id),
    knownAgentIds: KNOWN_AGENT_IDS,
    rulesFired,
    filesScanned: result.filesScanned,
    durationMs: result.durationMs,
  });
  await postEvent(event);
}

function severityRank(s: AgentSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3 }[s];
}

/** Parse comma-separated rule list. Returns null on empty/undefined. */
function parseRuleList(raw?: string): string[] | null {
  if (!raw || !raw.trim()) return null;
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Match a rule ID against a `--rule` / `--exclude` list. Examples:
 *   ruleId          | needle    | match?
 *   vh-agent-c01    | c01       | yes (exact segment)
 *   vh-agent-c01    | c         | yes (segment prefix)
 *   vh-secret-openai| c         | NO  (segments are vh/secret/openai)
 *   vh-secret-openai| secret    | yes
 *   vh-secret-openai| openai    | yes
 *   vh-agent-c01    | vh-agent-c01 | yes (full ID match)
 *
 * Implementation: split the rule ID on `-` and test segment-level
 * exact-or-prefix match. The previous `includes()` implementation
 * was too loose ("c" matched "vh-secret-..." because "secret" has a
 * letter c).
 */
function matchesAnyRule(ruleId: string, list: string[]): boolean {
  const lc = ruleId.toLowerCase();
  const segments = lc.split('-');
  return list.some((needle) => {
    if (needle === lc) return true; // exact full-ID match
    return segments.some(
      (seg) => seg === needle || seg.startsWith(needle),
    );
  });
}
