import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pc from 'picocolors';
import { walk } from '../core/walker.js';
import { runScan } from '../core/scan.js';
import type { Finding, Severity } from '../core/types.js';
import { detectPlatform } from '../detectors/platform.js';
import { getChangedFiles } from '../core/git-diff.js';
import { diffFindings } from '../core/compare.js';
import { renderConsole } from '../reporters/console.js';
import { renderJson } from '../reporters/json.js';
import { renderHtml } from '../reporters/html.js';
import { renderMarkdown } from '../reporters/markdown.js';
import { renderSuggestFix } from '../reporters/suggest-fix.js';
import { generateSuggestions } from '../fix/suggestions.js';
import {
  createPrelude,
  preludeHeader,
  milestone,
  preludeFooter,
  RULE_COUNT_LINE,
} from '../reporters/scan-prelude.js';
import {
  ensureConfig,
  buildEvent,
  postEvent,
} from '../core/telemetry.js';

const VALID_FORMATS = new Set(['console', 'json', 'html', 'markdown']);

/**
 * Demo-mode line pacing for the console body (findings list,
 * suggest-fix block). Reuses the same `VIBE_DEMO_DELAY` env var that
 * scan-prelude reads. Scales the per-milestone delay down by 4× so
 * a 300 ms prelude cadence gives a 75 ms per-line scroll — fast
 * enough to read but with visible reveal animation suitable for
 * screencasts.
 */
const BODY_LINE_DELAY_MS = (() => {
  const raw = process.env.VIBE_DEMO_DELAY;
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(20, Math.min(200, Math.round(n / 4)));
})();

function writeStdoutPaced(out: string): void {
  if (BODY_LINE_DELAY_MS <= 0 || !process.stdout.isTTY) {
    process.stdout.write(out);
    return;
  }
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  const lines = out.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    process.stdout.write(i < lines.length - 1 ? line + '\n' : line);
    if (i < lines.length - 1) {
      Atomics.wait(view, 0, 0, BODY_LINE_DELAY_MS);
    }
  }
}
const VALID_SEVERITIES: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

export interface ScanCommandOptions {
  cwd: string;
  format: 'console' | 'json' | 'html' | 'markdown';
  output?: string;
  severity: Severity;
  offline: boolean;
  includeTests: boolean;
  includeDocs: boolean;
  respectGitignore: boolean;
  verify: boolean;
  own: boolean;
  roast: boolean;
  /**
   * `false`     — full repo scan (default).
   * `true`      — diff against HEAD (uncommitted + staged changes).
   * `<string>`  — diff against ref, e.g. `main` or `origin/main` for
   *               PR scans. Uses 3-dot syntax so it shows ONLY the
   *               commits on this branch since the merge-base.
   */
  changedOnly: boolean | string;
  /**
   * `--suggest-fix` — print copy-paste-able diffs for findings that
   * match a fixable secret rule (inline literal → process.env.X).
   * Never modifies files. Console-only; JSON / HTML output is
   * unaffected so machine-parseable artifacts stay clean.
   */
  suggestFix: boolean;
  /**
   * `--compare <path>` — path to a previous scan's JSON output.
   * When set, the report shows ONLY findings new since that
   * baseline (added) and reports counts for fixed / unchanged.
   * Use case: PR review (compare PR scan vs main-branch baseline)
   * and onboarding old repos (snapshot today's findings, only fail
   * CI on regressions). Empty string / undefined = full report.
   */
  compare?: string;
  version: string;
}

export async function runScanCommand(
  opts: ScanCommandOptions,
): Promise<number> {
  if (!VALID_FORMATS.has(opts.format)) {
    process.stderr.write(
      pc.red(
        `error: unknown format "${opts.format}". use console | json | html | markdown.\n`,
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

  // --suggest-fix is console-only by design (it prints copy-paste
  // diffs that don't belong in machine-parseable artifacts). Warn
  // loudly if combined with json/html so the user doesn't think
  // their flag silently worked.
  if (opts.suggestFix && opts.format !== 'console') {
    process.stderr.write(
      pc.yellow(
        `warning: --suggest-fix only applies to console output (got --format ${opts.format}). ignoring.\n`,
      ),
    );
  }

  const cwd = resolve(opts.cwd);

  // Live terminal animation: only when stdout is an interactive TTY
  // AND we're writing the console format AND not redirecting to a
  // file. Machine-parseable pipelines (JSON / HTML / pipe to file)
  // get the silent fast path so their output stays clean.
  const preludeEnabled =
    opts.format === 'console' &&
    !opts.output &&
    process.stdout.isTTY === true;

  // Telemetry first-run prompt fires here, BEFORE the prelude header,
  // so the disclosure copy isn't visually competing with the brutalist
  // scan banner. `interactive` matches `preludeEnabled` — non-TTY /
  // piped / JSON output runs return null and skip the prompt entirely
  // (next interactive run will prompt fresh). DO_NOT_TRACK / CI /
  // VH_TELEMETRY=off short-circuit too — see telemetry.ts.
  const telemetryConfig = await ensureConfig({ interactive: preludeEnabled });

  const prelude = createPrelude({ enabled: preludeEnabled });
  preludeHeader(prelude);

  if (opts.format === 'console' && !preludeEnabled) {
    // Non-TTY console output still gets a minimal "scanning" breadcrumb
    // so piped/file output has something to grep for.
    process.stdout.write(
      `${pc.dim('scanning')} ${pc.cyan(cwd)} ${pc.dim('...')}\n`,
    );
  }

  // --verify makes real HTTP calls to provider APIs using the found
  // secret. Two gating conditions:
  //   1. --own must be passed (otherwise we might unknowingly probe
  //      someone else's credentials — hard-gate + warn).
  //   2. --offline cannot also be passed. --offline is documented as
  //      "skip network-dependent checks", so firing live verify HTTP
  //      in offline mode violates that contract. Users on air-gapped
  //      or firewalled networks reasonably expect zero outbound
  //      calls when they pass --offline.
  let verifyEnabled = false;
  if (opts.verify) {
    if (opts.offline) {
      process.stderr.write(
        pc.yellow(
          'warning: --verify is incompatible with --offline.\n' +
            '         --offline skips all network calls; verify requires them. skipping live check.\n',
        ),
      );
    } else if (!opts.own) {
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

  let files = await walk({ cwd, respectGitignore: opts.respectGitignore });
  milestone(prelude, `indexed ${files.length} files`);

  // --changed-only filters the walker output to only files that
  // appear in `git diff`. Fast path for CI / pre-commit / PR review
  // where re-scanning unchanged files is wasted work.
  if (opts.changedOnly !== false) {
    const base =
      typeof opts.changedOnly === 'string' && opts.changedOnly.length > 0
        ? opts.changedOnly
        : undefined;
    let changedResult;
    try {
      changedResult = await getChangedFiles({ cwd, base });
    } catch (err) {
      process.stderr.write(
        pc.red(
          `error: ${err instanceof Error ? err.message : 'git diff failed'}\n`,
        ),
      );
      return 2;
    }
    const changedSet = new Set(changedResult.files);
    const before = files.length;
    files = files.filter((f) => changedSet.has(f.path));
    milestone(
      prelude,
      `git diff vs ${changedResult.ref}: ${files.length} of ${before} files changed`,
    );

    // If the diff is empty, scan completes immediately. Don't error
    // — a clean diff means "nothing to scan" which is a valid result
    // (user just ran scan after a commit reset, or the only changes
    // are in files we'd skip anyway).
    if (files.length === 0) {
      milestone(prelude, 'no changed files to scan');
    }
  }

  // Sneak-peek platform detection so the prelude can show the
  // fingerprint line before the full scan runs. runScan will detect
  // platform again internally — negligible cost, walk() already did
  // the expensive I/O.
  const platformPeek = detectPlatform(files);
  if (platformPeek.platform !== 'unknown') {
    const pct = Math.round(platformPeek.confidence * 100);
    milestone(
      prelude,
      `fingerprint → ${platformPeek.platform} (${pct}% confidence)`,
    );
  }

  milestone(prelude, RULE_COUNT_LINE);

  if (!opts.offline) {
    milestone(prelude, 'osv.dev + npm registry lookups');
  }

  if (verifyEnabled) {
    milestone(prelude, '--verify live-checking leaked keys against providers');
  }

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

  // Kick off telemetry POST in parallel with the report rendering
  // below — the 1.5 s timeout inside postEvent then mostly hides
  // behind the time spent rendering / writing files. Snapshot is
  // taken from the un-mutated report (before any --compare delta
  // shrinks `report.findings`), so rules_fired reflects the full
  // codebase state, not just a PR delta.
  const telemetryPromise =
    telemetryConfig?.enabled
      ? postEvent(
          buildEvent({
            config: telemetryConfig,
            report,
            vhVersion: opts.version,
          }),
        )
      : Promise.resolve();

  // ---------------------------------------------------------------
  // ⚠ TELEMETRY ORDERING: the --compare block below mutates
  // `report.findings` and `report.summary` in place. The
  // `telemetryPromise` above MUST be assigned before this point so
  // the snapshotted `rules_fired` reflects the full scan, not a
  // PR delta. If you reorder, the buildEvent call must move with it.
  // ---------------------------------------------------------------

  // --compare baseline.json — filter the report's findings down to
  // only those that are NEW vs the baseline. Marks the report with
  // `compare` metadata so JSON / HTML / markdown consumers can tell
  // they are looking at a delta view, not a full snapshot.
  let compareDelta: { added: number; removed: number; unchanged: number } | null =
    null;
  if (opts.compare) {
    try {
      const raw = await readFile(resolve(opts.compare), 'utf8');
      const parsed = JSON.parse(raw) as { findings?: unknown };
      // Validate baseline shape — older versions or mis-saved files
      // may ship Finding objects missing fields (e.g. `column`),
      // which would silently produce wrong fingerprints (undefined
      // serialises to `null` in JSON.stringify, classifying every
      // current finding as "added"). Drop malformed entries early
      // and warn the user.
      const baseline: Finding[] = [];
      let dropped = 0;
      if (Array.isArray(parsed.findings)) {
        for (const f of parsed.findings as unknown[]) {
          if (
            f !== null &&
            typeof f === 'object' &&
            typeof (f as Finding).ruleId === 'string' &&
            typeof (f as Finding).file === 'string' &&
            typeof (f as Finding).line === 'number' &&
            typeof (f as Finding).column === 'number' &&
            typeof (f as Finding).snippet === 'string'
          ) {
            baseline.push(f as Finding);
          } else {
            dropped++;
          }
        }
      }
      if (dropped > 0) {
        process.stderr.write(
          pc.yellow(
            `warning: --compare baseline had ${dropped} malformed finding(s) (missing ruleId/file/line/column/snippet). Re-generate the baseline with the current vibe-hardening version.\n`,
          ),
        );
      }
      const diff = diffFindings(report.findings, baseline);
      compareDelta = {
        added: diff.added.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged.length,
      };
      // Mutate report in-place so all downstream reporters see the
      // filtered list. Keep the score as-is — `score` reflects the
      // absolute state of the codebase, not "score-of-this-delta".
      // The point of --compare is "what changed in THIS PR" — not
      // "pretend known issues don't exist".
      report.findings = diff.added;
      const sev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      for (const f of diff.added) sev[f.severity]++;
      report.summary = sev;
      // Surface the delta in the report metadata so JSON / HTML /
      // markdown consumers can detect compare-mode without parsing
      // console output. Without this a CI pipeline reading the JSON
      // sees `summary.critical = 0` next to `score = 42` and has no
      // way to tell whether that's "clean repo" or "no regressions".
      report.compare = {
        baselinePath: opts.compare,
        added: diff.added.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged.length,
      };
    } catch (err) {
      process.stderr.write(
        pc.yellow(
          `warning: --compare baseline could not be loaded (${err instanceof Error ? err.message : 'unknown'}). showing full report.\n`,
        ),
      );
    }
  }

  preludeFooter(prelude, report.findings.length);

  if (compareDelta && opts.format === 'console') {
    process.stdout.write(
      pc.dim('\n  Δ vs baseline ') +
        pc.cyan(opts.compare!) +
        pc.dim(': ') +
        pc.bold(pc.red(`+${compareDelta.added} new`)) +
        pc.dim(' · ') +
        pc.bold(pc.green(`-${compareDelta.removed} fixed`)) +
        pc.dim(` · ${compareDelta.unchanged} unchanged`) +
        '\n',
    );
  }

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
  } else if (opts.format === 'markdown') {
    const md = renderMarkdown(report, opts.version);
    if (opts.output) {
      await writeTo(opts.output, md);
    } else {
      process.stdout.write(md.endsWith('\n') ? md : `${md}\n`);
    }
  } else {
    const out = renderConsole(report, { roast: opts.roast });
    if (opts.output) {
      await writeTo(opts.output, out);
    } else {
      writeStdoutPaced(out);
      // --suggest-fix appends after the regular report so the user
      // sees the findings list first, then the actionable patches.
      // Suppressed when output is redirected to a file (`-o foo.txt`)
      // so the file content matches what would print to stdout.
      if (opts.suggestFix) {
        const suggestions = generateSuggestions(report.findings, files);
        if (suggestions.length > 0) {
          writeStdoutPaced(renderSuggestFix(suggestions));
        }
      }
    }
  }

  // Wait for the in-flight telemetry POST (fired in parallel above) to
  // complete or hit its 1.5 s abort. Without this, cli.ts's
  // process.exit would kill the fetch before the body flushes.
  await telemetryPromise;

  return report.summary.critical + report.summary.high > 0 ? 1 : 0;
}
