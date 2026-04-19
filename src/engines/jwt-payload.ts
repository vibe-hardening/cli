import type { Finding, FileContext, Severity } from '../core/types.js';
import { offsetToLineCol } from '../core/types.js';

// Word boundaries via lookaround prevent matching JWTs embedded in longer
// base64url strings (e.g. Clerk session tokens that contain eyJ... sub-strings).
const RE_JWT =
  /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_-])/g;

interface JwtPayload {
  role?: string;
  iss?: string;
  ref?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  [k: string]: unknown;
}

function base64UrlDecode(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function parseJwtPayload(jwt: string): JwtPayload | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  const json = base64UrlDecode(parts[1]!);
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as unknown;
    if (obj === null || typeof obj !== 'object') return null;
    return obj as JwtPayload;
  } catch {
    return null;
  }
}

function redactJwt(jwt: string): string {
  return `${jwt.slice(0, 16)}…${jwt.slice(-6)}`;
}

// Supabase project ref is a 20-char lowercase alphanumeric identifier.
const SUPABASE_REF = /^[a-z0-9]{20}$/;

function isSupabaseJwt(p: JwtPayload): boolean {
  if (typeof p.iss === 'string' && p.iss.toLowerCase().includes('supabase')) {
    return true;
  }
  return typeof p.ref === 'string' && SUPABASE_REF.test(p.ref);
}

export function scanJwtServiceRole(
  ctx: FileContext,
  ruleId = 'vh-secret-supabase-service-role',
): Finding[] {
  const src = ctx.content;
  const findings: Finding[] = [];
  RE_JWT.lastIndex = 0;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((m = RE_JWT.exec(src)) !== null) {
    const jwt = m[0];
    if (seen.has(jwt)) continue;
    seen.add(jwt);

    const payload = parseJwtPayload(jwt);
    if (!payload) continue;
    if (payload.role !== 'service_role') continue;

    const supabase = isSupabaseJwt(payload);
    const severity: Severity = supabase ? 'critical' : 'high';
    const { line, column } = offsetToLineCol(src, m.index);

    findings.push({
      ruleId,
      severity,
      category: 'secret',
      file: ctx.path,
      line,
      column,
      snippet: redactJwt(jwt),
      message: supabase
        ? 'Supabase service_role JWT detected (bypasses RLS)'
        : 'JWT with role=service_role detected',
      remediation:
        'Rotate immediately via Supabase Dashboard → Project Settings → API. service_role must be server-only, never in client code or git history.',
      metadata: {
        iss: payload.iss,
        ref: payload.ref,
        exp: payload.exp,
        supabase,
      },
    });
  }
  return findings;
}
