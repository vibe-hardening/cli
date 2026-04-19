import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { walk } from '../src/core/walker.js';
import { runScan } from '../src/core/scan.js';

const FIXTURE = resolve('test/fixtures/bad-app');
const ENV_LOCAL_PATH = join(FIXTURE, '.env.local');

// Build fake-but-regex-matching secrets at runtime so they are never
// committed to git (GitHub push protection blocks real-looking tokens,
// and we don't want to leak any even-fake-looking secret patterns
// into source control).
const FAKE_STRIPE =
  ['sk', 'live', '51N0QrSAbC123DeF456GhI789JkLmNoPqRsTuVwXyZ0123abcd'].join('_');
const FAKE_GITHUB =
  'ghp' + '_' + 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf';
const FAKE_DB_URL =
  'postgres://admin:RealPassw0rd@db.example.com:5432/app';

const ENV_CONTENT = [
  'NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi.real_anon_would_be_here.fake_sig',
  `STRIPE_SECRET_KEY=${FAKE_STRIPE}`,
  `DATABASE_URL=${FAKE_DB_URL}`,
  `GITHUB_TOKEN=${FAKE_GITHUB}`,
  '',
].join('\n');

beforeAll(async () => {
  await writeFile(ENV_LOCAL_PATH, ENV_CONTENT, 'utf8');
});

afterAll(async () => {
  await unlink(ENV_LOCAL_PATH).catch(() => undefined);
});

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
