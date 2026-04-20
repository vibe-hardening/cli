import { describe, it, expect } from 'vitest';
import { ABUSE_COSTS, abuseCostFor } from '../src/reporters/abuse-costs.js';

// Kind list is derived from the dict itself so adding a new verifier
// (which TypeScript forces via Record<VerifierKind, AbuseCost>) is
// automatically covered by every test below — no silent coverage gap.
const KINDS = Object.keys(ABUSE_COSTS) as Array<keyof typeof ABUSE_COSTS>;

describe('abuse-costs: data integrity', () => {
  it('has at least 8 entries (all current VerifierKinds)', () => {
    expect(KINDS.length).toBeGreaterThanOrEqual(8);
  });

  it('every entry has non-empty label / vector / source', () => {
    for (const k of KINDS) {
      expect(ABUSE_COSTS[k].label, `${k} label empty`).toBeTruthy();
      expect(ABUSE_COSTS[k].vector, `${k} vector empty`).toBeTruthy();
      expect(ABUSE_COSTS[k].source, `${k} source empty`).toBeTruthy();
    }
  });

  it('all labels are under 30 chars (fit inline)', () => {
    for (const k of KINDS) {
      expect(
        ABUSE_COSTS[k].label.length,
        `${k} label "${ABUSE_COSTS[k].label}" too long`,
      ).toBeLessThan(30);
    }
  });

  it('labels contain a $ sign (all entries are monetary now)', () => {
    // Regression guard: a previous version had `label: 'data breach'`
    // for Notion, which created an inconsistent inline render
    // (e.g. `~ data breach (…)`). All entries must be dollar amounts.
    for (const k of KINDS) {
      expect(
        ABUSE_COSTS[k].label.includes('$'),
        `${k} label "${ABUSE_COSTS[k].label}" missing $ sign`,
      ).toBe(true);
    }
  });

  it('no label / vector contains control characters', () => {
    // eslint-disable-next-line no-control-regex
    const ansi = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x1B]/;
    for (const k of KINDS) {
      expect(ansi.test(ABUSE_COSTS[k].label)).toBe(false);
      expect(ansi.test(ABUSE_COSTS[k].vector)).toBe(false);
    }
  });

  it('sources never claim a publication that does not exist', () => {
    // Regression guard: previous version cited 'Stripe Radar 2023
    // threat report' which does not exist. Require every source to
    // either explicitly say "estimate" or name a real document.
    const allowedMarkers = [
      'estimate',
      'Verizon DBIR',
      'CISA',
      'GitHub Security',
      'truffle.security',
      'abuse policy',
      'pricing',
      'advisory',
      'guidance',
    ];
    for (const k of KINDS) {
      const src = ABUSE_COSTS[k].source;
      const hasMarker = allowedMarkers.some((m) =>
        src.toLowerCase().includes(m.toLowerCase()),
      );
      expect(
        hasMarker,
        `${k} source "${src}" claims no real document and no "estimate" disclaimer`,
      ).toBe(true);
    }
  });
});

describe('abuse-costs: inline render marks figures as estimates', () => {
  it('console renderVerify includes an "est." marker next to every cost', async () => {
    const { renderConsole } = await import('../src/reporters/console.js');
    const stripAnsi = (s: string) =>
      // eslint-disable-next-line no-control-regex
      s.replace(/\x1b\[[0-9;]*m/g, '');
    for (const kind of KINDS) {
      const out = renderConsole({
        findings: [
          {
            ruleId: 'vh-secret-' + kind,
            severity: 'critical',
            category: 'secret',
            file: 'a.ts',
            line: 1,
            column: 1,
            snippet: 'x',
            message: 'y',
            remediation: 'z',
            metadata: {
              verify: {
                kind,
                status: 'live',
                httpStatus: 200,
                checkedAt: 'now',
              },
            },
          },
        ],
        summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
        filesScanned: 1,
        durationMs: 1,
        platform: {
          platform: 'unknown',
          confidence: 0,
          signals: [],
          secondary: [],
        },
        score: { score: 50, grade: 'D', deductions: [] },
      });
      expect(stripAnsi(out), `${kind} missing est. marker`).toContain('est.');
    }
  });

  it('HTML renderVerifyHtml includes an "est." marker next to every cost', async () => {
    const { renderHtml } = await import('../src/reporters/html.js');
    for (const kind of KINDS) {
      const html = renderHtml(
        {
          findings: [
            {
              ruleId: 'vh-secret-' + kind,
              severity: 'critical',
              category: 'secret',
              file: 'a.ts',
              line: 1,
              column: 1,
              snippet: 'x',
              message: 'y',
              remediation: 'z',
              metadata: {
                verify: {
                  kind,
                  status: 'live',
                  httpStatus: 200,
                  checkedAt: 'now',
                },
              },
            },
          ],
          summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
          filesScanned: 1,
          durationMs: 1,
          platform: {
            platform: 'unknown',
            confidence: 0,
            signals: [],
            secondary: [],
          },
          score: { score: 50, grade: 'D', deductions: [] },
        },
        '0.0.10-preview.2',
      );
      expect(html, `${kind} HTML missing est. marker`).toContain('est.');
    }
  });
});

describe('abuse-costs: helper', () => {
  it('abuseCostFor returns the entry for every known kind', () => {
    for (const k of KINDS) {
      expect(abuseCostFor(k)).toEqual(ABUSE_COSTS[k]);
    }
  });

  it('abuseCostFor returns undefined for unknown kinds', () => {
    expect(abuseCostFor('not-a-real-provider')).toBeUndefined();
    expect(abuseCostFor('')).toBeUndefined();
  });
});
