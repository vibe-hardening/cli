import type { Finding } from './types.js';

/**
 * Stable fingerprint of a finding. Used to match the "same finding"
 * between two scans, so the user can see only what changed in this
 * PR / commit.
 *
 * Includes ruleId, file, line, column, and the redacted snippet —
 * snippet is in there because two findings on the same line can be
 * legitimately different (e.g. two adjacent secret literals on one
 * line both flagged). Excludes line/column drift that would happen
 * when a file is edited above the finding — that means a file edit
 * that pushes the same secret from line 12 to line 14 will look
 * "removed + added", which over-counts. Acceptable trade-off vs.
 * the alternative of fingerprinting only by content (which would
 * mis-merge two different findings of the same kind).
 */
export function fingerprint(f: Finding): string {
  return `${f.ruleId}::${f.file}::${f.line}::${f.column}::${f.snippet}`;
}

export interface FindingsDiff {
  added: Finding[];
  removed: Finding[];
  unchanged: Finding[];
}

/**
 * Compare a current scan's findings against a baseline. The
 * `removed` set comes from the baseline (which is why we keep both
 * Finding[] inputs typed the same — baseline JSON parses to the
 * same Finding shape).
 */
export function diffFindings(
  current: Finding[],
  baseline: Finding[],
): FindingsDiff {
  const baselineMap = new Map<string, Finding>();
  for (const f of baseline) baselineMap.set(fingerprint(f), f);

  const added: Finding[] = [];
  const unchanged: Finding[] = [];

  for (const f of current) {
    const fp = fingerprint(f);
    if (baselineMap.has(fp)) {
      unchanged.push(f);
      baselineMap.delete(fp);
    } else {
      added.push(f);
    }
  }

  // Whatever remains in baselineMap had no match in current —
  // either fixed, or moved to a new line (see fingerprint() comment
  // about edit-induced false-removed).
  const removed = Array.from(baselineMap.values());
  return { added, removed, unchanged };
}
