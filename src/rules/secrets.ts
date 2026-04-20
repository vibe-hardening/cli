import type { SecretRule } from '../engines/secret-regex.js';

const ENV_EXAMPLE_FILE = /[\\/]\.env\.(example|sample|template)$/i;
const PLACEHOLDER_MARKERS = [
  'your_',
  'placeholder',
  'changeme',
  'xxxxxxxx',
  '<your',
  'your-key',
  'yourkeyhere',
];

const DB_URL_PLACEHOLDERS = [
  'placeholder',
  'changeme',
  '<your',
  'your_',
  'xxxxxxxx',
];

export const SECRET_RULES: SecretRule[] = [
  {
    id: 'vh-secret-openai',
    severity: 'critical',
    category: 'secret',
    message: 'OpenAI API key hardcoded in source',
    remediation:
      'Move to process.env.OPENAI_API_KEY and revoke the leaked key at platform.openai.com/api-keys.',
    verify: { kind: 'openai' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'proj',
        regex: /sk-proj-[A-Za-z0-9_-]{40,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
      {
        name: 'svcacct',
        regex: /sk-svcacct-[A-Za-z0-9_-]{40,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
      {
        name: 'admin',
        regex: /sk-admin-[A-Za-z0-9_-]{40,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
      {
        name: 'legacy',
        regex: /sk-[A-Za-z0-9]{48}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
  {
    id: 'vh-secret-anthropic',
    severity: 'critical',
    category: 'secret',
    message: 'Anthropic API key hardcoded in source',
    remediation:
      'Rotate at console.anthropic.com and move to process.env.ANTHROPIC_API_KEY.',
    verify: { kind: 'anthropic' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'api',
        regex: /sk-ant-(?:api|admin|sid)\d{2}-[A-Za-z0-9_-]{60,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
  {
    id: 'vh-secret-stripe',
    severity: 'critical',
    category: 'secret',
    message: 'Stripe secret/restricted key (live) hardcoded',
    remediation:
      'Roll the key on Stripe Dashboard → Developers → API keys. Treat as compromised.',
    verify: { kind: 'stripe' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'sk_live',
        regex: /sk_live_[0-9a-zA-Z]{24,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
      {
        name: 'rk_live',
        regex: /rk_live_[0-9a-zA-Z]{24,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
  {
    id: 'vh-secret-github-pat',
    severity: 'critical',
    category: 'secret',
    message: 'GitHub Personal Access Token exposed',
    remediation:
      'Revoke at github.com/settings/tokens. Prefer fine-grained tokens and store in env vars.',
    verify: { kind: 'github-pat' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'pat',
        regex: /gh[pousr]_[A-Za-z0-9]{36,}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
  {
    id: 'vh-secret-aws-access-key',
    severity: 'critical',
    category: 'secret',
    message: 'AWS Access Key ID detected (likely paired Secret nearby)',
    remediation:
      'Deactivate via `aws iam` CLI, rotate, then audit CloudTrail for abuse.',
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [{ name: 'akid', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g }],
  },
  {
    id: 'vh-secret-db-url',
    severity: 'high',
    category: 'secret',
    message: 'Database connection string with credentials exposed',
    remediation:
      'Rotate the database password and move the full URL to an env var.',
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'url',
        regex:
          /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s"'`]+:[^@\s"'`]{6,}@[^\s"'`]+/g,
        disallowSubstrings: DB_URL_PLACEHOLDERS,
      },
    ],
  },
  {
    id: 'vh-secret-jwt-hardcoded',
    severity: 'high',
    category: 'secret',
    message: 'Hardcoded secret passed to jwt.sign / jwt.verify',
    remediation:
      'Move the signing secret to env and rotate. Any token signed with the old secret is compromised.',
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'jwt-literal',
        // Bounded quantifier on the payload argument prevents catastrophic
        // backtracking on inputs like `jwt.sign(aaaa,aaaa,...,"x")` (H-1 fix).
        regex:
          /jwt\.(?:sign|verify)\s*\(\s*[^,\n]{1,512},\s*["'`]([A-Za-z0-9!@#$%^&*_\-]{8,})["'`]/g,
        captureGroup: 1,
      },
    ],
  },
  {
    id: 'vh-secret-next-public-risky',
    severity: 'high',
    category: 'secret',
    message:
      'NEXT_PUBLIC_* variable name suggests a server-only secret (will ship to browser bundle)',
    remediation:
      'Drop the NEXT_PUBLIC_ prefix. Only expose publishable / anon keys via NEXT_PUBLIC_*.',
    patterns: [
      {
        name: 'risky-name',
        regex:
          /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|OPENAI_KEY|ANTHROPIC_KEY|STRIPE_SECRET|DB_URL)[A-Z0-9_]*/g,
      },
    ],
  },
  {
    id: 'vh-secret-generic-high-entropy',
    severity: 'medium',
    category: 'secret',
    message: 'High-entropy token assigned to a secret-looking variable',
    remediation:
      'Verify whether this is a real secret; if yes, rotate and move to env.',
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'assignment',
        regex:
          /(?:(?:api|access|secret|private|auth|token|password|passwd|pwd)_?key|secret|token|passwd|password|pwd)\s*[:=]\s*["'`]([A-Za-z0-9+/=_\-]{24,})["'`]/gi,
        captureGroup: 1,
        minEntropy: 4.2,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
  {
    id: 'vh-secret-slack-token',
    severity: 'high',
    category: 'secret',
    message: 'Slack token exposed',
    remediation:
      'Revoke at api.slack.com/apps → OAuth & Permissions, regenerate, and move to env.',
    verify: { kind: 'slack' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'slack',
        regex: /xox[abpr]-[A-Za-z0-9-]{10,}/g,
        minEntropy: 3.0,
      },
    ],
  },
  {
    id: 'vh-secret-sendgrid',
    severity: 'critical',
    category: 'secret',
    message: 'SendGrid API key exposed',
    remediation:
      'Revoke at app.sendgrid.com/settings/api_keys. Treat sent email from the leaked key as potentially spoofed.',
    verify: { kind: 'sendgrid' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'sg',
        regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
  {
    id: 'vh-secret-twilio-auth-token',
    severity: 'critical',
    category: 'secret',
    message: 'Twilio Account SID and Auth Token exposed',
    remediation:
      'Rotate the token at twilio.com/console → Account → API keys. A leaked Twilio token can send paid SMS.',
    // No `verify` yet — Twilio verification needs the paired SID+Token
    // sent together, which the current requireAllPatterns pipeline
    // can't surface through `_rawValue` (it only carries the last
    // pattern's match). Detection works; live-check is a v0.0.8+ item.
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    requireAllPatterns: true,
    patterns: [
      {
        name: 'sid',
        regex: /\bAC[0-9a-f]{32}\b/g,
      },
      {
        name: 'token',
        regex:
          /(?:auth[_-]?token|twilio[_-]?token)\s*[:=]\s*["'`]([0-9a-f]{32})["'`]/gi,
        captureGroup: 1,
      },
    ],
  },
  {
    id: 'vh-secret-notion',
    severity: 'high',
    category: 'secret',
    message: 'Notion integration token exposed',
    remediation:
      'Revoke at notion.so/my-integrations. A leaked token can read/write every page and database the integration is connected to.',
    verify: { kind: 'notion' },
    excludeFilenamePatterns: [ENV_EXAMPLE_FILE],
    patterns: [
      {
        name: 'secret',
        regex: /\b(?:secret|ntn)_[A-Za-z0-9]{43}\b/g,
        disallowSubstrings: PLACEHOLDER_MARKERS,
      },
    ],
  },
];
