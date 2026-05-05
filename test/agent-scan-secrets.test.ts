import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAgentScan } from '../src/agent-scan/runner.js';

/**
 * End-to-end test for rule A (secrets) running against a synthesised
 * agent install. We construct fake `~/.openclaw/`, `~/.hermes/`, and
 * `~/.claude/` trees inside a tmpdir, then point `runAgentScan` at
 * that tmpdir as the home root.
 *
 * Uses real OpenAI / Anthropic / GitHub key shapes that the v1
 * SECRET_RULES regex will match — but with random middle bytes that
 * don't contain any PLACEHOLDER_MARKER substring (so they don't get
 * filtered as test fixtures). These are NOT real keys.
 */

let fakeHome: string;

// Shapes that match v1 SECRET_RULES. None of these contain
// `your_`/`placeholder`/`changeme`/`xxxxxxxx`/`<your`/`your-key`/
// `yourkeyhere` (the PLACEHOLDER_MARKERS list in src/rules/secrets.ts),
// so they're not filtered out as obvious examples.
const FAKE_OPENAI_KEY =
  'sk-proj-Tc8aNm3LKuWqVJ0HbDpZ4r6Y2fGsXh1nE5oI7yBkQv9MaCwSdRtPlNgUeFxOiHjZkLmNbCdEf';
const FAKE_GITHUB_PAT = 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';

async function writeFileEnsuringDir(path: string, content: string) {
  const { dirname } = await import('node:path');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

/**
 * fast-glob returns forward-slash paths on every OS. Tests construct
 * expected paths with `node:path.join` which uses native separators
 * (`\` on Windows). Normalise both sides to forward slashes so the
 * comparison is OS-portable.
 */
function fwd(p: string): string {
  return p.split('\\').join('/');
}

beforeEach(async () => {
  fakeHome = join(
    tmpdir(),
    `vh-agent-secrets-${Date.now()}-${Math.random()}`,
  );
  await mkdir(fakeHome, { recursive: true });
});

afterEach(async () => {
  await rm(fakeHome, { recursive: true, force: true });
});

describe('agent scan rule A — secrets', () => {
  it('detects an OpenAI key inside a SKILL.md body', async () => {
    const skillPath = join(
      fakeHome,
      '.openclaw',
      'workspace',
      'skills',
      'email',
      'SKILL.md',
    );
    await writeFileEnsuringDir(
      skillPath,
      `---
name: email-helper
description: Send emails on user's behalf
version: 1.0.0
---

When the user asks, call OpenAI with key: ${FAKE_OPENAI_KEY}
`,
    );

    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });

    expect(result.agentsDetected.map((a) => a.id)).toContain('openclaw');
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    const openaiFinding = result.findings.find(
      (f) => f.ruleId === 'vh-secret-openai',
    );
    expect(openaiFinding).toBeDefined();
    expect(fwd(openaiFinding?.file ?? '')).toBe(fwd(skillPath));
    expect(openaiFinding?.severity).toBe('high'); // critical → high in agent scan
    expect(openaiFinding?.category).toBe('secret');
  });

  it("detects a key in Hermes's .env (where Hermes actually stores secrets)", async () => {
    const envPath = join(fakeHome, '.hermes', '.env');
    await writeFileEnsuringDir(
      envPath,
      `# Hermes secrets
HERMES_OPENROUTER_API_KEY=${FAKE_OPENAI_KEY}
HERMES_TELEGRAM_BOT_TOKEN=hermes-token-here
`,
    );

    // Need at least one path inside ~/.hermes/ for the dir to be
    // detected — .env alone counts because the parent dir is what
    // detectAgents() stats.
    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });

    expect(result.agentsDetected.map((a) => a.id)).toContain('hermes');
    const hermesAgent = result.agentsDetected.find((a) => a.id === 'hermes');
    expect(fwd(hermesAgent?.envPath ?? '')).toBe(fwd(envPath));

    const finding = result.findings.find(
      (f) => f.ruleId === 'vh-secret-openai' && fwd(f.file) === fwd(envPath),
    );
    expect(finding).toBeDefined();
  });

  it('detects a GitHub PAT in OpenClaw comms (Telegram/Slack/Discord configs)', async () => {
    const commsPath = join(
      fakeHome,
      '.openclaw',
      'workspace',
      'comms',
      'github.json',
    );
    await writeFileEnsuringDir(
      commsPath,
      JSON.stringify(
        {
          provider: 'github',
          token: FAKE_GITHUB_PAT,
        },
        null,
        2,
      ),
    );

    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });

    const finding = result.findings.find(
      (f) =>
        f.ruleId === 'vh-secret-github-pat' && fwd(f.file) === fwd(commsPath),
    );
    expect(finding).toBeDefined();
    expect(finding?.snippet).toContain('ghp_');
  });

  it('reports zero findings when no agents are installed', async () => {
    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });
    expect(result.agentsDetected).toEqual([]);
    expect(result.findings).toEqual([]);
    expect(result.filesScanned).toBe(0);
  });

  it('reports zero findings on a clean install (agent dir exists, no secrets)', async () => {
    const skillPath = join(
      fakeHome,
      '.claude',
      'skills',
      'helper',
      'SKILL.md',
    );
    await writeFileEnsuringDir(
      skillPath,
      `---
name: helper
description: Generic helper
---

This skill answers questions. Uses process.env.OPENAI_API_KEY for auth.
`,
    );

    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });

    expect(result.agentsDetected.map((a) => a.id)).toContain('claude-code');
    expect(result.findings).toEqual([]);
    expect(result.filesScanned).toBeGreaterThanOrEqual(1);
  });

  it('does not double-report the same secret value', async () => {
    // Same key appears twice in the same file — secret-regex's
    // dedupe set is per-pattern-per-file, so we should see exactly
    // one finding for this key, not two.
    const skillPath = join(
      fakeHome,
      '.claude',
      'skills',
      'dupe',
      'SKILL.md',
    );
    await writeFileEnsuringDir(
      skillPath,
      `---
name: dupe
description: dupe
---

First mention: ${FAKE_OPENAI_KEY}
Second mention: ${FAKE_OPENAI_KEY}
`,
    );

    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });
    const openaiFindings = result.findings.filter(
      (f) => f.ruleId === 'vh-secret-openai',
    );
    expect(openaiFindings).toHaveLength(1);
  });

  it('aggregates findings across multiple agents in one scan', async () => {
    await writeFileEnsuringDir(
      join(fakeHome, '.openclaw', 'workspace', 'skills', 'a', 'SKILL.md'),
      `---
name: a
description: a
---
key: ${FAKE_OPENAI_KEY}
`,
    );
    await writeFileEnsuringDir(
      join(fakeHome, '.hermes', '.env'),
      `HERMES_KEY=${FAKE_GITHUB_PAT}\n`,
    );
    await writeFileEnsuringDir(
      join(fakeHome, '.claude', 'skills', 'b', 'SKILL.md'),
      `---
name: b
description: b
---
nothing here
`,
    );

    const result = await runAgentScan({ cwd: fakeHome, home: fakeHome });

    expect(
      result.agentsDetected.map((a) => a.id).sort(),
    ).toEqual(['claude-code', 'hermes', 'openclaw']);

    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    expect(
      result.findings.some((f) => f.ruleId === 'vh-secret-openai'),
    ).toBe(true);
    expect(
      result.findings.some((f) => f.ruleId === 'vh-secret-github-pat'),
    ).toBe(true);
  });
});
