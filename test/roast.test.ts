import { describe, it, expect } from 'vitest';
import { renderConsole } from '../src/reporters/console.js';
import { renderJson } from '../src/reporters/json.js';
import {
  ROAST_MESSAGES,
  roastMessage,
  ROAST_EMPTY,
  ROAST_GRADE_LINES,
} from '../src/reporters/roast-messages.js';
import type { ScanReport } from '../src/core/scan.js';

function baseReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    filesScanned: 0,
    durationMs: 0,
    platform: { platform: 'unknown', confidence: 0, signals: [], secondary: [] },
    score: { score: 100, grade: 'A', deductions: [] },
    ...overrides,
  };
}

describe('roast: message dictionary', () => {
  it('has roasts for every shipped secret rule', () => {
    const shipped = [
      'vh-secret-openai',
      'vh-secret-anthropic',
      'vh-secret-stripe',
      'vh-secret-github-pat',
      'vh-secret-slack-token',
      'vh-secret-sendgrid',
      'vh-secret-notion',
      'vh-secret-twilio-auth-token',
      'vh-secret-aws-access-key',
      'vh-secret-db-url',
      'vh-secret-jwt-hardcoded',
      'vh-secret-next-public-risky',
    ];
    for (const id of shipped) {
      expect(ROAST_MESSAGES[id], `missing roast for ${id}`).toBeTruthy();
    }
  });

  it('has a grade line for every letter grade', () => {
    for (const grade of ['A', 'B', 'C', 'D', 'F'] as const) {
      expect(ROAST_GRADE_LINES[grade]).toBeTruthy();
    }
  });

  it('roastMessage falls back to original message for unknown ruleId', () => {
    expect(roastMessage('vh-unknown-rule', 'original text')).toBe(
      'original text',
    );
  });

  it('roastMessage generates prefix-based roast for CVE rules', () => {
    const out = roastMessage(
      'vh-dep-cve-hono@4.12.2',
      'hono@4.12.2: GHSA-xxx — some summary',
    );
    expect(out).toContain('npm update');
    expect(out).toContain('GHSA-xxx');
  });
});

describe('roast: console reporter integration', () => {
  const findingFixture = {
    ruleId: 'vh-secret-openai',
    severity: 'critical' as const,
    category: 'secret' as const,
    file: 'app.ts',
    line: 1,
    column: 17,
    snippet: 'sk-pro…wxyz',
    message: 'OpenAI API key hardcoded in source',
    remediation: 'Move to process.env.OPENAI_API_KEY.',
    metadata: {},
  };

  it('default console (no roast) uses original message', () => {
    const out = renderConsole(
      baseReport({
        findings: [findingFixture],
        summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
        score: { score: 50, grade: 'D', deductions: [] },
      }),
    );
    expect(out).toContain('OpenAI API key hardcoded in source');
    expect(out).not.toContain('token bill');
  });

  it('roast mode replaces the message', () => {
    const out = renderConsole(
      baseReport({
        findings: [findingFixture],
        summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
        score: { score: 50, grade: 'D', deductions: [] },
      }),
      { roast: true },
    );
    expect(out).toContain('token bill');
    expect(out).not.toContain('OpenAI API key hardcoded in source');
  });

  it('roast mode appends grade quip to the score line', () => {
    const out = renderConsole(
      baseReport({
        score: { score: 20, grade: 'F', deductions: [] },
      }),
      { roast: true },
    );
    expect(out).toContain(ROAST_GRADE_LINES.F);
  });

  it('roast mode shows the empty-repo one-liner when no findings', () => {
    const out = renderConsole(baseReport(), { roast: true });
    expect(out).toContain(ROAST_EMPTY);
    expect(out).not.toContain('ship with confidence');
  });

  it('default console shows the normal empty message', () => {
    const out = renderConsole(baseReport());
    expect(out).toContain('ship with confidence');
    expect(out).not.toContain('Did you even try');
  });

  it('roast mode preserves the unknown-rule fallback', () => {
    const unknown = {
      ...findingFixture,
      ruleId: 'vh-definitely-not-a-real-rule',
      message: 'SOMETHING ORIGINAL',
    };
    const out = renderConsole(
      baseReport({
        findings: [unknown],
        summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
      }),
      { roast: true },
    );
    expect(out).toContain('SOMETHING ORIGINAL');
  });
});

describe('roast: JSON reporter is NOT affected', () => {
  it('JSON output keeps the original neutral message', () => {
    const report = baseReport({
      findings: [
        {
          ruleId: 'vh-secret-openai',
          severity: 'critical',
          category: 'secret',
          file: 'app.ts',
          line: 1,
          column: 17,
          snippet: 'sk-pro…wxyz',
          message: 'OpenAI API key hardcoded in source',
          remediation: 'Move to env.',
          metadata: {},
        },
      ],
      summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
    });
    const json = JSON.parse(renderJson(report, '0.0.9-preview.0'));
    expect(json.findings[0].message).toBe('OpenAI API key hardcoded in source');
    expect(JSON.stringify(json)).not.toContain('token bill');
  });
});
