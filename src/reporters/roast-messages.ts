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
 * If a ruleId isn't in this map the console reporter falls back to
 * the regular message.
 */
export const ROAST_MESSAGES: Record<string, string> = {
  // Secrets
  'vh-secret-openai':
    "OpenAI key in source. Your token bill just rang. It's scared.",
  'vh-secret-anthropic':
    'Anthropic key exposed. Claude noticed. Claude is disappointed.',
  'vh-secret-stripe':
    "Stripe sk_live_ in source. This is how people buy Lamborghinis with your money.",
  'vh-secret-github-pat':
    "GitHub PAT in source. Somewhere, someone is force-pushing to your main.",
  'vh-secret-slack-token':
    'Slack token leaked. Prepare for creative #general announcements.',
  'vh-secret-sendgrid':
    "SendGrid key exposed. Your users are about to receive 'URGENT: Bitcoin' emails from you.",
  'vh-secret-notion':
    'Notion integration token in source. Every page. Every database. Right. There.',
  'vh-secret-twilio-auth-token':
    "Twilio SID+token combo in source. Someone is SMS-ing strangers on your dime.",
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

  // Auth / platform
  'vh-rls-disabled':
    "Supabase RLS disabled. Any anon user can SELECT *. Security theater with no curtain.",
  'vh-auth-missing-middleware':
    'API route with no auth check. That is just a public URL you made harder to find.',
  'vh-jwt-service-role-client':
    "service_role key in a 'use client' file. You are shipping the backdoor to every visitor.",

  // Injection
  'vh-inj-sql-template':
    'SQL template-literal injection. Bobby Tables says hi.',
  'vh-inj-cmd-exec':
    "child_process.exec with user input. Congratulations, you've invented a shell-as-a-service.",
  'vh-inj-nosql-req-body':
    'NoSQL query built directly from req.body. Every field is a free hand for the attacker.',
  'vh-inj-path-traversal':
    'Path traversal: user input concatenated into a file path. Your /etc/passwd is waving.',
  'vh-inj-dangerously-set-inner-html':
    "dangerouslySetInnerHTML with user content. The 'dangerously' was not a suggestion.",

  // Network
  'vh-net-cors-wildcard':
    "CORS * with credentials. You're inviting attackers in with a handwritten note.",
  'vh-net-cors-reflect':
    "CORS origin reflected back. Every attacker's origin is trusted now. Every single one.",
  'vh-net-ssrf':
    "fetch(req.body.url). Your server is now an HTTP proxy for arbitrary strangers.",
  'vh-net-open-redirect':
    'Open redirect via user-controlled URL. Perfect phishing relay. 10/10 attacker setup.',

  // Supply chain
  'vh-llm-hallucinated-package':
    "Package doesn't exist on npm. Your AI dreamt it up. Hope the squatters haven't claimed the name yet.",

  // Python
  'vh-py-eval-user-input':
    "eval() on request data. You wrote a RCE endpoint. Intentional? Doubt it.",
  'vh-py-subprocess-shell':
    'subprocess(shell=True) with user input. Shell escaping entered a coma.',
  'vh-py-yaml-load':
    "yaml.load() instead of safe_load(). Arbitrary object deserialization included free.",
  'vh-py-pickle-load':
    'pickle.loads on user input. Arbitrary code execution in a gift box.',
  'vh-py-django-debug-true':
    'DEBUG = True in production. Your stack traces are now a confession.',
  'vh-py-django-allowed-hosts-wildcard':
    "ALLOWED_HOSTS = ['*']. Your Host header has no adult supervision.",
  'vh-py-django-secret-key':
    'Hardcoded Django SECRET_KEY. Session forgery is now a feature.',
  'vh-py-flask-debug-true':
    'Flask debug mode enabled. The Werkzeug console says hi.',
  'vh-py-flask-csrf-exempt':
    '@csrf_exempt on a state-changing route. CSRF protection politely excused itself.',
  'vh-py-fastapi-no-auth':
    "FastAPI route with no Depends(get_current_user). Who needs authentication anyway.",
  'vh-py-jwt-alg-none':
    "jwt.decode(algorithms=['none']). Any token signs itself now. Cool? Cool.",
};

export const ROAST_GRADE_LINES: Record<Grade, string> = {
  A: 'Clean repo. Suspicious.',
  B: 'Acceptable. Still has room to disappoint.',
  C: 'Meh. Neither impressive nor catastrophic.',
  D: 'Ship at your own peril.',
  F: 'This is a hostage note to yourself.',
};

export const ROAST_EMPTY = "No findings. Did you even try? Or do you just not run dangerous AI tools like the rest of us?";

export const ROAST_DEPENDENCY_CVE_PREFIX = 'Known CVE, fix is one `npm update` away. Your laziness compounds:';

export function roastMessage(ruleId: string, fallback: string): string {
  if (ROAST_MESSAGES[ruleId]) return ROAST_MESSAGES[ruleId];
  if (ruleId.startsWith('vh-dep-cve-')) {
    return `${ROAST_DEPENDENCY_CVE_PREFIX} ${fallback.replace(/^[^:]+:\s*/, '')}`;
  }
  return fallback;
}
