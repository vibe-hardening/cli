import { describe, it, expect } from 'vitest';
import { applySuppressions, __test } from '../src/core/suppression.js';
import type { Finding, FileContext } from '../src/core/types.js';

const { parseDirectives } = __test;

function file(path: string, content: string): FileContext {
  return { path, content };
}

function finding(file: string, line: number, ruleId: string): Finding {
  return {
    file,
    line,
    column: 1,
    ruleId,
    severity: 'high',
    category: 'secret',
    snippet: '',
    message: '',
  };
}

describe('inline disable directive parsing', () => {
  it('detects bare disable-next-line', () => {
    const d = parseDirectives('// vibe-hardening-disable-next-line\nbad code');
    expect(d).toHaveLength(1);
    expect(d[0]?.lineAffected).toBe(2);
    expect(d[0]?.ruleIds).toBe('all');
  });

  it('detects disable-next-line with rule id', () => {
    const d = parseDirectives(
      '// vibe-hardening-disable-next-line vh-secret-openai\nkey',
    );
    expect(d[0]?.ruleIds).toEqual(['vh-secret-openai']);
  });

  it('detects comma-separated rule ids', () => {
    const d = parseDirectives(
      '// vibe-hardening-disable-next-line vh-secret-openai, vh-cors-wildcard-credentials',
    );
    expect(d[0]?.ruleIds).toEqual([
      'vh-secret-openai',
      'vh-cors-wildcard-credentials',
    ]);
  });

  it('detects wildcard rule id', () => {
    const d = parseDirectives('// vibe-hardening-disable-next-line vh-cors-*');
    expect(d[0]?.ruleIds).toEqual(['vh-cors-*']);
  });

  it('accepts /* block */ comment form', () => {
    const d = parseDirectives(
      '/* vibe-hardening-disable-next-line vh-secret-openai */\nfoo',
    );
    expect(d[0]?.ruleIds).toEqual(['vh-secret-openai']);
  });

  it('accepts # comment form (Python / YAML / bash)', () => {
    const d = parseDirectives(
      '# vibe-hardening-disable-next-line vh-py-django-debug-true\nDEBUG = True',
    );
    expect(d).toHaveLength(1);
    expect(d[0]?.ruleIds).toEqual(['vh-py-django-debug-true']);
  });

  it('accepts <!-- HTML/Markdown comment --> form', () => {
    const d = parseDirectives(
      '<!-- vibe-hardening-disable-next-line vh-secret-openai -->\nkey',
    );
    expect(d[0]?.ruleIds).toEqual(['vh-secret-openai']);
  });

  it('ignores non-directive comments', () => {
    expect(parseDirectives('// this is a regular comment')).toHaveLength(0);
  });
});

describe('applySuppressions', () => {
  it('suppresses all findings on next line with bare directive', () => {
    const files = [
      file('app.ts', '// vibe-hardening-disable-next-line\nbad-code\n'),
    ];
    const findings = [
      finding('app.ts', 2, 'vh-secret-openai'),
      finding('app.ts', 2, 'vh-cors-wildcard-credentials'),
    ];
    expect(applySuppressions(files, findings)).toHaveLength(0);
  });

  it('suppresses only the specified rule id', () => {
    const files = [
      file(
        'app.ts',
        '// vibe-hardening-disable-next-line vh-secret-openai\nbad-code\n',
      ),
    ];
    const findings = [
      finding('app.ts', 2, 'vh-secret-openai'),
      finding('app.ts', 2, 'vh-cors-wildcard-credentials'),
    ];
    const after = applySuppressions(files, findings);
    expect(after).toHaveLength(1);
    expect(after[0]?.ruleId).toBe('vh-cors-wildcard-credentials');
  });

  it('supports wildcard rule id matching', () => {
    const files = [
      file(
        'app.ts',
        '// vibe-hardening-disable-next-line vh-cors-*\nbad-code\n',
      ),
    ];
    const findings = [
      finding('app.ts', 2, 'vh-cors-wildcard-credentials'),
      finding('app.ts', 2, 'vh-cors-reflect-origin'),
      finding('app.ts', 2, 'vh-secret-openai'),
    ];
    const after = applySuppressions(files, findings);
    expect(after).toHaveLength(1);
    expect(after[0]?.ruleId).toBe('vh-secret-openai');
  });

  it('only suppresses on the immediately next line', () => {
    const files = [
      file(
        'app.ts',
        '// vibe-hardening-disable-next-line\nbad-on-line-2\nbad-on-line-3\n',
      ),
    ];
    const findings = [
      finding('app.ts', 2, 'vh-any'),
      finding('app.ts', 3, 'vh-any'),
    ];
    const after = applySuppressions(files, findings);
    expect(after).toHaveLength(1);
    expect(after[0]?.line).toBe(3);
  });

  it('does not apply directives from other files', () => {
    const files = [
      file('app.ts', '// vibe-hardening-disable-next-line\nx\n'),
      file('other.ts', 'no directives here\n'),
    ];
    const findings = [finding('other.ts', 2, 'vh-any')];
    expect(applySuppressions(files, findings)).toHaveLength(1);
  });
});
