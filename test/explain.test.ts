import { describe, it, expect, vi } from 'vitest';
import {
  explainRule,
  listKnownRuleIds,
  runExplainCommand,
} from '../src/commands/explain.js';
import { SECRET_RULES } from '../src/rules/secrets.js';
import { INJECTION_RULES } from '../src/rules/injection.js';
import { NETWORK_RULES } from '../src/rules/network.js';
import { AUTH_PATTERN_RULES } from '../src/rules/auth-patterns.js';
import { PYTHON_AUTH_RULES } from '../src/rules/python-auth.js';
import { PYTHON_INJECTION_RULES } from '../src/rules/python-injection.js';

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('explain: rule coverage', () => {
  it('every shipped SecretRule has an entry in the lookup', () => {
    const allShipped = [
      ...SECRET_RULES,
      ...INJECTION_RULES,
      ...NETWORK_RULES,
      ...AUTH_PATTERN_RULES,
      ...PYTHON_AUTH_RULES,
      ...PYTHON_INJECTION_RULES,
    ].map((r) => r.id);
    const known = new Set(listKnownRuleIds());
    const missing = allShipped.filter((id) => !known.has(id));
    expect(missing, `unexplainable rule ids: ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  it('every special engine-emitted rule id is covered', () => {
    // These ids are emitted by AST / OSV / JWT engines and don't live in
    // a SecretRule[] array. The explain module must still cover them.
    const specials = [
      'vh-auth-missing-middleware',
      'vh-llm-hallucinated-package',
      'vh-llm-low-trust-package',
      'vh-secret-supabase-service-role',
      'vh-supabase-rls-disabled',
    ];
    for (const id of specials) {
      expect(explainRule(id), `${id} should be explainable`).not.toBeNull();
    }
  });
});

describe('explain: explainRule output', () => {
  it('returns null for unknown rule id', () => {
    expect(explainRule('vh-nonexistent-rule')).toBeNull();
    expect(explainRule('not-even-vh')).toBeNull();
  });

  it('contains severity, category, fix sections for a real rule', () => {
    const out = stripAnsi(explainRule('vh-secret-openai')!);
    expect(out).toContain('vh-secret-openai');
    expect(out).toContain('CRITICAL');
    expect(out).toContain('category: secret');
    expect(out).toContain('WHAT IT DETECTS');
    expect(out).toContain('HOW TO FIX');
  });

  it('includes abuse-cost block when rule has a verifier', () => {
    const out = stripAnsi(explainRule('vh-secret-openai')!);
    expect(out).toContain('WHY IT MATTERS');
    expect(out).toContain('Estimated abuse cost');
    expect(out).toContain('VERIFICATION');
  });

  it('omits abuse-cost block when rule has no verifier', () => {
    const out = stripAnsi(explainRule('vh-inj-sql-template')!);
    expect(out).not.toContain('WHY IT MATTERS');
    expect(out).not.toContain('Estimated abuse cost');
    expect(out).not.toContain('VERIFICATION');
  });

  it('mentions --suggest-fix tip when rule has env var mapping', () => {
    const out = stripAnsi(explainRule('vh-secret-stripe')!);
    expect(out).toContain('--suggest-fix');
    expect(out).toContain('STRIPE_SECRET_KEY');
  });

  it('omits --suggest-fix tip when rule has no env var mapping', () => {
    const out = stripAnsi(explainRule('vh-inj-sql-template')!);
    expect(out).not.toContain('--suggest-fix');
  });

  it('handles dynamic vh-dep-cve-* rule ids by collapsing to wildcard', () => {
    const out = stripAnsi(explainRule('vh-dep-cve-CVE-2024-12345')!);
    expect(out).toContain('vh-dep-cve');
    expect(out).toContain('OSV.dev');
  });

  it('renders ADVISORY DETAILS block when OSV details are passed', () => {
    const osvDetails = {
      id: 'CVE-2021-44228',
      summary: 'Remote code execution in Apache log4j2',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L' }],
      database_specific: { severity: 'CRITICAL' },
      references: [
        { type: 'ADVISORY', url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-44228' },
        { type: 'FIX', url: 'https://github.com/apache/logging-log4j2/pull/608' },
      ],
    };
    const out = stripAnsi(
      explainRule('vh-dep-cve-CVE-2021-44228', { osvDetails })!,
    );
    expect(out).toContain('ADVISORY DETAILS');
    expect(out).toContain('Remote code execution');
    expect(out).toContain('CRITICAL');
    expect(out).toContain('https://nvd.nist.gov/vuln/detail/CVE-2021-44228');
  });

  it('omits ADVISORY DETAILS when no OSV record is provided', () => {
    const out = stripAnsi(
      explainRule('vh-dep-cve-CVE-2021-44228', { osvDetails: null })!,
    );
    expect(out).not.toContain('ADVISORY DETAILS');
    // Static doc text and link still present.
    expect(out).toContain('osv.dev/vulnerability/CVE-2021-44228');
  });

  it('uses author-written `what` field for special engine rules', () => {
    const out = stripAnsi(explainRule('vh-auth-missing-middleware')!);
    expect(out).toContain('AST scan');
    expect(out).toContain('Next.js');
  });
});

describe('explain: runExplainCommand', () => {
  it('returns 0 and writes to stdout for known id', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(
      () => true,
    );
    // offline:true skips the osv.dev fetch — keeps the test
    // hermetic and fast.
    const code = await runExplainCommand('vh-secret-openai', {
      offline: true,
    });
    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it('returns 1 and writes error to stderr for unknown id', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(
      () => true,
    );
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(
      () => true,
    );
    const code = await runExplainCommand('vh-not-a-real-rule', {
      offline: true,
    });
    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });
});

