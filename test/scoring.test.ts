import { describe, it, expect } from 'vitest';
import { computeScore } from '../src/scoring/score.js';
import { renderBadge } from '../src/scoring/badge.js';
import type { Finding, Severity } from '../src/core/types.js';

function f(severity: Severity): Finding {
  return {
    ruleId: 'test',
    severity,
    category: 'secret',
    file: 'x.ts',
    line: 1,
    column: 1,
    snippet: '',
    message: '',
  };
}

describe('computeScore', () => {
  it('returns 100 / grade A when no findings', () => {
    const s = computeScore([]);
    expect(s.score).toBe(100);
    expect(s.grade).toBe('A');
  });

  it('1 critical → score 75, grade C (capped)', () => {
    const s = computeScore([f('critical')]);
    expect(s.score).toBe(75);
    expect(s.grade).toBe('C');
  });

  it('1 high, 0 critical → grade can be B', () => {
    const s = computeScore([f('high')]);
    expect(s.score).toBe(88);
    expect(['A', 'B']).toContain(s.grade);
  });

  it('many findings floor at 0', () => {
    const many = Array.from({ length: 20 }, () => f('critical'));
    const s = computeScore(many);
    expect(s.score).toBe(0);
    expect(s.grade).toBe('F');
  });

  it('any critical caps grade at C', () => {
    const s = computeScore([f('critical')]);
    expect(s.grade).not.toBe('A');
    expect(s.grade).not.toBe('B');
  });

  it('provides per-severity deduction breakdown', () => {
    const s = computeScore([f('critical'), f('high'), f('medium'), f('low')]);
    expect(s.deductions.length).toBe(4);
    expect(s.base).toBe(100);
  });
});

describe('renderBadge', () => {
  it('produces valid SVG with score + grade', () => {
    const svg = renderBadge(87, 'B');
    expect(svg).toContain('<svg');
    expect(svg).toContain('87/100 B');
    expect(svg).toContain('vibe-hardening');
  });

  it('uses different colours per grade', () => {
    const a = renderBadge(95, 'A');
    const f = renderBadge(12, 'F');
    expect(a).not.toBe(f);
  });
});
