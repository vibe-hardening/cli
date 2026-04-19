import fg from 'fast-glob';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import type { FileContext } from './types.js';

export const DEFAULT_IGNORES: string[] = [
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

export interface WalkOptions {
  cwd: string;
  include?: string[];
  ignore?: string[];
}

export async function walk(opts: WalkOptions): Promise<FileContext[]> {
  const cwd = resolve(opts.cwd);
  const entries = await fg(opts.include ?? DEFAULT_INCLUDE, {
    cwd,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: opts.ignore ?? DEFAULT_IGNORES,
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
