import type { SecretRule } from '../engines/secret-regex.js';

export const AUTH_PATTERN_RULES: SecretRule[] = [
  {
    id: 'vh-auth-jwt-none-alg',
    severity: 'critical',
    category: 'auth',
    message:
      "JWT verification allows algorithm 'none' (attacker can forge any token)",
    remediation:
      "Pin the algorithms list: jwt.verify(token, secret, { algorithms: ['HS256'] }). Never include 'none'.",
    patterns: [
      {
        name: 'algorithms-none',
        regex:
          /algorithms\s*:\s*\[[^\]]*['"]none['"][^\]]*\]/g,
      },
      {
        name: 'algorithm-none',
        regex:
          /algorithm\s*:\s*['"]none['"]/g,
      },
    ],
  },
  {
    id: 'vh-auth-hardcoded-bypass',
    severity: 'high',
    category: 'auth',
    message:
      "Authorisation check short-circuited with `|| true` or `=== true ||` (developer debug leak)",
    remediation:
      'Remove the hardcoded `true`. Never ship auth checks with debugging shortcuts enabled.',
    patterns: [
      {
        name: 'or-true',
        regex:
          /if\s*\([^)]*?(?:role|isAdmin|permission|authorized|authorised|isAuthenticated|hasAccess)[^)]*?\|\|\s*true/gi,
      },
    ],
  },
  {
    id: 'vh-auth-todo-comment',
    // Informational by design: a TODO is not a live vulnerability, only
    // a strong signal that something's missing. Medium keeps it visible
    // without clogging up the Critical/High tier that drives CI exit 1.
    severity: 'medium',
    category: 'auth',
    message: 'TODO / FIXME comment references unfinished auth work',
    remediation:
      'Complete the auth check before shipping. This is one of the most common reasons vibe-coded apps go live without protection.',
    patterns: [
      {
        name: 'todo-auth',
        regex:
          /\/\/\s*(?:TODO|FIXME|XXX|HACK)[^\n]*(?:\bauth|\bauthn|\bauthz|\bpermission|\bcheck\s*login|\bsession|\bunauthori[sz]ed|\baccess\s*control)/gi,
      },
    ],
  },
  {
    id: 'vh-auth-weak-session-cookie',
    severity: 'medium',
    category: 'auth',
    message:
      'Session cookie set without httpOnly / secure / sameSite flags',
    remediation:
      'res.cookie(name, value, { httpOnly: true, secure: true, sameSite: "lax" }). Required to defeat basic XSS / CSRF.',
    patterns: [
      {
        name: 'cookie-no-flags',
        regex:
          /\.cookie\s*\(\s*['"`](?:session|sess|jwt|token|auth|id)[^'"`]*['"`]\s*,\s*[^,)]+\s*\)/g,
      },
    ],
  },
  {
    id: 'vh-supabase-rls-policy-true',
    severity: 'high',
    category: 'config',
    message:
      'Supabase RLS policy uses `using (true)` — equivalent to no protection at all',
    remediation:
      'Bind the policy to auth.uid(): `using (auth.uid() = owner_id)`. Policy conditions must scope rows to the requesting user.',
    patterns: [
      {
        name: 'policy-true',
        regex:
          /create\s+policy[\s\S]{0,200}?using\s*\(\s*true\s*\)/gi,
      },
    ],
  },
  {
    id: 'vh-supabase-service-role-in-client',
    severity: 'critical',
    category: 'config',
    message:
      "'use client' module contains a reference to SUPABASE_SERVICE_ROLE / service_role — this key would be shipped to browsers",
    remediation:
      'Service role must never be used in client components. Use anon key + RLS on the client; service role in route handlers / server actions only.',
    // Use a two-signal requirement pattern so the regex only fires on the
    // sanity check without a greedy `[\s\S]{0,4000}?` backtracker. The
    // file-level combination is checked by matching *both* patterns below
    // via the "all patterns must match" post-processor in the engine. For
    // now we match the service_role reference and rely on the filename +
    // content heuristic at call site.
    requireAllPatterns: true,
    patterns: [
      { name: 'use-client', regex: /['"]use client['"]/g },
      {
        name: 'service-role-ref',
        regex: /(?:SUPABASE_SERVICE_ROLE|service_role)/g,
      },
    ],
  },
];
