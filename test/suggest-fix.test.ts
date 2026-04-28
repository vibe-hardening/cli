import { describe, it, expect } from 'vitest';
import {
  generateSuggestions,
  ENV_VAR_FOR_RULE,
} from '../src/fix/suggestions.js';
import { renderSuggestFix } from '../src/reporters/suggest-fix.js';
import { SECRET_RULES } from '../src/rules/secrets.js';
import type { FileContext, Finding } from '../src/core/types.js';

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('suggest-fix: ENV_VAR_FOR_RULE coverage', () => {
  it('includes an entry for every secret rule that ships with the engine', () => {
    // Cross-check: every rule in src/rules/secrets.ts that has
    // `category: 'secret'` should have a fix-suggestion mapping.
    // The `--roast` cross-check test follows the same pattern.
    const secretRuleIds = SECRET_RULES.filter(
      (r) => r.category === 'secret',
    ).map((r) => r.id);
    const missing = secretRuleIds.filter((id) => !(id in ENV_VAR_FOR_RULE));
    // Some secret rules deliberately have no fix mapping because the
    // remediation isn't "move to env var" (e.g. high-entropy generic
    // detection or NEXT_PUBLIC misuse — fix is to delete or rename
    // the variable). Document those:
    const intentionallyExcluded = new Set([
      'vh-secret-generic-high-entropy',
      'vh-secret-next-public-risky',
    ]);
    const reallyMissing = missing.filter((id) => !intentionallyExcluded.has(id));
    expect(
      reallyMissing,
      `secret rules missing a fix-suggestion env var: ${reallyMissing.join(', ')}`,
    ).toEqual([]);
  });

  it('every env var name follows UPPER_SNAKE_CASE convention', () => {
    for (const [rule, env] of Object.entries(ENV_VAR_FOR_RULE)) {
      expect(env, `${rule} → ${env}`).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});

describe('suggest-fix: generateSuggestions', () => {
  function makeFixture(line: string): {
    file: FileContext;
    finding: Finding;
  } {
    const content = `// header\n${line}\n// footer\n`;
    const file: FileContext = {
      path: 'app.ts',
      content,
    };
    // The secret in the line is the part inside the quotes. Find its
    // bounds so the test stays accurate even if I edit the input line.
    const quote = "'";
    const startInLine = line.indexOf(quote) + 1;
    const endInLine = line.indexOf(quote, startInLine);
    const secret = line.slice(startInLine, endInLine);
    const finding: Finding = {
      ruleId: 'vh-secret-openai',
      severity: 'critical',
      category: 'secret',
      file: 'app.ts',
      line: 2, // line is the second line (after // header)
      column: startInLine + 1, // 1-indexed
      snippet: 'redacted',
      message: 'OpenAI key',
      remediation: 'rotate',
      metadata: { length: secret.length },
    };
    return { file, finding };
  }

  it('replaces the secret literal with process.env.OPENAI_API_KEY', () => {
    const { file, finding } = makeFixture(
      "const k = 'sk-proj-FakeKey1234567890ABCDEFGHIJklmnopqrstuv';",
    );
    const out = generateSuggestions([finding], [file]);
    expect(out).toHaveLength(1);
    expect(out[0]!.newText).toBe(
      "const k = process.env.OPENAI_API_KEY;",
    );
    expect(out[0]!.envVarName).toBe('OPENAI_API_KEY');
    expect(out[0]!.line).toBe(2);
  });

  it('returns no suggestion for rules with no env var mapping', () => {
    const { file, finding } = makeFixture(
      "const x = 'something else';",
    );
    finding.ruleId = 'vh-inj-sql-template';
    const out = generateSuggestions([finding], [file]);
    expect(out).toEqual([]);
  });

  it('returns no suggestion when metadata.length is missing', () => {
    const { file, finding } = makeFixture(
      "const k = 'sk-proj-x';",
    );
    finding.metadata = {};
    const out = generateSuggestions([finding], [file]);
    expect(out).toEqual([]);
  });

  it('returns no suggestion when file context not in scan', () => {
    const { finding } = makeFixture("const k = 'sk-proj-xxx';");
    const out = generateSuggestions([finding], []);
    expect(out).toEqual([]);
  });

  it('handles findings on multiple files', () => {
    const a = makeFixture("const a = 'sk-ant-keyA';");
    a.file.path = 'a.ts';
    a.finding.file = 'a.ts';
    a.finding.ruleId = 'vh-secret-anthropic';
    const b = makeFixture("const b = 'sk_live_keyB';");
    b.file.path = 'b.ts';
    b.finding.file = 'b.ts';
    b.finding.ruleId = 'vh-secret-stripe';
    const out = generateSuggestions(
      [a.finding, b.finding],
      [a.file, b.file],
    );
    expect(out).toHaveLength(2);
    expect(out.map((s) => s.envVarName).sort()).toEqual([
      'ANTHROPIC_API_KEY',
      'STRIPE_SECRET_KEY',
    ]);
  });
});

describe('suggest-fix: renderSuggestFix', () => {
  it('returns empty string when no suggestions', () => {
    expect(renderSuggestFix([])).toBe('');
  });

  it('groups suggestions by file in output', () => {
    const out = stripAnsi(
      renderSuggestFix([
        {
          ruleId: 'vh-secret-openai',
          file: 'app.ts',
          line: 12,
          oldText: "const k = 'sk-proj-xxx';",
          newText: 'const k = process.env.OPENAI_API_KEY;',
          envVarName: 'OPENAI_API_KEY',
        },
        {
          ruleId: 'vh-secret-stripe',
          file: 'app.ts',
          line: 14,
          oldText: "const s = 'sk_live_xxx';",
          newText: 'const s = process.env.STRIPE_SECRET_KEY;',
          envVarName: 'STRIPE_SECRET_KEY',
        },
      ]),
    );
    expect(out).toContain('SUGGESTED FIXES');
    expect(out).toContain('app.ts');
    // Both findings should appear under one app.ts heading.
    expect(out.match(/app\.ts/g)?.length).toBe(1);
    expect(out).toContain('OPENAI_API_KEY');
    expect(out).toContain('STRIPE_SECRET_KEY');
  });

  it('appends a deduplicated .env.example block at the bottom', () => {
    const out = stripAnsi(
      renderSuggestFix([
        {
          ruleId: 'vh-secret-openai',
          file: 'a.ts',
          line: 1,
          oldText: 'x',
          newText: 'y',
          envVarName: 'OPENAI_API_KEY',
        },
        {
          ruleId: 'vh-secret-openai',
          file: 'b.ts',
          line: 1,
          oldText: 'x',
          newText: 'y',
          envVarName: 'OPENAI_API_KEY',
        },
      ]),
    );
    // OPENAI_API_KEY should appear in the .env.example block exactly
    // once (deduped via Set).
    const matches = out.match(/OPENAI_API_KEY=/g);
    expect(matches?.length).toBe(1);
  });
});
