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
  // padStart(7) keeps `[000.000]..[999.999]` aligned at 7 chars. Scans
  // over 1000 s (> 16 min) naturally overflow by a digit — cosmetic
  // only, no truncation. Practical scans target 3-5 seconds so the
  // aligned format covers > 99% of real use.
  return seconds.toFixed(3).padStart(7, '0');
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
 *
 * When you bump this, ALSO update:
 *   - web/app/_lib/strings.ts    (label2 — both locales)
 *   - web/app/_components/LiveTerminal.tsx (loading N rules)
 *   - README.md Current coverage bullet + `N rules across M categories`
 *   - All 4 locale READMEs (ja / ko / zh-Hans / zh-Hant)
 *
 * The test in test/scan-prelude.test.ts cross-checks this against the
 * actual rule count in src/rules/*.ts — if a rule is added here but
 * the RULE_COUNT_LINE number isn't bumped, tests fail. The landing
 * page strings aren't currently cross-checked at test time (they live
 * in a separate Next.js project); keep this checklist updated manually.
 */
export const RULE_COUNT_LINE = 'loading 51 rules · 9 categories';
