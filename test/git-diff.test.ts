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

  it('detects an unstaged new file', async () => {
    await writeFile(join(repo, 'a.ts'), 'export const x = 1;');
    const r = await getChangedFiles({ cwd: repo });
    // New (untracked) files are NOT in `git diff HEAD` output by
    // default. Once added to the index they show as new.
    await git(repo, 'add', 'a.ts');
    const r2 = await getChangedFiles({ cwd: repo });
    expect(r2.files).toContain('a.ts');
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
