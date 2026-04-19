import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pc from 'picocolors';
import { walk } from '../core/walker.js';
import { runScan } from '../core/scan.js';
import type { Severity } from '../core/types.js';
import { renderConsole } from '../reporters/console.js';
import { renderJson } from '../reporters/json.js';

const VALID_FORMATS = new Set(['console', 'json']);
const VALID_SEVERITIES: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

export interface ScanCommandOptions {
  cwd: string;
  format: 'console' | 'json';
  output?: string;
  severity: Severity;
  offline: boolean;
  includeTests: boolean;
  includeDocs: boolean;
  version: string;
}

export async function runScanCommand(
  opts: ScanCommandOptions,
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

  const cwd = resolve(opts.cwd);
  if (opts.format === 'console') {
    process.stdout.write(
      `${pc.dim('scanning')} ${pc.cyan(cwd)} ${pc.dim('...')}\n`,
    );
  }

  const files = await walk({ cwd });
  const report = await runScan({
    files,
    minSeverity: opts.severity,
    offline: opts.offline,
    includeTests: opts.includeTests,
    includeDocs: opts.includeDocs,
  });

  if (opts.format === 'json') {
    const json = renderJson(report, opts.version);
    if (opts.output) {
      await writeFile(opts.output, json, 'utf8');
    } else {
      process.stdout.write(`${json}\n`);
    }
  } else {
    const out = renderConsole(report);
    if (opts.output) {
      await writeFile(opts.output, out, 'utf8');
    } else {
      process.stdout.write(out);
    }
  }

  return report.summary.critical + report.summary.high > 0 ? 1 : 0;
}
