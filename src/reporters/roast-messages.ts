import type { Grade } from '../scoring/score.js';

/**
 * Per-rule roast lines for `--roast` mode. When a finding's ruleId
 * matches a key, the console reporter replaces `finding.message`
 * with the roast text. All other output formats (JSON / HTML) are
 * untouched — the roast is a CLI flex, not something you want
 * showing up in a corporate compliance report.
 *
 * Tone guide:
 *   - Dark / dry / brutalist, but never mean
 *   - Stay factually accurate — the funny part is the delivery
 *   - No slurs, no punching down, no cheap shots at user competence
 *   - 1-2 sentences, under 120 chars ideally
 *
 * Keys here MUST match the actual `id:` field of the rule in
 * `src/rules/*.ts` or the `ruleId` emitted by an engine in
 * `src/engines/*.ts`. A cross-check test in test/roast.test.ts
 * enforces this — if a rule ships without a matching key, tests fail.
 *
 * Engine-emitted rule IDs (template-string) NOT in rule files:
 *   vh-auth-missing-middleware     (auth-missing-ast)
 *   vh-supabase-rls-disabled       (rls-diff)
 *   vh-secret-supabase-service-role (jwt-payload)
 *   vh-dep-cve-<cveOrPkg>          (osv-scanner, dynamic — handled via prefix)
 */
export const ROAST_MESSAGES: Record<string, string> = {
  // ── Secrets ──
  'vh-secret-openai':
    "OpenAI key in source. Your token bill just rang. It's scared.",
  'vh-secret-anthropic':
    'Anthropic key exposed. Claude noticed. Claude is disappointed.',
  'vh-secret-stripe':
    'Stripe sk_live_ in source. This is how people buy Lamborghinis with your money.',
  'vh-secret-github-pat':
    'GitHub PAT in source. Somewhere, someone is force-pushing to your main.',
  'vh-secret-slack-token':
    'Slack token leaked. Prepare for creative #general announcements.',
  'vh-secret-sendgrid':
    "SendGrid key exposed. Your users are about to receive 'URGENT: Bitcoin' emails from you.",
  'vh-secret-notion':
    'Notion integration token in source. Every page. Every database. Right. There.',
  'vh-secret-twilio-auth-token':
    'Twilio SID+token combo in source. Someone is SMS-ing strangers on your dime.',
  'vh-secret-aws-access-key':
    'AWS key exposed. Either get insurance or turn off the region with the GPU farm.',
  'vh-secret-db-url':
    "DB URL with credentials in source. Your users' data just waved goodbye.",
  'vh-secret-jwt-hardcoded':
    'Hardcoded JWT secret. Every token you ever signed is now a compromise waiting to happen.',
  'vh-secret-generic-high-entropy':
    'High-entropy secret-ish variable. Smells. Like. A secret.',
  'vh-secret-next-public-risky':
    "NEXT_PUBLIC_SECRET. The word 'PUBLIC' is doing a lot of work.",
  'vh-secret-supabase-service-role':
    'service_role JWT in source. That key bypasses RLS for every row in every table.',
  'vh-secret-google-api':
    'Google API key exposed. Gemini inference, Maps, or GCP billing — your choice of disaster. Likely all three.',

  // ── Auth (src/rules/auth-patterns.ts) ──
  'vh-auth-jwt-none-alg':
    "jwt.verify accepts alg:'none'. Any token now signs itself. Cool? Cool.",
  'vh-auth-hardcoded-bypass':
    '`|| true` in an auth check. The bypass is inside the house.',
  'vh-auth-todo-comment':
    '`// TODO: add auth` shipping to prod. Future-you is not coming.',
  'vh-auth-weak-session-cookie':
    'Session cookie without httpOnly / secure. XSS will appreciate the gift.',
  'vh-supabase-rls-policy-true':
    "RLS policy: USING (true). That's... technically a policy.",
  'vh-supabase-service-role-in-client':
    "service_role referenced from a 'use client' file. You're shipping the backdoor to every visitor.",
  'vh-auth-token-in-localstorage':
    'JWT in localStorage. One XSS later, every session is portable. Welcome to share-economy auth.',
  'vh-auth-bcrypt-low-rounds':
    'bcrypt with rounds < 10. A used GPU on eBay cracks this over lunch.',

  // ── Auth (engine: auth-missing-ast) ──
  'vh-auth-missing-middleware':
    'API route with no auth check. That is just a public URL you made harder to find.',

  // ── Supabase RLS (engine: rls-diff) ──
  'vh-supabase-rls-disabled':
    'Supabase RLS disabled. Any anon user can SELECT *. Security theater with no curtain.',

  // ── Injection (src/rules/injection.ts) ──
  'vh-inj-sql-template':
    'SQL template-literal injection. Bobby Tables says hi.',
  'vh-inj-cmd-exec':
    "child_process.exec with user input. Congratulations, you've invented a shell-as-a-service.",
  'vh-inj-nosql-dollar':
    'NoSQL query built from req.body with `$` operators. Every field is a free hand for the attacker.',
  'vh-inj-path-traversal':
    'Path traversal: user input concatenated into a file path. Your /etc/passwd is waving.',
  'vh-inj-xss-dangerous-html':
    "dangerouslySetInnerHTML with user content. The 'dangerously' was not a suggestion.",
  'vh-inj-eval-user-input':
    'eval(req.body). You wrote a command interpreter and gave the keys to anyone with curl.',

  // ── Network (src/rules/network.ts) ──
  'vh-cors-wildcard-credentials':
    "CORS * with credentials. You're inviting attackers in with a handwritten note.",
  'vh-cors-reflect-origin':
    "CORS origin reflected back. Every attacker's origin is trusted now. Every single one.",
  'vh-ssrf-fetch-user-url':
    'fetch(req.body.url). Your server is now an HTTP proxy for arbitrary strangers.',
  'vh-open-redirect':
    'Open redirect via user-controlled URL. Perfect phishing relay. 10/10 attacker setup.',

  // ── Supply chain (engines) ──
  'vh-llm-hallucinated-package':
    "Package does not exist on npm. Your AI dreamt it up. Hope the squatters haven't claimed the name yet.",
  'vh-llm-low-trust-package':
    'Package exists on npm but has almost zero downloads. Either brand new, or you are the first victim.',

  // ── Python injection (src/rules/python-injection.ts) ──
  'vh-py-inj-sql-fstring':
    'SQL f-string interpolation. Bobby Tables, Python edition.',
  'vh-py-inj-cmd-shell':
    'subprocess(shell=True) with user input. Shell escaping entered a coma.',
  'vh-py-eval-exec-user-input':
    'eval() / exec() on request data. You wrote an RCE endpoint. Intentional? Doubt it.',
  'vh-py-inj-path-traversal':
    'Python path concatenation from user input. /etc/passwd is practicing wave motion.',
  'vh-py-yaml-load-unsafe':
    'yaml.load() instead of safe_load(). Arbitrary object deserialization included free.',
  'vh-py-pickle-user-input':
    'pickle.loads on user input. Arbitrary code execution in a gift box.',

  // ── Python auth (src/rules/python-auth.ts) ──
  'vh-py-django-debug-true':
    'DEBUG = True in production. Your stack traces are now a public confession.',
  'vh-py-django-secret-key':
    'Hardcoded Django SECRET_KEY. Session forgery is now a feature.',
  'vh-py-django-allowed-hosts-wildcard':
    "ALLOWED_HOSTS = ['*']. Your Host header has no adult supervision.",
  'vh-py-flask-debug-run':
    'Flask debug mode enabled. The Werkzeug console says hi.',
  'vh-py-fastapi-route-no-depends':
    'FastAPI route with no Depends(get_current_user). Who needs authentication anyway.',
  'vh-py-jwt-algorithm-none':
    "jwt.decode with algorithms=['none']. Any token signs itself now. Cool? Cool.",
  'vh-py-hardcoded-password':
    'Hardcoded password in Python. Someday, someone will grep for this.',
  'vh-py-django-csrf-exempt':
    '@csrf_exempt on a state-changing route. CSRF protection politely excused itself.',

  // ── Go (src/rules/go-injection.ts) ──
  'vh-go-inj-sql-concat':
    'SQL built with `+ userInput`. Welcome back to PHP 2003.',
  'vh-go-inj-sql-sprintf':
    'fmt.Sprintf into a SQL query. The driver had ONE job.',
  'vh-go-inj-cmd-exec':
    'exec.Command("sh","-c", + userInput). You wrote a remote shell with extra steps.',
  'vh-go-inj-path-traversal':
    'os.Open with concatenated user path. /etc/passwd is one `..` away.',
  'vh-go-inj-template-html-user':
    'template.HTML(userInput). The "dangerously" was ALSO not a suggestion in Go.',

  // ── Go (src/rules/go-auth.ts) ──
  'vh-go-tls-skip-verify':
    'InsecureSkipVerify: true. Now every coffee shop wifi is your CA.',
  'vh-go-jwt-alg-none':
    "jwt.Parse callback returns the key without checking token.Method. alg='none' tokens walk right in.",
  'vh-go-bcrypt-low-cost':
    'bcrypt cost < 10 in Go. A used GPU on eBay cracks this over lunch — same as the JS version.',
  'vh-go-hmac-not-timing-safe':
    'bytes.Equal on HMAC. Timing attack speed-runners thank you.',
  'vh-go-insecure-random-token':
    'math/rand for tokens. Predictable session IDs, ship it.',
  'vh-go-http-no-timeout':
    'http.ListenAndServe with no timeouts. Slowloris is a feature now.',
  'vh-go-cookie-missing-secure':
    'Session cookie without Secure: true. Welcome back to plain HTTP credential leakage.',
  'vh-go-cookie-missing-httponly':
    'Session cookie without HttpOnly: true. Every XSS is a session hijack.',

  // ── Rust (src/rules/rust-injection.ts) ──
  'vh-rs-inj-sql-format':
    'format!() into sqlx::query. The compile-time check was the WHOLE point of sqlx.',
  'vh-rs-inj-cmd-format':
    'Command::new("sh").arg("-c").arg(format!(...)). Even Rust can\'t save you from yourself.',
  'vh-rs-inj-unwrap-user-input':
    '.unwrap() on req body. One malformed POST and the whole service panics. You wrote a DoS.',
  'vh-rs-inj-path-user':
    'std::fs path with user input. The borrow checker is fine, your filesystem is not.',
  'vh-rs-inj-ssrf-fetch-user':
    'reqwest::get(req.body). 169.254.169.254 is calling, it wants your AWS credentials.',

  // ── Rust (src/rules/rust-auth.ts) ──
  'vh-rs-tls-no-verify':
    'danger_accept_invalid_certs(true). The function name LITERALLY warned you.',
  'vh-rs-jwt-alg-none':
    'jsonwebtoken::decode with Validation::default(). alg=none speedrun any%.',
  'vh-rs-bcrypt-low-cost':
    'bcrypt::hash(pwd, 4). Same brain damage in three languages now.',
  'vh-rs-hmac-not-timing-safe':
    '== on byte slices for HMAC. subtle::ConstantTimeEq is right there.',
  'vh-rs-insecure-random-token':
    'rand::random() for a session token. Mersenne Twister: the password manager you didn\'t want.',
};

export const ROAST_GRADE_LINES: Record<Grade, string> = {
  A: 'Clean repo. Suspicious.',
  B: 'Acceptable. Still has room to disappoint.',
  C: 'Meh. Neither impressive nor catastrophic.',
  D: 'Ship at your own peril.',
  F: 'This is a hostage note to yourself.',
};

export const ROAST_EMPTY =
  'No findings. Did you try? Or you just skip dangerous AI tools?';

export const ROAST_DEPENDENCY_CVE_PREFIX =
  'Known CVE, fix is one `npm update` away. Your laziness compounds:';

/**
 * Strip only the leading `pkg@version:` prefix if present — the
 * single-CVE message shape. The grouped format
 * (`pkg@ver has N known vulnerabilities — worst: medium`) has no
 * such prefix, so leave it alone. The previous "everything up to
 * first colon" regex incorrectly matched on the grouped shape and
 * returned just the word after the final colon (e.g. "medium"),
 * producing a confusing one-word line.
 */
function stripPkgPrefix(msg: string): string {
  // Allow optional leading `@` for scoped npm packages like
  // `@hono/node-server@1.19.9: GHSA-xxx — summary`. Without the
  // `@?` the regex rejected every scoped package and fell back to
  // returning the full message, making the roast line redundant.
  const m = /^@?[^@\s]+@[^\s:]+:\s*(.*)$/.exec(msg);
  return m ? m[1]! : msg;
}

export function roastMessage(ruleId: string, fallback: string): string {
  if (ROAST_MESSAGES[ruleId]) return ROAST_MESSAGES[ruleId];
  if (ruleId.startsWith('vh-dep-cve-')) {
    return `${ROAST_DEPENDENCY_CVE_PREFIX} ${stripPkgPrefix(fallback)}`;
  }
  return fallback;
}
