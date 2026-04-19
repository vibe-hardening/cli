import { describe, it, expect } from 'vitest';
import { renderJson } from '../src/reporters/json.js';
import type { ScanReport } from '../src/core/scan.js';

function baseReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    filesScanned: 5,
    durationMs: 42,
    platform: {
      platform: 'unknown',
      confidence: 0,
      signals: [],
      secondary: [],
    },
    score: {
      score: 100,
      grade: 'A',
      base: 100,
      deductions: [],
      capped: false,
    },
    ...overrides,
  };
}

describe('json reporter', () => {
  it('includes score field (regression: missing in 0.0.5-preview.2)', () => {
    const out = JSON.parse(renderJson(baseReport(), '0.0.5-preview.3'));
    expect(out.score).toBeDefined();
    expect(out.score.score).toBe(100);
    expect(out.score.grade).toBe('A');
  });

  it('includes version, platform, summary, findings', () => {
    const out = JSON.parse(renderJson(baseReport(), '1.0.0'));
    expect(out.version).toBe('1.0.0');
    expect(out.platform).toBeDefined();
    expect(out.summary).toBeDefined();
    expect(Array.isArray(out.findings)).toBe(true);
  });

  it('is valid parseable JSON', () => {
    const out = renderJson(baseReport(), '0.0.0');
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('createdAt is a valid ISO timestamp', () => {
    const out = JSON.parse(renderJson(baseReport(), '0.0.0'));
    expect(new Date(out.createdAt).toString()).not.toBe('Invalid Date');
  });
});
