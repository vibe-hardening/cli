import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ChangedFilesOptions {
  cwd: string;
  /**
   * Optional base ref for 3-dot diff (e.g. `main`, `origin/main`).
   * When set, computes changes on the current branch since the
   * merge-base with `base` — typical for PR scans. When omitted,
   * uses uncommitted + staged changes vs HEAD — typical for local
   * pre-commit / pre-push.
   */
  base?: string;
  /** Override the git binary path (mostly for tests). */
  gitBin?: string;
}

export interface ChangedFilesResult {
  /** Relative paths from repo root, suitable for matching FileContext.path. */
  files: string[];
  /** Human-readable description of the diff range. */
  ref: string;
}

/**
 * Returns the list of files changed in the working tree (or against
 * a given base ref). Used by `--changed-only` to limit the scan to
 * files that actually changed in this PR / commit, instead of
 * re-scanning the entire repo every time.
 *
 * Throws if the directory isn't a git repo. Returns `{files: []}`
 * if the diff command fails for other reasons (e.g. brand-new repo
 * with no commits) — caller decides how to surface that.
 */
export async function getChangedFiles(
  opts: ChangedFilesOptions,
): Promise<ChangedFilesResult> {
  const { cwd, base } = opts;
  const gitBin = opts.gitBin ?? 'git';

  // Verify we're inside a git work tree before issuing diff. Without
  // this guard, `git diff` would fail with a confusing fatal error
  // and we'd surface it as if the diff itself broke.
  try {
    await execFileAsync(gitBin, ['rev-parse', '--is-inside-work-tree'], {
      cwd,
    });
  } catch {
    throw new Error(
      'not a git repository — `--changed-only` requires git tracking. Initialise with `git init` or run from inside a tracked repo.',
    );
  }

  // --diff-filter=ACMR: include Added, Copied, Modified, Renamed.
  // Exclude D (deleted — nothing to scan) and T (type change, usually
  // a symlink shuffle — also nothing to scan).
  const ref = base ? `${base}...HEAD` : 'HEAD';
  const args = ['diff', '--name-only', '--diff-filter=ACMR', ref];

  let stdout = '';
  try {
    const result = await execFileAsync(gitBin, args, { cwd });
    stdout = result.stdout;
  } catch {
    // Brand-new repo with no commits, or invalid base ref — return
    // empty rather than crashing. Caller will see 0 changed files
    // and can decide whether to fall back to a full scan.
    return { files: [], ref };
  }

  // Normalise paths to forward slashes so they match FileContext.path
  // which the walker emits with `/` separators on every platform.
  const fromDiff = stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\\/g, '/'));

  // Local-mode (no base ref) also includes untracked files. A vibe
  // coder writes a new file with a hardcoded key and runs `vh scan
  // --changed-only` BEFORE staging — `git diff HEAD` misses the file
  // and the secret slips through. `git ls-files --others
  // --exclude-standard` lists untracked files honouring .gitignore,
  // .git/info/exclude, and the user's global gitignore so we don't
  // blast through node_modules / build artefacts.
  //
  // PR-mode (base ref set) deliberately skips this — that mode is
  // "what's committed on this branch since merge-base" and untracked
  // working-tree state on a CI runner must not leak into the diff.
  let untracked: string[] = [];
  if (!base) {
    try {
      const result = await execFileAsync(
        gitBin,
        ['ls-files', '--others', '--exclude-standard'],
        { cwd },
      );
      untracked = result.stdout
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/\\/g, '/'));
    } catch {
      // Same fallback as the diff path — empty list rather than
      // crashing the whole scan if ls-files happens to fail.
    }
  }

  // Set-union deduplicates the rare race where a path shows up in
  // both lists (e.g. a partial-stage edge case).
  const files = Array.from(new Set([...fromDiff, ...untracked]));

  return { files, ref };
}
