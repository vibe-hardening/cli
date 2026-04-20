import { describe, it, expect } from 'vitest';
import { renderConsole } from '../src/reporters/console.js';
import { renderJson } from '../src/reporters/json.js';
import {
  ROAST_MESSAGES,
  roastMessage,
  ROAST_EMPTY,
  ROAST_GRADE_LINES,
  ROAST_DEPENDENCY_CVE_PREFIX,
} from '../src/reporters/roast-messages.js';
import { SECRET_RULES } from '../src/rules/secrets.js';
import { INJECTION_RULES } from '../src/rules/injection.js';
import { NETWORK_RULES } from '../src/rules/network.js';
import { AUTH_PATTERN_RULES } from '../src/rules/auth-patterns.js';
import { PYTHON_INJECTION_RULES } from '../src/rules/python-injection.js';
import { PYTHON_AUTH_RULES } from '../src/rules/python-auth.js';
import type { ScanReport } from '../src/core/scan.js';

// Engine-emitted rule IDs not present in any rules/*.ts file.
const ENGINE_EMITTED_RULE_IDS = [
  'vh-auth-missing-middleware',
  'vh-supabase-rls-disabled',
  'vh-secret-supabase-service-role',
  'vh-llm-hallucinated-package',
  'vh-llm-low-trust-package',
];

function allShippedRuleIds(): string[] {
  const fromRules = [
    ...SECRET_RULES,
    ...INJECTION_RULES,
    ...NETWORK_RULES,
    ...AUTH_PATTERN_RULES,
    ...PYTHON_INJECTION_RULES,
    ...PYTHON_AUTH_RULES,
  ].map((r) => r.id);
  return [...new Set([...fromRules, ...ENGINE_EMITTED_RULE_IDS])];
}

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

describe('roast: dictionary ↔ shipped rule IDs cross-check', () => {
  it('every shipped rule ID has a roast entry', () => {
    const shipped = allShippedRuleIds();
    const missing = shipped.filter((id) => !(id in ROAST_MESSAGES));
    expect(
      missing,
      `rules missing roast entries: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('every roast key maps to a real emitted rule ID (no dead entries)', () => {
    const shipped = new Set(allShippedRuleIds());
    const orphans = Object.keys(ROAST_MESSAGES).filter(
      (id) => !shipped.has(id),
    );
    expect(
      orphans,
      `orphan roast keys (no matching rule): ${orphans.join(', ')}`,
    ).toEqual([]);
  });

  it('all roast strings contain no ANSI escape / control characters', () => {
    // eslint-disable-next-line no-control-regex
    const ansi = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x1B]/;
    for (const [id, msg] of Object.entries(ROAST_MESSAGES)) {
      expect(ansi.test(msg), `${id} contains control char`).toBe(false);
    }
    for (const [g, line] of Object.entries(ROAST_GRADE_LINES)) {
      expect(ansi.test(line), `grade ${g} contains control char`).toBe(false);
    }
    expect(ansi.test(ROAST_EMPTY)).toBe(false);
  });
});

describe('roast: helper behaviour', () => {
  it('has a grade line for every letter grade', () => {
    for (const grade of ['A', 'B', 'C', 'D', 'F'] as const) {
      expect(ROAST_GRADE_LINES[grade]).toBeTruthy();
    }
  });

  it('roastMessage returns the roast when ruleId is known', () => {
    const out = roastMessage('vh-secret-openai', 'ignored fallback');
    expect(out).toContain('token bill');
  });

  it('roastMessage falls back to original message for unknown ruleId', () => {
    expect(roastMessage('vh-unknown-rule', 'original text')).toBe(
      'original text',
    );
  });

  it('CVE: strips pkg@ver prefix from single-CVE message', () => {
    const out = roastMessage(
      'vh-dep-cve-GHSA-xxx',
      'hono@4.12.2: GHSA-xxx — brief summary',
    );
    expect(out).toBe(
      `${ROAST_DEPENDENCY_CVE_PREFIX} GHSA-xxx — brief summary`,
    );
  });

  it('CVE: handles scoped packages (@scope/name@ver)', () => {
    const out = roastMessage(
      'vh-dep-cve-GHSA-yyy',
      '@hono/node-server@1.19.9: GHSA-yyy — brief summary',
    );
    expect(out).toBe(
      `${ROAST_DEPENDENCY_CVE_PREFIX} GHSA-yyy — brief summary`,
    );
  });

  it('CVE: does NOT mangle grouped-format message (regression)', () => {
    // Previously the regex greedily matched "everything up to first
    // colon" which reduced `...worst: medium` to just `medium`. The
    // pkg@ver-anchored replacement must leave this message intact so
    // the user still sees the vuln count and package info.
    const grouped =
      'hono@4.12.2 has 8 known vulnerabilities — worst: medium';
    const out = roastMessage('vh-dep-cve-hono@4.12.2', grouped);
    expect(out).toBe(`${ROAST_DEPENDENCY_CVE_PREFIX} ${grouped}`);
    expect(out).toContain('8 known vulnerabilities');
    expect(out).toContain('hono@4.12.2');
    // Regression guard: the broken version would produce just
    // "PREFIX medium" with the package name stripped.
    expect(out).not.toBe(`${ROAST_DEPENDENCY_CVE_PREFIX} medium`);
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
    expect(out).not.toContain(ROAST_EMPTY);
  });

  it('roast mode preserves unknown-rule fallback', () => {
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

  it('roast mode handles mixed known + unknown rules in one report', () => {
    const findings = [
      { ...findingFixture },
      {
        ...findingFixture,
        ruleId: 'vh-mystery-rule',
        message: 'MYSTERY MESSAGE',
        file: 'other.ts',
      },
    ];
    const out = renderConsole(
      baseReport({
        findings,
        summary: { critical: 2, high: 0, medium: 0, low: 0, info: 0 },
      }),
      { roast: true },
    );
    expect(out).toContain('token bill');
    expect(out).toContain('MYSTERY MESSAGE');
  });
});

describe('roast: JSON reporter is NOT affected', () => {
  it('JSON output keeps the original neutral message even with --roast', () => {
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
    const json = JSON.parse(renderJson(report, '0.0.9-preview.1'));
    expect(json.findings[0].message).toBe('OpenAI API key hardcoded in source');
    expect(JSON.stringify(json)).not.toContain('token bill');
  });
});
