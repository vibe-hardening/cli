import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pc from 'picocolors';
import { walk } from '../core/walker.js';
import { runScan } from '../core/scan.js';
import type { Severity } from '../core/types.js';
import { renderConsole } from '../reporters/console.js';
import { renderJson } from '../reporters/json.js';
import { renderHtml } from '../reporters/html.js';

const VALID_FORMATS = new Set(['console', 'json', 'html']);
const VALID_SEVERITIES: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

export interface ScanCommandOptions {
  cwd: string;
  format: 'console' | 'json' | 'html';
  output?: string;
  severity: Severity;
  offline: boolean;
  includeTests: boolean;
  includeDocs: boolean;
  respectGitignore: boolean;
  version: string;
}

export async function runScanCommand(
  opts: ScanCommandOptions,
): Promise<number> {
  if (!VALID_FORMATS.has(opts.format)) {
    process.stderr.write(
      pc.red(
        `error: unknown format "${opts.format}". use console | json | html.\n`,
      ),
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

  const files = await walk({ cwd, respectGitignore: opts.respectGitignore });
  const report = await runScan({
    files,
    minSeverity: opts.severity,
    offline: opts.offline,
    includeTests: opts.includeTests,
    includeDocs: opts.includeDocs,
  });

  // Create parent dir on demand so `--output foo/bar.html` works even
  // when `foo/` doesn't exist yet.
  async function writeTo(path: string, content: string): Promise<void> {
    const resolved = resolve(path);
    await mkdir(dirname(resolved), { recursive: true });
    await writeFile(resolved, content, 'utf8');
  }

  if (opts.format === 'json') {
    const json = renderJson(report, opts.version);
    if (opts.output) {
      await writeTo(opts.output, json);
    } else {
      process.stdout.write(`${json}\n`);
    }
  } else if (opts.format === 'html') {
    const html = renderHtml(report, opts.version);
    const target = opts.output ?? 'vibe-hardening-report.html';
    await writeTo(target, html);
    process.stdout.write(
      `${pc.green('✓')} HTML report written to ${pc.cyan(target)}\n`,
    );
  } else {
    const out = renderConsole(report);
    if (opts.output) {
      await writeTo(opts.output, out);
    } else {
      process.stdout.write(out);
    }
  }

  return report.summary.critical + report.summary.high > 0 ? 1 : 0;
}
