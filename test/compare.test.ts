import { describe, it, expect } from 'vitest';
import { diffFindings, fingerprint } from '../src/core/compare.js';
import type { Finding } from '../src/core/types.js';

function f(
  ruleId: string,
  file: string,
  line: number,
  column = 1,
  snippet = 'redacted',
): Finding {
  return {
    ruleId,
    severity: 'high',
    category: 'secret',
    file,
    line,
    column,
    snippet,
    message: 'x',
  };
}

describe('compare: fingerprint', () => {
  it('identical findings produce identical fingerprints', () => {
    expect(fingerprint(f('vh-x', 'a.ts', 10))).toBe(
      fingerprint(f('vh-x', 'a.ts', 10)),
    );
  });

  it('different rule / file / line / col / snippet → different fp', () => {
    const base = f('vh-x', 'a.ts', 10);
    const fps = new Set([
      fingerprint(base),
      fingerprint(f('vh-y', 'a.ts', 10)),
      fingerprint(f('vh-x', 'b.ts', 10)),
      fingerprint(f('vh-x', 'a.ts', 11)),
      fingerprint(f('vh-x', 'a.ts', 10, 2)),
      fingerprint(f('vh-x', 'a.ts', 10, 1, 'other')),
    ]);
    expect(fps.size).toBe(6);
  });
});

describe('compare: diffFindings', () => {
  it('classifies new findings as added', () => {
    const baseline = [f('vh-x', 'a.ts', 1)];
    const current = [f('vh-x', 'a.ts', 1), f('vh-y', 'b.ts', 5)];
    const d = diffFindings(current, baseline);
    expect(d.added).toHaveLength(1);
    expect(d.added[0]!.ruleId).toBe('vh-y');
    expect(d.unchanged).toHaveLength(1);
    expect(d.removed).toHaveLength(0);
  });

  it('classifies fixed findings as removed', () => {
    const baseline = [f('vh-x', 'a.ts', 1), f('vh-y', 'b.ts', 5)];
    const current = [f('vh-x', 'a.ts', 1)];
    const d = diffFindings(current, baseline);
    expect(d.added).toHaveLength(0);
    expect(d.unchanged).toHaveLength(1);
    expect(d.removed).toHaveLength(1);
    expect(d.removed[0]!.ruleId).toBe('vh-y');
  });

  it('handles fully unchanged scan (zero diff)', () => {
    const findings = [f('vh-x', 'a.ts', 1), f('vh-y', 'b.ts', 5)];
    const d = diffFindings(findings, findings);
    expect(d.added).toHaveLength(0);
    expect(d.removed).toHaveLength(0);
    expect(d.unchanged).toHaveLength(2);
  });

  it('handles empty baseline (everything is new)', () => {
    const current = [f('vh-x', 'a.ts', 1)];
    const d = diffFindings(current, []);
    expect(d.added).toHaveLength(1);
    expect(d.removed).toHaveLength(0);
  });

  it('handles empty current (everything is fixed)', () => {
    const baseline = [f('vh-x', 'a.ts', 1)];
    const d = diffFindings([], baseline);
    expect(d.added).toHaveLength(0);
    expect(d.removed).toHaveLength(1);
  });

  it('two findings on same line with different snippets — both tracked', () => {
    // Realistic case: regex matches two adjacent secret literals on
    // one line (e.g. `const a = "...", b = "..."`). The fingerprints
    // differ by snippet, so both must be preserved across runs.
    const baseline = [f('vh-x', 'a.ts', 1, 5, 'snip-a')];
    const current = [
      f('vh-x', 'a.ts', 1, 5, 'snip-a'),
      f('vh-x', 'a.ts', 1, 30, 'snip-b'),
    ];
    const d = diffFindings(current, baseline);
    expect(d.added).toHaveLength(1);
    expect(d.added[0]!.snippet).toBe('snip-b');
    expect(d.unchanged).toHaveLength(1);
  });
});
