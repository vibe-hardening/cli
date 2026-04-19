import { describe, it, expect } from 'vitest';
import { scanSecrets } from '../src/engines/secret-regex.js';
import { INJECTION_RULES } from '../src/rules/injection.js';
import { NETWORK_RULES } from '../src/rules/network.js';
import { AUTH_PATTERN_RULES } from '../src/rules/auth-patterns.js';

function scan(
  rules: typeof INJECTION_RULES,
  path: string,
  content: string,
) {
  return scanSecrets({ path, content }, rules);
}

describe('injection rules', () => {
  it('fires on SQL template literal injection', () => {
    const src = 'db.query(`SELECT * FROM users WHERE id=${userId}`)';
    const f = scan(INJECTION_RULES, 'db.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-sql-template')).toBe(true);
  });

  it('passes on parameterised SQL', () => {
    const src = 'db.query("SELECT * FROM users WHERE id=$1", [userId])';
    const f = scan(INJECTION_RULES, 'db.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-sql-template')).toBe(false);
  });

  it('fires on MongoDB query with req.body', () => {
    const src = 'User.findOne({ email: req.body.email, password: req.body.password })';
    const f = scan(INJECTION_RULES, 'login.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-nosql-dollar')).toBe(true);
  });

  it('fires on exec with user input', () => {
    const src = 'exec(`convert ${req.query.file} out.png`)';
    const f = scan(INJECTION_RULES, 'img.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-cmd-exec')).toBe(true);
  });

  it('fires on path traversal', () => {
    const src = 'fs.readFile(req.query.path, cb)';
    const f = scan(INJECTION_RULES, 'file.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-path-traversal')).toBe(true);
  });

  it('fires on dangerouslySetInnerHTML without sanitiser', () => {
    const src = '<div dangerouslySetInnerHTML={{ __html: userComment }} />';
    const f = scan(INJECTION_RULES, 'page.tsx', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-xss-dangerous-html')).toBe(true);
  });

  it('passes on DOMPurify-sanitised inner html', () => {
    const src =
      '<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }} />';
    const f = scan(INJECTION_RULES, 'page.tsx', src);
    expect(f.some((x) => x.ruleId === 'vh-inj-xss-dangerous-html')).toBe(false);
  });
});

describe('network rules', () => {
  it('fires on CORS wildcard + credentials', () => {
    const src = "app.use(cors({ origin: '*', credentials: true }));";
    const f = scan(NETWORK_RULES, 'server.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-cors-wildcard-credentials')).toBe(true);
  });

  it('fires on CORS wildcard + credentials when formatted multi-line (review fix)', () => {
    const src = `
      app.use(cors({
        origin: '*',
        credentials: true,
      }));
    `;
    const f = scan(NETWORK_RULES, 'server.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-cors-wildcard-credentials')).toBe(true);
  });

  it('fires on CORS origin reflect', () => {
    const src =
      "res.setHeader('Access-Control-Allow-Origin', req.headers.origin)";
    const f = scan(NETWORK_RULES, 'mw.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-cors-reflect-origin')).toBe(true);
  });

  it('fires on SSRF fetch req.body.url', () => {
    const src = 'const r = await fetch(req.body.url);';
    const f = scan(NETWORK_RULES, 'proxy.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-ssrf-fetch-user-url')).toBe(true);
  });

  it('fires on open redirect', () => {
    const src = 'res.redirect(req.query.next)';
    const f = scan(NETWORK_RULES, 'auth.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-open-redirect')).toBe(true);
  });
});

describe('auth pattern rules', () => {
  it("fires on JWT algorithms containing 'none'", () => {
    const src = "jwt.verify(token, secret, { algorithms: ['none', 'HS256'] })";
    const f = scan(AUTH_PATTERN_RULES, 'verify.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-auth-jwt-none-alg')).toBe(true);
  });

  it('fires on `|| true` bypass in auth check', () => {
    const src = "if (user.role === 'admin' || true) { /* ... */ }";
    const f = scan(AUTH_PATTERN_RULES, 'admin.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-auth-hardcoded-bypass')).toBe(true);
  });

  it('fires on TODO auth comment', () => {
    const src = '// TODO: add authentication here\nexport async function POST() {}';
    const f = scan(AUTH_PATTERN_RULES, 'route.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-auth-todo-comment')).toBe(true);
  });

  it('fires on weak session cookie without flags', () => {
    const src = 'res.cookie("session", token)';
    const f = scan(AUTH_PATTERN_RULES, 'login.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-auth-weak-session-cookie')).toBe(true);
  });

  it('passes when session cookie has httpOnly + secure + sameSite', () => {
    const src =
      'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "lax" })';
    const f = scan(AUTH_PATTERN_RULES, 'login.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-auth-weak-session-cookie')).toBe(false);
  });

  it('fires on Supabase RLS policy using (true)', () => {
    const src = 'create policy "read all" on profiles for select using (true);';
    const f = scan(AUTH_PATTERN_RULES, 'migration.sql', src);
    expect(f.some((x) => x.ruleId === 'vh-supabase-rls-policy-true')).toBe(true);
  });

  it("fires on 'use client' file with SUPABASE_SERVICE_ROLE reference", () => {
    const src =
      "'use client';\nimport { createClient } from '@supabase/supabase-js';\nconst supa = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE);";
    const f = scan(AUTH_PATTERN_RULES, 'Comp.tsx', src);
    expect(f.some((x) => x.ruleId === 'vh-supabase-service-role-in-client')).toBe(true);
  });

  it("does NOT fire when 'use client' absent but service_role appears (server file)", () => {
    const src =
      "import { createClient } from '@supabase/supabase-js';\nconst supa = createClient(url, process.env.SUPABASE_SERVICE_ROLE);";
    const f = scan(AUTH_PATTERN_RULES, 'server.ts', src);
    expect(f.some((x) => x.ruleId === 'vh-supabase-service-role-in-client')).toBe(false);
  });

  it("does NOT fire when 'use client' present but no service_role reference", () => {
    const src = "'use client';\nexport const Foo = () => <div />;";
    const f = scan(AUTH_PATTERN_RULES, 'Comp.tsx', src);
    expect(f.some((x) => x.ruleId === 'vh-supabase-service-role-in-client')).toBe(false);
  });
});
