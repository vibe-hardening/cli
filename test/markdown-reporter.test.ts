import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/reporters/markdown.js';
import type { ScanReport } from '../src/core/scan.js';

function makeReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    filesScanned: 1,
    durationMs: 5,
    platform: { platform: 'unknown', confidence: 0 },
    score: { score: 100, grade: 'A' },
    summary: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
    findings: [],
    ...overrides,
  } as ScanReport;
}

describe('markdown reporter', () => {
  it('renders empty findings as a friendly message', () => {
    const out = renderMarkdown(makeReport(), '0.0.16-preview.0');
    expect(out).toContain('No findings.');
    expect(out).toContain('100 / 100');
    expect(out).toContain('grade **A**');
  });

  it('orders findings by severity (critical first)', () => {
    const out = renderMarkdown(
      makeReport({
        findings: [
          {
            ruleId: 'vh-low-thing',
            severity: 'low',
            category: 'config',
            file: 'a.ts',
            line: 1,
            column: 1,
            snippet: '',
            message: 'low',
          },
          {
            ruleId: 'vh-secret-openai',
            severity: 'critical',
            category: 'secret',
            file: 'a.ts',
            line: 2,
            column: 1,
            snippet: '',
            message: 'crit',
          },
        ],
        summary: { critical: 1, high: 0, medium: 0, low: 1, info: 0 },
      }),
      '0.0.16-preview.0',
    );
    const critIdx = out.indexOf('vh-secret-openai');
    const lowIdx = out.indexOf('vh-low-thing');
    expect(critIdx).toBeGreaterThan(0);
    expect(lowIdx).toBeGreaterThan(critIdx); // critical sorted before low
  });

  it('escapes pipe characters in messages so table rows survive', () => {
    const out = renderMarkdown(
      makeReport({
        findings: [
          {
            ruleId: 'vh-x',
            severity: 'high',
            category: 'config',
            file: 'a.ts',
            line: 1,
            column: 1,
            snippet: '',
            message: 'a || b detected', // contains pipe-pair
          },
        ],
        summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      }),
      '0.0.16-preview.0',
    );
    expect(out).toContain('a \\|\\| b detected');
  });

  it('handles backticks in rule IDs by switching to <code> element', () => {
    // Synthetic — real rule IDs never contain backticks, but the
    // helper used for ruleId is the same one applied to snippets,
    // and snippets *do* contain backticks (template literals).
    // Falling back to HTML <code> survives inside Markdown tables;
    // plain double-backtick inline-code does not.
    const out = renderMarkdown(
      makeReport({
        findings: [
          {
            ruleId: 'vh-tmpl-`literal`',
            severity: 'high',
            category: 'config',
            file: 'a.ts',
            line: 1,
            column: 1,
            snippet: '',
            message: 'tmpl',
          },
        ],
        summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      }),
      '0.0.16-preview.0',
    );
    expect(out).toContain('<code>vh-tmpl-&#96;literal&#96;</code>');
    expect(out).not.toContain('``vh-tmpl-`literal`'); // no broken inline-code wrap
  });

  it('escapes HTML special chars (&, <) so injected source cannot break the report', () => {
    const out = renderMarkdown(
      makeReport({
        findings: [
          {
            ruleId: 'vh-html<script>',
            severity: 'high',
            category: 'config',
            file: 'a.ts',
            line: 1,
            column: 1,
            snippet: '',
            message: 'x',
          },
        ],
        summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      }),
      '0.0.16-preview.0',
    );
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toMatch(/<script>/);
  });
});
