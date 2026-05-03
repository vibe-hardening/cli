import fg from 'fast-glob';
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import type { FileContext } from './types.js';

export const DEFAULT_IGNORES: string[] = [
  // Node
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.svelte-kit/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  // Lockfiles used to be ignored for size; OSV scanner now needs them.
  // pnpm/yarn parsing is a Phase 2 item, still skipped here.
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  // Python
  '**/venv/**',
  '**/.venv/**',
  '**/env/**',
  '**/.env-*/**',
  '**/__pycache__/**',
  '**/*.pyc',
  '**/*.pyo',
  '**/.tox/**',
  '**/.nox/**',
  '**/.pytest_cache/**',
  '**/.mypy_cache/**',
  '**/.ruff_cache/**',
  '**/.pyre_cache/**',
  '**/htmlcov/**',
  '**/*.egg-info/**',
  '**/site-packages/**',
  '**/Pipfile.lock',
  '**/poetry.lock',
  '**/uv.lock',
  // Binary / cache subdirs inside AI IDE folders — platform detector
  // only needs presence of the top-level folder, not content.
  '**/.cursor/storage/**',
  '**/.cursor/extensions/**',
  '**/.claude/cache/**',
  '**/.claude/todos/**',
  '**/.bolt/cache/**',
  '**/.windsurf/cache/**',
  '**/.vibe-hardening/**',
];

export const DEFAULT_INCLUDE: string[] = [
  '**/*.{ts,tsx,js,jsx,mjs,cjs}',
  '**/*.py',
  '**/*.go',
  '**/*.rs',
  '**/*.{sql,prisma}',
  '**/*.{json,env,env.local,env.production,env.development}',
  '**/.env*',
  '**/*.{yml,yaml,toml}',
  '**/requirements*.txt',
  '**/pyproject.toml',
  '**/Pipfile',
  '**/Dockerfile*',
  '**/*.md',
  // AI IDE fingerprint files (content + existence both useful)
  '.cursorrules',
  '.cursor/**',
  '.claude/**',
  'CLAUDE.md',
  '.bolt/**',
  '.lovable/**',
  '.windsurf/**',
  '.windsurfrules',
  '.devin/**',
  'devin.yaml',
  '.replit',
  'replit.nix',
  'stackblitz.config.json',
  '.mcp.json',
  '.cursorindexingignore',
  'index.html',
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Convert a .gitignore line to a fast-glob compatible pattern.
 * Returns null for blank / comment / negation / unsupported lines.
 *
 * Rules (subset of full gitignore spec, covers 95%+ of real files):
 *   '# comment'        → skip
 *   '!pattern'         → skip (we don't support un-ignore yet)
 *   '/foo'             → 'foo/**' + 'foo' (root-relative)
 *   'foo/'             → '**\/foo/**' (directory-only)
 *   'foo'              → '**\/foo' + '**\/foo/**' (match anywhere)
 *   '*.log'            → '**\/*.log'
 */
function gitignoreLineToPatterns(raw: string): string[] {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return [];
  if (line.startsWith('!')) return []; // negation unsupported for now

  const isRooted = line.startsWith('/');
  const isDirOnly = line.endsWith('/');
  const stripped = line.replace(/^\//, '').replace(/\/$/, '');
  if (!stripped) return [];

  if (isRooted) {
    return isDirOnly
      ? [`${stripped}/**`]
      : [stripped, `${stripped}/**`];
  }
  if (isDirOnly) return [`**/${stripped}/**`];
  // Anchor-free pattern: match file OR directory at any depth.
  return [`**/${stripped}`, `**/${stripped}/**`];
}

async function readGitignorePatterns(root: string): Promise<string[]> {
  try {
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    const out: string[] = [];
    for (const line of content.split(/\r?\n/)) {
      out.push(...gitignoreLineToPatterns(line));
    }
    return out;
  } catch {
    return []; // no .gitignore is fine
  }
}

export interface WalkOptions {
  cwd: string;
  include?: string[];
  ignore?: string[];
  /**
   * If true (default), also merge patterns from .gitignore at the
   * scan root. Disable with --no-gitignore in the CLI.
   */
  respectGitignore?: boolean;
}

export async function walk(opts: WalkOptions): Promise<FileContext[]> {
  const target = resolve(opts.cwd);

  // If the user passed a single file path, scan just that file.
  // Otherwise treat it as a directory to glob through.
  let cwd = target;
  let patterns = opts.include ?? DEFAULT_INCLUDE;
  try {
    const s = await stat(target);
    if (s.isFile()) {
      cwd = dirname(target);
      patterns = [basename(target)];
    }
  } catch {
    // target does not exist — let fast-glob return empty
  }

  const baseIgnore = opts.ignore ?? DEFAULT_IGNORES;
  const respectGitignore = opts.respectGitignore ?? true;
  const gitignorePatterns = respectGitignore
    ? await readGitignorePatterns(cwd)
    : [];
  const ignore = [...baseIgnore, ...gitignorePatterns];

  const entries = await fg(patterns, {
    cwd,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore,
    suppressErrors: true,
    followSymbolicLinks: false,
  });

  const files: FileContext[] = [];
  for (const absPath of entries) {
    try {
      const s = await stat(absPath);
      if (s.size > MAX_FILE_BYTES) continue;
      const content = await readFile(absPath, 'utf8');
      files.push({
        path: relative(cwd, absPath).replace(/\\/g, '/'),
        content,
      });
    } catch {
      continue;
    }
  }
  return files;
}

export function filterByExtension(
  files: FileContext[],
  exts: string[],
): FileContext[] {
  const set = new Set(exts.map((e) => e.toLowerCase()));
  return files.filter((f) => {
    const dot = f.path.lastIndexOf('.');
    if (dot < 0) return false;
    return set.has(f.path.slice(dot + 1).toLowerCase());
  });
}

// Exposed for tests.
export const __internal = { gitignoreLineToPatterns, readGitignorePatterns };
