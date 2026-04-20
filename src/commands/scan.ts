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
  verify: boolean;
  own: boolean;
  roast: boolean;
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

  // --verify makes real HTTP calls to provider APIs using the found
  // secret. Without --own the user might unknowingly probe someone
  // else's credentials — we hard-gate it and warn instead of failing
  // so CI pipelines don't break if --own is forgotten.
  let verifyEnabled = false;
  if (opts.verify) {
    if (!opts.own) {
      process.stderr.write(
        pc.yellow(
          'warning: --verify requires --own to confirm the keys are yours.\n' +
            '         refusing to probe third-party credentials. skipping live check.\n',
        ),
      );
    } else {
      verifyEnabled = true;
    }
  }

  const files = await walk({ cwd, respectGitignore: opts.respectGitignore });
  const report = await runScan({
    files,
    minSeverity: opts.severity,
    offline: opts.offline,
    includeTests: opts.includeTests,
    includeDocs: opts.includeDocs,
    verify: verifyEnabled,
    // Non-fatal scan errors (network down, provider timeout) surface
    // to stderr so users on restricted networks don't silently
    // receive a clean score when supply-chain checks actually failed.
    onWarning: (msg) => {
      process.stderr.write(`${pc.yellow('warning:')} ${msg}\n`);
    },
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
    const out = renderConsole(report, { roast: opts.roast });
    if (opts.output) {
      await writeTo(opts.output, out);
    } else {
      process.stdout.write(out);
    }
  }

  return report.summary.critical + report.summary.high > 0 ? 1 : 0;
}
