import { describe, it, expect } from 'vitest';
import { scanAuthMissing } from '../src/engines/auth-missing-ast.js';

describe('auth-missing-ast: fires on missing auth', () => {
  it('fires on bare exported GET handler', () => {
    const src = `
      export async function GET(req: Request) {
        return Response.json({ hello: 'world' });
      }
    `;
    const findings = scanAuthMissing('app/api/test/route.ts', src);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.method).toBe('GET');
  });

  it('fires on arrow function exported const POST', () => {
    const src = `
      export const POST = async (req: Request) => {
        return Response.json({ ok: true });
      };
    `;
    const findings = scanAuthMissing('pages/api/users.ts', src);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.metadata?.method).toBe('POST');
  });

  it('fires on multiple methods without auth', () => {
    const src = `
      export async function GET() { return Response.json({}); }
      export async function POST() { return Response.json({}); }
    `;
    const findings = scanAuthMissing('app/api/x/route.ts', src);
    expect(findings).toHaveLength(2);
  });
});

describe('auth-missing-ast: passes when auth present', () => {
  it('passes when auth() called directly', () => {
    const src = `
      import { auth } from '@/lib/auth';
      export async function GET() {
        const session = await auth();
        if (!session) return new Response(null, { status: 401 });
        return Response.json({ ok: true });
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it('passes when getServerSession called', () => {
    const src = `
      export async function POST() {
        const s = await getServerSession(authOptions);
        if (!s) return new Response(null, { status: 401 });
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it('passes on chained createServerClient(...).auth.getUser()', () => {
    const src = `
      import { createServerClient } from '@supabase/ssr';
      export async function GET(req: Request) {
        const supa = createServerClient(url, key, cookies);
        const { data: { user } } = await supa.auth.getUser();
        if (!user) return new Response(null, { status: 401 });
        return Response.json({ user });
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it('passes on supabase.auth.getUser() using root identifier', () => {
    const src = `
      export async function POST(req: Request) {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return new Response(null, { status: 401 });
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it('passes when helper function uses auth (depth 1)', () => {
    const src = `
      import { auth } from '@/lib/auth';
      async function checkUser() { return auth(); }
      export async function GET() {
        const u = await checkUser();
        if (!u) return new Response(null, { status: 401 });
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });
});

describe('auth-missing-ast: false positive guards', () => {
  it('does not match authToken (substring of auth)', () => {
    const src = `
      export async function GET() {
        const authToken = req.headers.get('x-token');
        const u = await userService.authToken.validate(authToken);
        return Response.json({ u });
      }
    `;
    const findings = scanAuthMissing('app/api/x/route.ts', src);
    expect(findings).toHaveLength(1);
  });

  it('matches chained .auth.getUser exactly (not .authorize.getSomething)', () => {
    const src = `
      export async function GET() {
        const x = await client.authorize.getSomething();
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(1);
  });

  it('ignores non-exported handler (utility function)', () => {
    const src = `
      async function GET() { return Response.json({}); }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it('ignores non-HTTP-method named exports', () => {
    const src = `
      export async function helper() { return 1; }
      export async function runTask() { return 2; }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });
});

describe('auth-missing-ast: advanced chain handling (H-2, H-3 fixes)', () => {
  it('passes on (supabase as SupabaseClient).auth.getUser()', () => {
    const src = `
      export async function GET() {
        const { data } = await (supabase as SupabaseClient).auth.getUser();
        if (!data.user) return new Response(null, { status: 401 });
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it('passes on parenthesized expr (supabase!).auth.getUser()', () => {
    const src = `
      export async function GET() {
        const { data } = await (supabase!).auth.getUser();
        if (!data.user) return new Response(null, { status: 401 });
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });

  it("passes on bracket notation supabase['auth']['getUser']()", () => {
    const src = `
      export async function GET() {
        const { data } = await supabase['auth']['getUser']();
        if (!data.user) return new Response(null, { status: 401 });
        return Response.json({});
      }
    `;
    expect(scanAuthMissing('app/api/x/route.ts', src)).toHaveLength(0);
  });
});

describe('auth-missing-ast: metadata & positioning', () => {
  it('records line and column of the handler start', () => {
    const src = `\n\nexport async function GET() {\n  return Response.json({});\n}`;
    const findings = scanAuthMissing('app/api/x/route.ts', src);
    expect(findings[0]?.line).toBe(3);
    expect(findings[0]?.column).toBe(1);
  });
});
