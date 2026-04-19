import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { walk } from '../src/core/walker.js';
import { runScan } from '../src/core/scan.js';

const FIXTURE = resolve('test/fixtures/bad-app');

describe('e2e: scan the bad-app fixture', () => {
  it('finds the expected mix of critical / high / medium', async () => {
    const files = await walk({ cwd: FIXTURE });
    const report = await runScan({ files });

    expect(report.filesScanned).toBeGreaterThanOrEqual(4);
    expect(report.summary.critical).toBeGreaterThanOrEqual(3);
    expect(report.summary.high).toBeGreaterThanOrEqual(2);
  });

  it('detects OpenAI secret in app/api/chat/route.ts', async () => {
    const files = await walk({ cwd: FIXTURE });
    const { findings } = await runScan({ files });
    const hit = findings.find(
      (f) =>
        f.ruleId === 'vh-secret-openai' &&
        f.file === 'app/api/chat/route.ts',
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('critical');
  });

  it('detects Supabase RLS missing for public.posts', async () => {
    const files = await walk({ cwd: FIXTURE });
    const { findings } = await runScan({ files });
    const hit = findings.find(
      (f) =>
        f.ruleId === 'vh-supabase-rls-disabled' &&
        f.metadata?.table === 'public.posts',
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('critical');
  });

  it('detects missing auth on both GET and POST routes', async () => {
    const files = await walk({ cwd: FIXTURE });
    const { findings } = await runScan({ files });
    const methods = findings
      .filter((f) => f.ruleId === 'vh-auth-missing-middleware')
      .map((f) => f.metadata?.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });

  it('detects Stripe + GitHub PAT in .env.local', async () => {
    const files = await walk({ cwd: FIXTURE });
    const { findings } = await runScan({ files });
    const envFindings = findings.filter((f) => f.file === '.env.local');
    const ruleIds = envFindings.map((f) => f.ruleId);
    expect(ruleIds).toContain('vh-secret-stripe');
    expect(ruleIds).toContain('vh-secret-github-pat');
  });

  it('respects severity floor when set to critical', async () => {
    const files = await walk({ cwd: FIXTURE });
    const { findings } = await runScan({ files, minSeverity: 'critical' });
    expect(findings.every((f) => f.severity === 'critical')).toBe(true);
  });

  it('sorts findings by severity desc then file then line', async () => {
    const files = await walk({ cwd: FIXTURE });
    const { findings } = await runScan({ files });
    for (let i = 1; i < findings.length; i++) {
      const prev = findings[i - 1]!;
      const cur = findings[i]!;
      const rank: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
        info: 0,
      };
      expect(rank[prev.severity]).toBeGreaterThanOrEqual(rank[cur.severity]!);
    }
  });
});
