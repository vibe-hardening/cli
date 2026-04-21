import pc from 'picocolors';

/**
 * Brutalist telemetry-style milestones printed while the scan is
 * running. Matches the LiveTerminal animation on the landing page so
 * the CLI ↔ marketing site tell the same visual story.
 *
 * Only enabled when:
 *   - stdout is a TTY (not piped / not redirected to file)
 *   - output format is `console` (not json / html)
 *   - `--output` is NOT set (that writes console to a file, which is
 *     effectively a pipe)
 *
 * Otherwise every prelude call is a no-op — JSON / HTML / CI
 * pipelines never see telemetry lines that would pollute their
 * machine-parseable output.
 */
export interface PreludeContext {
  enabled: boolean;
  startMs: number;
  /**
   * Injectable writer so tests can capture output. Defaults to
   * `process.stdout.write` in production.
   */
  write: (s: string) => void;
}

export interface PreludeOptions {
  /** Master switch. Usually `process.stdout.isTTY && format === 'console' && !output`. */
  enabled: boolean;
  writer?: (s: string) => void;
}

export function createPrelude(opts: PreludeOptions): PreludeContext {
  return {
    enabled: opts.enabled,
    startMs: Date.now(),
    write: opts.writer ?? ((s) => process.stdout.write(s)),
  };
}

function elapsedTag(ctx: PreludeContext): string {
  const seconds = (Date.now() - ctx.startMs) / 1000;
  return seconds.toFixed(3).padStart(6, '0');
}

/**
 * Header line printed at the very start of a scan. Identifies the
 * tool + session like a military / aerospace status banner.
 */
export function preludeHeader(ctx: PreludeContext): void {
  if (!ctx.enabled) return;
  ctx.write(
    `${pc.red(pc.bold('▲ VH-001'))} ${pc.dim('· INITIATING SCAN')}\n`,
  );
}

/**
 * One phase milestone. Prints a dim timestamp + description. Intended
 * for event-style progress (e.g. "indexed 412 files", "fingerprint →
 * nextjs", "osv.dev ···").
 */
export function milestone(ctx: PreludeContext, msg: string): void {
  if (!ctx.enabled) return;
  ctx.write(`  ${pc.dim(`[${elapsedTag(ctx)}]`)} ${pc.dim(msg)}\n`);
}

/**
 * Closing line before the full report. Mirrors the `SCAN COMPLETE`
 * phrasing on the landing terminal animation.
 */
export function preludeFooter(
  ctx: PreludeContext,
  totalFindings: number,
): void {
  if (!ctx.enabled) return;
  const summary = totalFindings === 0 ? 'clean' : `${totalFindings} findings`;
  ctx.write(
    `  ${pc.dim(`[${elapsedTag(ctx)}]`)} ${pc.red(pc.bold('SCAN COMPLETE'))} ${pc.dim(`· ${summary}`)}\n\n`,
  );
}

/**
 * Total rule count + category count surfaced in the prelude.
 * Kept as a single constant so the number matches the landing page
 * and Current coverage bullet. When rules are added the CI tests
 * will fail if this drifts — see test/scan-prelude.test.ts.
 */
export const RULE_COUNT_LINE = 'loading 48 rules · 9 categories';
