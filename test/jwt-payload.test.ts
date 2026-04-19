import { describe, it, expect } from 'vitest';
import { scanJwtServiceRole } from '../src/engines/jwt-payload.js';

function ctx(content: string) {
  return { path: 'test.ts', content };
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function jwt(header: object, payload: object, sig = 'sig_abcdefghijklmno'): string {
  return [b64url(JSON.stringify(header)), b64url(JSON.stringify(payload)), sig].join(
    '.',
  );
}

describe('jwt-payload: service_role detection', () => {
  it('fires on Supabase service_role JWT (critical)', () => {
    const token = jwt(
      { alg: 'HS256', typ: 'JWT' },
      {
        iss: 'supabase',
        ref: 'abcdefghijklmnopqrst',
        role: 'service_role',
        iat: 1700000000,
        exp: 2000000000,
      },
    );
    const findings = scanJwtServiceRole(ctx(`const key = "${token}";`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('critical');
    expect(findings[0]?.metadata?.supabase).toBe(true);
  });

  it('fires on generic service_role JWT as high (not supabase)', () => {
    const token = jwt(
      { alg: 'HS256', typ: 'JWT' },
      { role: 'service_role', exp: 2000000000 },
    );
    const findings = scanJwtServiceRole(ctx(`secret="${token}"`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.metadata?.supabase).toBe(false);
  });

  it('does not fire on anon role JWT', () => {
    const token = jwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: 'supabase', ref: 'abc', role: 'anon', exp: 2000000000 },
    );
    const findings = scanJwtServiceRole(ctx(`key = "${token}"`));
    expect(findings).toHaveLength(0);
  });

  it('does not fire on non-JWT lookalike strings', () => {
    const text = `eyJblob.eyJfake.nottherightshape and another eyJxx.yy.zz`;
    const findings = scanJwtServiceRole(ctx(text));
    expect(findings).toHaveLength(0);
  });

  it('deduplicates same JWT appearing multiple times', () => {
    const token = jwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: 'supabase', ref: 'r1', role: 'service_role', exp: 2000000000 },
    );
    const text = `${token}\n// copy\n${token}`;
    const findings = scanJwtServiceRole(ctx(text));
    expect(findings).toHaveLength(1);
  });

  it('redacts JWT in snippet (no full token leak)', () => {
    const token = jwt(
      { alg: 'HS256', typ: 'JWT' },
      { iss: 'supabase', ref: 'r1', role: 'service_role', exp: 2000000000 },
    );
    const findings = scanJwtServiceRole(ctx(token));
    expect(findings[0]?.snippet.length).toBeLessThan(token.length);
    expect(findings[0]?.snippet).toContain('…');
  });

  it('handles multiple distinct service_role JWTs', () => {
    const t1 = jwt(
      { alg: 'HS256' },
      { iss: 'supabase', ref: 'a', role: 'service_role' },
    );
    const t2 = jwt(
      { alg: 'HS256' },
      { iss: 'supabase', ref: 'b', role: 'service_role' },
    );
    const findings = scanJwtServiceRole(ctx(`${t1}\n${t2}`));
    expect(findings).toHaveLength(2);
  });

  it('tolerates malformed base64 gracefully', () => {
    const bad = 'eyJxxxx.eyJyy!!!yy.zzzzzzzzzzzzzz';
    const findings = scanJwtServiceRole(ctx(bad));
    expect(findings).toHaveLength(0);
  });

  it('records line and column of match', () => {
    const token = jwt(
      { alg: 'HS256' },
      { iss: 'supabase', ref: 'a'.repeat(20), role: 'service_role' },
    );
    const text = `line1\nline2\nconst x = "${token}";`;
    const findings = scanJwtServiceRole(ctx(text));
    expect(findings[0]?.line).toBe(3);
    expect(findings[0]?.column).toBeGreaterThan(0);
  });

  it('does not match JWT embedded inside a longer base64url blob (C-1 fix)', () => {
    const token = jwt(
      { alg: 'HS256' },
      { iss: 'supabase', ref: 'a'.repeat(20), role: 'service_role' },
    );
    const prefixed = `XYZabc${token}QQQ`;
    const findings = scanJwtServiceRole(ctx(prefixed));
    expect(findings).toHaveLength(0);
  });

  it('requires strict Supabase ref format (20 chars alphanumeric) (H-4 fix)', () => {
    const tokenShortRef = jwt(
      { alg: 'HS256' },
      { ref: 'abc', role: 'service_role' },
    );
    const findings = scanJwtServiceRole(ctx(`k="${tokenShortRef}"`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.metadata?.supabase).toBe(false);
  });
});
