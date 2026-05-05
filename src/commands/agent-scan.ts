import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pc from 'picocolors';
import { runAgentScan } from '../agent-scan/runner.js';
import {
  renderAgentJson,
  renderAgentText,
  summarize,
} from '../agent-scan/reporter.js';
import type { AgentSeverity } from '../agent-scan/types.js';

const VALID_FORMATS = new Set(['console', 'json']);
const VALID_SEVERITIES: AgentSeverity[] = ['high', 'medium', 'low', 'info'];

export interface AgentScanCommandOptions {
  cwd: string;
  format: 'console' | 'json';
  output?: string;
  severity: AgentSeverity;
  version: string;
}

/**
 * `vibe-hardening agent scan` — entry point for the agent skill
 * scanner. D1 scaffold: wires detection + reporter + exit codes
 * end-to-end. Rule packs (A/B/C/D/G) ship in D2-D4; until then the
 * findings list is always empty, but everything else (paths, JSON
 * shape, exit code semantics) is correct so dependent code (CI
 * pipelines, etc.) can integrate today.
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

  // Severity gate — drop findings below threshold before rendering
  // so JSON consumers also see only what was asked for.
  const minRank = severityRank(opts.severity);
  result.findings = result.findings.filter(
    (f) => severityRank(f.severity) >= minRank,
  );

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

  // Exit codes mirror v1 `vibe-hardening scan`:
  //   0 = clean
  //   1 = LOW / MEDIUM findings
  //   2 = HIGH findings (CI should fail)
  const sev = summarize(result.findings);
  if (sev.high > 0) return 2;
  if (sev.medium > 0 || sev.low > 0) return 1;
  return 0;
}

function severityRank(s: AgentSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3 }[s];
}
