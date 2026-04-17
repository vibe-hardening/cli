import { describe, it, expect } from 'vitest';
import { scanRlsDisabled } from '../src/engines/rls-diff.js';

function ctx(content: string) {
  return { path: 'test.sql', content };
}

describe('rls-diff: detects missing RLS', () => {
  it('fires when table has no RLS enable', () => {
    const sql = `
      create table public.users (
        id uuid primary key,
        email text
      );
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.table).toBe('public.users');
    expect(findings[0]?.severity).toBe('critical');
    expect(findings[0]?.line).toBeGreaterThan(0);
  });

  it('defaults schema to public when omitted', () => {
    const sql = `create table posts (id uuid primary key);`;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.table).toBe('public.posts');
  });

  it('fires on multiple missing tables', () => {
    const sql = `
      create table public.a (id uuid);
      create table public.b (id uuid);
      create table public.c (id uuid);
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(3);
  });
});

describe('rls-diff: passes when RLS enabled', () => {
  it('does not fire when alter table enable row level security present', () => {
    const sql = `
      create table public.users (
        id uuid primary key,
        email text
      );
      alter table public.users enable row level security;
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(0);
  });

  it('handles enable on one of two tables', () => {
    const sql = `
      create table public.safe (id uuid);
      create table public.leaky (id uuid);
      alter table public.safe enable row level security;
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.table).toBe('public.leaky');
  });
});

describe('rls-diff: normalization & edge cases', () => {
  it('case-insensitive matching', () => {
    const sql = `
      CREATE TABLE public.Users (id uuid);
      ALTER TABLE Public.USERS ENABLE ROW LEVEL SECURITY;
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(0);
  });

  it('handles IF NOT EXISTS', () => {
    const sql = `
      create table if not exists public.widgets (id uuid);
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.table).toBe('public.widgets');
  });

  it('handles quoted identifiers', () => {
    const sql = `
      create table "public"."My Table" (id uuid);
      alter table "public"."My Table" enable row level security;
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(0);
  });

  it('skips Supabase internal schemas (auth, storage, etc)', () => {
    const sql = `
      create table auth.custom_users (id uuid);
      create table storage.custom_buckets (id uuid);
      create table realtime.custom_subs (id uuid);
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(0);
  });

  it('catches user schemas that are not public (e.g. app.*)', () => {
    const sql = `
      create table app.orders (id uuid);
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.schema).toBe('app');
  });

  it('deduplicates repeated create table statements', () => {
    const sql = `
      create table public.users (id uuid);
      create table public.users (id uuid);
    `;
    const findings = scanRlsDisabled(ctx(sql));
    expect(findings).toHaveLength(1);
  });
});

describe('rls-diff: performance (no ReDoS)', () => {
  it('completes 1000 tables in under 200ms', () => {
    let sql = '';
    for (let i = 0; i < 1000; i++) {
      sql += `create table public.t${i} (id uuid);\n`;
      if (i % 2 === 0) {
        sql += `alter table public.t${i} enable row level security;\n`;
      }
    }
    const start = performance.now();
    const findings = scanRlsDisabled(ctx(sql));
    const elapsed = performance.now() - start;
    expect(findings.length).toBe(500);
    expect(elapsed).toBeLessThan(200);
  });

  it('handles pathological nested whitespace without backtracking', () => {
    const spaces = ' '.repeat(10000);
    const sql = `create${spaces}table${spaces}public.x (id uuid);`;
    const start = performance.now();
    const findings = scanRlsDisabled(ctx(sql));
    const elapsed = performance.now() - start;
    expect(findings.length).toBe(1);
    expect(elapsed).toBeLessThan(100);
  });
});
