import { describe, it, expect } from 'vitest';
import {
  createPrelude,
  preludeHeader,
  milestone,
  preludeFooter,
  RULE_COUNT_LINE,
} from '../src/reporters/scan-prelude.js';
import { SECRET_RULES } from '../src/rules/secrets.js';
import { INJECTION_RULES } from '../src/rules/injection.js';
import { NETWORK_RULES } from '../src/rules/network.js';
import { AUTH_PATTERN_RULES } from '../src/rules/auth-patterns.js';
import { PYTHON_INJECTION_RULES } from '../src/rules/python-injection.js';
import { PYTHON_AUTH_RULES } from '../src/rules/python-auth.js';

function captureBuffer(): [(s: string) => void, () => string] {
  const chunks: string[] = [];
  return [(s) => chunks.push(s), () => chunks.join('')];
}

// Strip ANSI colours so assertions don't depend on picocolors'
// current escape sequences. Same helper pattern used by other tests.
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('scan-prelude: enabled mode', () => {
  it('preludeHeader prints the brutalist status banner', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: true, writer: write });
    preludeHeader(ctx);
    expect(stripAnsi(getText())).toContain('▲ VH-001');
    expect(stripAnsi(getText())).toContain('INITIATING SCAN');
  });

  it('milestone prints a timestamped indented line', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: true, writer: write });
    milestone(ctx, 'indexed 412 files');
    const out = stripAnsi(getText());
    expect(out).toMatch(/\[\d+\.\d{3}\]/);
    expect(out).toContain('indexed 412 files');
  });

  it('milestone timestamp is zero-padded to 7 chars for scans < 1000 s', () => {
    // Regression guard for the padStart width bug: previous version
    // padded to 6, so `[60.000]` (6 chars) and `[600.000]` (7 chars)
    // did not align with `[0.001]` padded as `[00.001]`. The new
    // format is `[000.001]..[999.999]`.
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: true, writer: write });
    milestone(ctx, 'x');
    const out = stripAnsi(getText());
    const m = /\[(\d+\.\d{3})\]/.exec(out);
    expect(m, 'timestamp tag missing').toBeTruthy();
    // For a fresh context, elapsed is <1s, so body is 5 chars ("0.000")
    // and padding makes the total 7 chars.
    expect(m![1]!.length).toBe(7);
  });

  it('preludeFooter includes the findings count', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: true, writer: write });
    preludeFooter(ctx, 3);
    expect(stripAnsi(getText())).toContain('SCAN COMPLETE');
    expect(stripAnsi(getText())).toContain('3 findings');
  });

  it('preludeFooter says "clean" when zero findings', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: true, writer: write });
    preludeFooter(ctx, 0);
    expect(stripAnsi(getText())).toContain('clean');
  });
});

describe('scan-prelude: disabled mode (no TTY / json / html / --output)', () => {
  it('preludeHeader is a no-op', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: false, writer: write });
    preludeHeader(ctx);
    expect(getText()).toBe('');
  });

  it('milestone is a no-op', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: false, writer: write });
    milestone(ctx, 'hello');
    expect(getText()).toBe('');
  });

  it('preludeFooter is a no-op', () => {
    const [write, getText] = captureBuffer();
    const ctx = createPrelude({ enabled: false, writer: write });
    preludeFooter(ctx, 5);
    expect(getText()).toBe('');
  });
});

describe('scan-prelude: RULE_COUNT_LINE accuracy', () => {
  it('matches actual total rule count + engine count', () => {
    // If someone adds rules without bumping the prelude string the
    // landing page number + CLI milestone will drift apart. This
    // test catches that. 5 engine-level rules:
    //   auth-missing-ast, rls-diff, jwt-payload (supabase service_role),
    //   hallucination (missing + low-trust = 2), osv-scanner (dynamic)
    const ENGINE_RULES = 5;
    const total =
      SECRET_RULES.length +
      INJECTION_RULES.length +
      NETWORK_RULES.length +
      AUTH_PATTERN_RULES.length +
      PYTHON_INJECTION_RULES.length +
      PYTHON_AUTH_RULES.length +
      ENGINE_RULES;

    // Extract the number from `loading N rules · M categories`
    const m = /loading (\d+) rules/.exec(RULE_COUNT_LINE);
    expect(m, 'RULE_COUNT_LINE format changed').toBeTruthy();
    const advertised = Number(m![1]);
    expect(
      advertised,
      `RULE_COUNT_LINE says ${advertised} but actual rule count is ${total}. Update scan-prelude.ts.`,
    ).toBe(total);
  });
});
