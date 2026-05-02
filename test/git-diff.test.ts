import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getChangedFiles } from '../src/core/git-diff.js';

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

describe('git-diff: changed file detection', () => {
  let repo: string;

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'vh-git-diff-'));
    await git(repo, 'init', '-q', '-b', 'main');
    await git(repo, 'config', 'user.email', 'test@test');
    await git(repo, 'config', 'user.name', 'test');
    await git(repo, 'commit', '--allow-empty', '-q', '-m', 'init');
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it('throws a clear error when run outside a git repo', async () => {
    const nonGit = await mkdtemp(join(tmpdir(), 'vh-not-git-'));
    try {
      await expect(getChangedFiles({ cwd: nonGit })).rejects.toThrow(
        /not a git repository/,
      );
    } finally {
      await rm(nonGit, { recursive: true, force: true });
    }
  });

  it('returns empty list when working tree is clean', async () => {
    const r = await getChangedFiles({ cwd: repo });
    expect(r.files).toEqual([]);
    expect(r.ref).toBe('HEAD');
  });

  it('detects an untracked new file (no staging required)', async () => {
    // Critical for security tooling: a vibe coder writes a file with a
    // hardcoded key, runs `vh scan --changed-only` BEFORE staging, and
    // expects the secret to be flagged. Plain `git diff HEAD` misses
    // untracked files — we union with `git ls-files --others`.
    await writeFile(join(repo, 'a.ts'), 'export const x = 1;');
    const r = await getChangedFiles({ cwd: repo });
    expect(r.files).toContain('a.ts');
  });

  it('still detects the file once staged', async () => {
    await writeFile(join(repo, 'b.ts'), 'export const x = 1;');
    await git(repo, 'add', 'b.ts');
    const r = await getChangedFiles({ cwd: repo });
    expect(r.files).toContain('b.ts');
  });

  it('does not duplicate when a file is both untracked-then-staged', async () => {
    // Edge: race-y filesystem state where both `git diff` and
    // `git ls-files --others` could surface the same path. The result
    // must remain a deduped set.
    await writeFile(join(repo, 'c.ts'), 'export const x = 1;');
    await git(repo, 'add', 'c.ts');
    const r = await getChangedFiles({ cwd: repo });
    const occurrences = r.files.filter((f) => f === 'c.ts').length;
    expect(occurrences).toBe(1);
  });

  it('respects .gitignore when listing untracked files', async () => {
    // `--exclude-standard` covers .gitignore + .git/info/exclude +
    // user's global gitignore. Without it we would surface
    // node_modules / build artefacts and re-scan the world.
    await writeFile(join(repo, '.gitignore'), 'ignored.ts\n');
    await git(repo, 'add', '.gitignore');
    await git(repo, 'commit', '-q', '-m', 'add gitignore');
    await writeFile(join(repo, 'ignored.ts'), 'secret');
    await writeFile(join(repo, 'visible.ts'), 'fine');
    const r = await getChangedFiles({ cwd: repo });
    expect(r.files).toContain('visible.ts');
    expect(r.files).not.toContain('ignored.ts');
  });

  it('detects modified tracked files', async () => {
    await writeFile(join(repo, 'tracked.ts'), 'old\n');
    await git(repo, 'add', 'tracked.ts');
    await git(repo, 'commit', '-q', '-m', 'add tracked');
    await writeFile(join(repo, 'tracked.ts'), 'new\n');
    const r = await getChangedFiles({ cwd: repo });
    expect(r.files).toEqual(['tracked.ts']);
  });

  it('excludes deleted files (--diff-filter=ACMR)', async () => {
    await writeFile(join(repo, 'gone.ts'), 'x');
    await git(repo, 'add', 'gone.ts');
    await git(repo, 'commit', '-q', '-m', 'add gone');
    await rm(join(repo, 'gone.ts'));
    const r = await getChangedFiles({ cwd: repo });
    expect(r.files).not.toContain('gone.ts');
  });

  it('supports a base ref (PR-style 3-dot diff)', async () => {
    await writeFile(join(repo, 'on-main.ts'), 'main');
    await git(repo, 'add', 'on-main.ts');
    await git(repo, 'commit', '-q', '-m', 'on main');
    await git(repo, 'checkout', '-q', '-b', 'feature');
    await writeFile(join(repo, 'feature.ts'), 'feature');
    await git(repo, 'add', 'feature.ts');
    await git(repo, 'commit', '-q', '-m', 'feature');

    const r = await getChangedFiles({ cwd: repo, base: 'main' });
    expect(r.files).toContain('feature.ts');
    expect(r.files).not.toContain('on-main.ts');
    expect(r.ref).toBe('main...HEAD');
  });

  it('base-ref mode does NOT include untracked working-tree files', async () => {
    // PR-mode is "what's committed on this branch since merge-base" —
    // working-tree garbage (incl. unrelated untracked files in the
    // checkout) must not bleed into the diff. Otherwise a CI runner's
    // local junk would show up as PR changes.
    await writeFile(join(repo, 'on-main2.ts'), 'main');
    await git(repo, 'add', 'on-main2.ts');
    await git(repo, 'commit', '-q', '-m', 'on main 2');
    await git(repo, 'checkout', '-q', '-b', 'pr-branch');
    await writeFile(join(repo, 'committed.ts'), 'pr');
    await git(repo, 'add', 'committed.ts');
    await git(repo, 'commit', '-q', '-m', 'pr commit');

    // Add an untracked file AFTER the commits — must NOT appear.
    await writeFile(join(repo, 'untracked-junk.ts'), 'junk');

    const r = await getChangedFiles({ cwd: repo, base: 'main' });
    expect(r.files).toContain('committed.ts');
    expect(r.files).not.toContain('untracked-junk.ts');
  });

  it('normalises Windows-style backslashes in paths to forward slashes', async () => {
    // Git on Windows can emit `nested\file.ts` depending on config.
    // The walker emits paths with forward slashes, so the diff
    // result must too — otherwise the Set lookup misses entirely.
    await writeFile(join(repo, 'a.ts'), 'a');
    await git(repo, 'add', 'a.ts');
    const r = await getChangedFiles({ cwd: repo });
    for (const f of r.files) {
      expect(f).not.toMatch(/\\/);
    }
  });
});
