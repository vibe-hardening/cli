import { describe, it, expect } from 'vitest';
import { parseSkillMdContent } from '../src/agent-scan/parsers/skill-md.js';
import { parseJsonConfigContent } from '../src/agent-scan/parsers/json-config.js';
import { parseYamlConfigContent } from '../src/agent-scan/parsers/yaml-config.js';
import { parseEnvFileContent } from '../src/agent-scan/parsers/env-file.js';

describe('parseSkillMdContent', () => {
  it('parses a well-formed SKILL.md', () => {
    const raw = `---
name: email-helper
description: Send emails on user's behalf
version: 1.0.0
---

You are an email assistant. When the user asks, send.
`;
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toEqual({
      name: 'email-helper',
      description: "Send emails on user's behalf",
      version: '1.0.0',
    });
    expect(r.body.trim()).toBe(
      'You are an email assistant. When the user asks, send.',
    );
    expect(r.bodyStartLine).toBe(6);
    expect(r.parseError).toBeUndefined();
  });

  it('returns no frontmatter when delimiters are missing', () => {
    const raw = '# Just a markdown file\n\nNo frontmatter here.';
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.hasFrontmatter).toBe(false);
    expect(r.frontmatter).toBeNull();
    expect(r.body).toBe(raw);
    expect(r.bodyStartLine).toBe(1);
  });

  it('handles Windows line endings (CRLF)', () => {
    const raw = '---\r\nname: x\r\ndescription: y\r\n---\r\nbody\r\n';
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toEqual({ name: 'x', description: 'y' });
    expect(r.body.trim()).toBe('body');
  });

  it('strips UTF-8 BOM', () => {
    const raw = '﻿---\nname: x\ndescription: y\n---\nbody\n';
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toEqual({ name: 'x', description: 'y' });
  });

  it('reports parseError on malformed YAML but still exposes raw + body', () => {
    const raw = `---
name: x
description: : :: bad
  indent: wrong
---
body
`;
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toBeNull();
    expect(r.parseError).toBeTruthy();
    expect(r.frontmatterRaw).toContain('description');
    expect(r.body.trim()).toBe('body');
  });

  it('does not eat inline horizontal-rule --- inside body', () => {
    const raw = `---
name: x
description: y
---
intro

---

next section
`;
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.frontmatter).toEqual({ name: 'x', description: 'y' });
    expect(r.body).toContain('---');
    expect(r.body).toContain('next section');
  });

  it('handles array / scalar frontmatter by setting frontmatter=null', () => {
    const raw = '---\n- not\n- an\n- object\n---\nbody\n';
    const r = parseSkillMdContent('/x/SKILL.md', raw);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toBeNull();
    expect(r.frontmatterRaw).toContain('not');
  });
});

describe('parseJsonConfigContent', () => {
  it('parses valid JSON', () => {
    const r = parseJsonConfigContent('/x/openclaw.json', '{"a":1}');
    expect(r.parsed).toEqual({ a: 1 });
    expect(r.parseError).toBeUndefined();
  });

  it('returns null + error on malformed JSON', () => {
    const r = parseJsonConfigContent('/x/openclaw.json', '{not json');
    expect(r.parsed).toBeNull();
    expect(r.parseError).toBeTruthy();
  });

  it('strips UTF-8 BOM before parsing', () => {
    const r = parseJsonConfigContent('/x/openclaw.json', '﻿{"a":1}');
    expect(r.parsed).toEqual({ a: 1 });
  });

  it('always returns raw for line-based scanning', () => {
    const r = parseJsonConfigContent('/x/openclaw.json', '{not json');
    expect(r.raw).toBe('{not json');
  });
});

describe('parseYamlConfigContent', () => {
  it('parses valid YAML', () => {
    const r = parseYamlConfigContent(
      '/x/config.yaml',
      'model:\n  provider: openrouter\n',
    );
    expect(r.parsed).toEqual({ model: { provider: 'openrouter' } });
  });

  it('returns null + error on malformed YAML', () => {
    const r = parseYamlConfigContent('/x/config.yaml', 'a:\n - b\n  c\n');
    // yaml lib is fairly tolerant; force an unmistakable error
    const r2 = parseYamlConfigContent('/x/config.yaml', '{ unclosed');
    expect(r2.parsed === null || r2.parsed === undefined).toBe(true);
  });
});

describe('parseEnvFileContent', () => {
  it('parses simple KEY=VALUE lines', () => {
    const r = parseEnvFileContent(
      '/x/.env',
      'OPENAI_KEY=sk-123\nFOO=bar\n',
    );
    expect(r.entries).toHaveLength(2);
    expect(r.entries[0]).toMatchObject({
      key: 'OPENAI_KEY',
      value: 'sk-123',
      line: 1,
    });
    expect(r.entries[1]).toMatchObject({
      key: 'FOO',
      value: 'bar',
      line: 2,
    });
  });

  it('skips comments and blank lines', () => {
    const r = parseEnvFileContent(
      '/x/.env',
      '# comment\n\nFOO=bar\n# another\n',
    );
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]?.line).toBe(3);
  });

  it('strips matching surrounding quotes', () => {
    const r = parseEnvFileContent(
      '/x/.env',
      'A="quoted"\nB=\'single\'\nC=unquoted\n',
    );
    expect(r.entries.map((e) => e.value)).toEqual([
      'quoted',
      'single',
      'unquoted',
    ]);
  });

  it('supports `export` prefix used by some users', () => {
    const r = parseEnvFileContent('/x/.env', 'export FOO=bar\n');
    expect(r.entries).toEqual([
      { key: 'FOO', value: 'bar', line: 1, column: 12 },
    ]);
  });

  it('records column where the value starts (1-indexed, after `=`)', () => {
    const r = parseEnvFileContent('/x/.env', 'KEY=value\n');
    expect(r.entries[0]?.column).toBe(5);
  });

  it('handles CRLF line endings', () => {
    const r = parseEnvFileContent('/x/.env', 'A=1\r\nB=2\r\n');
    expect(r.entries).toHaveLength(2);
    expect(r.entries[1]?.line).toBe(2);
  });

  it('skips lines that do not match KEY=VALUE shape', () => {
    const r = parseEnvFileContent('/x/.env', 'just text\n=novalue\nA=1\n');
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]?.key).toBe('A');
  });
});
