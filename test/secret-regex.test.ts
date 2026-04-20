import { describe, it, expect } from 'vitest';
import { scanSecrets } from '../src/engines/secret-regex.js';
import { SECRET_RULES } from '../src/rules/secrets.js';

function ctx(path: string, content: string) {
  return { path, content };
}

function scan(path: string, content: string) {
  return scanSecrets(ctx(path, content), SECRET_RULES);
}

describe('secret-regex: OpenAI', () => {
  it('fires on sk-proj- key', () => {
    const src = `const key = "sk-proj-${'a'.repeat(60)}";`;
    const findings = scan('app/api/chat/route.ts', src);
    const openai = findings.filter((f) => f.ruleId === 'vh-secret-openai');
    expect(openai.length).toBeGreaterThan(0);
  });

  it('fires on legacy sk- key', () => {
    const legacy = 'sk-' + 'AbCdEfGh12345678'.repeat(3);
    const findings = scan('lib/openai.ts', `const KEY = "${legacy}";`);
    const openai = findings.filter((f) => f.ruleId === 'vh-secret-openai');
    expect(openai.length).toBeGreaterThan(0);
  });

  it('does not fire for placeholders', () => {
    const src = `const key = "sk-${'YOUR_KEY_HERE_PLACEHOLDER'.repeat(2)}";`;
    const findings = scan('.env.example', src);
    const openai = findings.filter((f) => f.ruleId === 'vh-secret-openai');
    expect(openai).toHaveLength(0);
  });

  it('skips .env.example whitelist', () => {
    const src = `OPENAI_API_KEY=sk-proj-${'realrealreal'.repeat(5)}`;
    const findings = scan('foo/.env.example', src);
    expect(findings.filter((f) => f.ruleId === 'vh-secret-openai')).toHaveLength(
      0,
    );
  });
});

describe('secret-regex: Anthropic', () => {
  it('fires on sk-ant-api03 key', () => {
    const k = 'sk-ant-api03-' + 'Ab9_-'.repeat(20);
    const findings = scan('app.ts', `const k="${k}"`);
    expect(findings.some((f) => f.ruleId === 'vh-secret-anthropic')).toBe(true);
  });
});

describe('secret-regex: Stripe', () => {
  it('fires on sk_live_', () => {
    const k = 'sk_live_' + 'A1b2C3d4E5f6'.repeat(3);
    const findings = scan('server.ts', `Stripe("${k}")`);
    expect(findings.some((f) => f.ruleId === 'vh-secret-stripe')).toBe(true);
  });

  it('fires on rk_live_', () => {
    const k = 'rk_live_' + 'A1b2C3d4E5f6'.repeat(3);
    const findings = scan('server.ts', `key="${k}"`);
    expect(findings.some((f) => f.ruleId === 'vh-secret-stripe')).toBe(true);
  });

  it('does not fire on pk_live_ (publishable ok on client)', () => {
    const k = 'pk_live_' + 'A1b2C3d4E5f6'.repeat(3);
    const findings = scan('client.tsx', `key="${k}"`);
    expect(findings.some((f) => f.ruleId === 'vh-secret-stripe')).toBe(false);
  });
});

describe('secret-regex: GitHub PAT', () => {
  it('fires on ghp_', () => {
    const k = 'ghp_' + 'A'.repeat(40);
    const findings = scan('scripts/release.ts', `token="${k}"`);
    expect(findings.some((f) => f.ruleId === 'vh-secret-github-pat')).toBe(true);
  });
});

describe('secret-regex: AWS', () => {
  it('fires on AKIA keys', () => {
    const findings = scan('infra.ts', 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE');
    expect(findings.some((f) => f.ruleId === 'vh-secret-aws-access-key')).toBe(
      true,
    );
  });

  it('fires on ASIA temporary keys', () => {
    const findings = scan('session.ts', 'const k = "ASIAXXXXXXXXXXXXXXXX";');
    expect(findings.some((f) => f.ruleId === 'vh-secret-aws-access-key')).toBe(
      true,
    );
  });
});

describe('secret-regex: DB URL', () => {
  it('fires on postgres connection with creds', () => {
    const findings = scan(
      'db.ts',
      'const url = "postgres://admin:Sup3rP@ss@db.example.com:5432/app";',
    );
    expect(findings.some((f) => f.ruleId === 'vh-secret-db-url')).toBe(true);
  });

  it('does not fire for placeholder URLs', () => {
    const findings = scan(
      '.env.example',
      'DATABASE_URL=postgres://user:placeholder@localhost:5432/db',
    );
    expect(findings.some((f) => f.ruleId === 'vh-secret-db-url')).toBe(false);
  });
});

describe('secret-regex: JWT hardcoded', () => {
  it('fires on jwt.sign with hardcoded secret', () => {
    const src = `jwt.sign(payload, "my-super-secret-key-123")`;
    const findings = scan('auth.ts', src);
    expect(findings.some((f) => f.ruleId === 'vh-secret-jwt-hardcoded')).toBe(
      true,
    );
  });

  it('does not fire on env var passing', () => {
    const src = `jwt.sign(payload, process.env.JWT_SECRET)`;
    const findings = scan('auth.ts', src);
    expect(findings.some((f) => f.ruleId === 'vh-secret-jwt-hardcoded')).toBe(
      false,
    );
  });
});

describe('secret-regex: NEXT_PUBLIC risky names', () => {
  it('fires on NEXT_PUBLIC_STRIPE_SECRET', () => {
    const findings = scan(
      '.env.local',
      'NEXT_PUBLIC_STRIPE_SECRET=sk_live_xxx',
    );
    expect(
      findings.some((f) => f.ruleId === 'vh-secret-next-public-risky'),
    ).toBe(true);
  });

  it('does not fire on NEXT_PUBLIC_STRIPE_PK (publishable)', () => {
    const findings = scan('.env.local', 'NEXT_PUBLIC_STRIPE_PK=pk_live_abc');
    expect(
      findings.some((f) => f.ruleId === 'vh-secret-next-public-risky'),
    ).toBe(false);
  });
});

describe('secret-regex: Slack', () => {
  it('fires on xoxb- bot token', () => {
    const tok = 'xoxb-' + 'abcDEF123456-xyzXYZ'.repeat(2);
    const findings = scan('slack.ts', `token="${tok}"`);
    expect(findings.some((f) => f.ruleId === 'vh-secret-slack-token')).toBe(
      true,
    );
  });
});

describe('secret-regex: redaction + metadata', () => {
  it('redacts secret in snippet (never full value)', () => {
    const k = 'sk-proj-' + 'A1b2C3d4E5f6g7h8'.repeat(4);
    const findings = scan('app.ts', `const k="${k}"`);
    const f = findings.find((x) => x.ruleId === 'vh-secret-openai');
    expect(f?.snippet).toContain('…');
    expect(f?.snippet.length).toBeLessThan(k.length);
  });

  it('deduplicates same secret used twice in one file', () => {
    const k = 'sk-proj-' + 'A1b2C3d4E5f6g7h8'.repeat(4);
    const findings = scan('app.ts', `const a="${k}"; const b="${k}";`);
    const matches = findings.filter((f) => f.ruleId === 'vh-secret-openai');
    expect(matches).toHaveLength(1);
  });

  it('records line and column', () => {
    const k = 'ghp_' + 'A'.repeat(40);
    const src = `line1\nline2\nconst token = "${k}";`;
    const findings = scan('r.ts', src);
    const f = findings.find((x) => x.ruleId === 'vh-secret-github-pat');
    expect(f?.line).toBe(3);
  });
});

describe('secret-regex: Gemini / Google API key', () => {
  // AIzaSy prefix is split so GitHub push protection doesn't flag
  // these fixtures as real leaked Google API keys.
  const GEMINI_PREFIX = 'AI' + 'zaSy';

  // Body = 33 chars of [A-Za-z0-9_-] to match the regex exactly.
  const GEMINI_BODY = 'Abc123Def456Ghi789Jkl012Mno345Pqr';

  it('fires on AIzaSy-prefixed 39-char key', () => {
    const k = GEMINI_PREFIX + GEMINI_BODY;
    const findings = scan('app.ts', 'const k = "' + k + '";');
    expect(findings.some((f) => f.ruleId === 'vh-secret-google-api')).toBe(true);
  });

  it('does NOT fire on short AIzaSy string (wrong length)', () => {
    const k = GEMINI_PREFIX + 'tooShort';
    const findings = scan('app.ts', 'const k = "' + k + '";');
    expect(findings.some((f) => f.ruleId === 'vh-secret-google-api')).toBe(
      false,
    );
  });

  it('does NOT fire on placeholder key containing "your_"', () => {
    // "your_" is in PLACEHOLDER_MARKERS → disallowSubstrings filters it.
    const k = GEMINI_PREFIX + 'your_keyhereAbc123Def456Ghi789Jk';
    const findings = scan('app.ts', 'const k = "' + k + '";');
    expect(findings.some((f) => f.ruleId === 'vh-secret-google-api')).toBe(
      false,
    );
  });
});

describe('secret-regex: 0.0.8 providers', () => {
  describe('vh-secret-sendgrid', () => {
    // SG. prefix is split across two literals so GitHub push protection
    // doesn't flag these test fixtures as leaked SendGrid keys. Runtime
    // value is identical to a real one for the regex engine.
    const SG_PREFIX = 'S' + 'G.';
    const SG_BODY =
      'AbCdEfGhIjKlMnOpQrStUv.9kL3pRsT-vWxYzAbCdEfGhIjKlMnOpQrStUv0123456';

    it('fires on well-formed SG key', () => {
      const k = SG_PREFIX + SG_BODY;
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-sendgrid')).toBe(
        true,
      );
    });
    it('does NOT fire on FOOSG.xxx.yyy embedded in longer alnum prefix', () => {
      const k = 'FOO' + SG_PREFIX + SG_BODY;
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-sendgrid')).toBe(
        false,
      );
    });
  });

  describe('vh-secret-notion', () => {
    // Same split-prefix trick as SendGrid above — keeps GitHub push
    // protection from classifying these fixtures as leaked tokens.
    const NOTION_SECRET_PREFIX = 'sec' + 'ret_';
    const NOTION_NTN_PREFIX = 'nt' + 'n_';
    const NOTION_REAL_BODY = 'EU4YCe95o5NfyN9fHQ2KYtGlCWVuL5YzEY0GtQUYZV0';

    it('fires on mixed-case + digit realistic token', () => {
      const k = NOTION_SECRET_PREFIX + NOTION_REAL_BODY;
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-notion')).toBe(true);
    });
    it('fires on ntn_ prefix variant', () => {
      const k = NOTION_NTN_PREFIX + NOTION_REAL_BODY;
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-notion')).toBe(true);
    });
    it('does NOT fire on all-lowercase 43-char identifier (FP guard)', () => {
      const k =
        NOTION_SECRET_PREFIX + 'abcdefghijklmnopqrstuvwxyz0123456789abcdefg';
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-notion')).toBe(
        false,
      );
    });
    it('does NOT fire on all-uppercase + digit (missing lowercase)', () => {
      const k =
        NOTION_SECRET_PREFIX + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFG';
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-notion')).toBe(
        false,
      );
    });
    it('does NOT fire on mixed case but no digits', () => {
      const k =
        NOTION_SECRET_PREFIX + 'ABCDEFGHIJKLMNOPabcdefghijklmnopABCDEFGHI';
      const findings = scan('app.ts', 'const k = "' + k + '";');
      expect(findings.some((f) => f.ruleId === 'vh-secret-notion')).toBe(
        false,
      );
    });
  });

  describe('vh-secret-twilio-auth-token', () => {
    it('fires when SID AND assignment-style token both present', () => {
      const sid = 'AC' + 'a'.repeat(32);
      const token = 'b'.repeat(32);
      const src =
        'const sid = "' + sid + '";\nconst auth_token = "' + token + '";';
      const findings = scan('app.ts', src);
      expect(
        findings.some((f) => f.ruleId === 'vh-secret-twilio-auth-token'),
      ).toBe(true);
    });
    it('does NOT fire when SID is present but no assignment-style token', () => {
      const sid = 'AC' + 'a'.repeat(32);
      const findings = scan('app.ts', 'const sid = "' + sid + '";');
      expect(
        findings.some((f) => f.ruleId === 'vh-secret-twilio-auth-token'),
      ).toBe(false);
    });
    it('does NOT fire when token is assigned but no SID anywhere', () => {
      const token = 'b'.repeat(32);
      const findings = scan(
        'app.ts',
        'const auth_token = "' + token + '";',
      );
      expect(
        findings.some((f) => f.ruleId === 'vh-secret-twilio-auth-token'),
      ).toBe(false);
    });
  });
});
