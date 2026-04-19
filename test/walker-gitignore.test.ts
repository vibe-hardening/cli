import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { walk, __internal } from '../src/core/walker.js';

const { gitignoreLineToPatterns } = __internal;

describe('gitignoreLineToPatterns', () => {
  it('skips comments and blank lines', () => {
    expect(gitignoreLineToPatterns('# comment')).toEqual([]);
    expect(gitignoreLineToPatterns('   ')).toEqual([]);
    expect(gitignoreLineToPatterns('')).toEqual([]);
  });

  it('skips negation (! prefix) — we do not support un-ignore yet', () => {
    expect(gitignoreLineToPatterns('!dist/')).toEqual([]);
  });

  it('anchor-free file pattern matches anywhere', () => {
    expect(gitignoreLineToPatterns('*.log')).toEqual([
      '**/*.log',
      '**/*.log/**',
    ]);
  });

  it('trailing slash = directory-only, any depth', () => {
    expect(gitignoreLineToPatterns('venv/')).toEqual(['**/venv/**']);
  });

  it('leading slash = root-relative', () => {
    expect(gitignoreLineToPatterns('/dist')).toEqual(['dist', 'dist/**']);
  });

  it('leading slash + trailing slash = root-relative directory', () => {
    expect(gitignoreLineToPatterns('/build/')).toEqual(['build/**']);
  });
});

describe('walk respects .gitignore', () => {
  let root: string;

  beforeAll(async () => {
    root = join(tmpdir(), `vh-gitignore-test-${Date.now()}`);
    await mkdir(join(root, 'app'), { recursive: true });
    await mkdir(join(root, 'ignored'), { recursive: true });
    await writeFile(join(root, 'app', 'main.py'), 'DEBUG = True\n');
    await writeFile(join(root, 'ignored', 'leak.py'), 'DEBUG = True\n');
    await writeFile(
      join(root, '.gitignore'),
      '# test gitignore\nignored/\n*.tmp\n',
    );
    await writeFile(join(root, 'scratch.tmp'), 'DEBUG = True\n');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('default: respects .gitignore (ignored/ dir + *.tmp skipped)', async () => {
    const files = await walk({ cwd: root });
    const paths = files.map((f) => f.path);
    expect(paths).toContain('app/main.py');
    expect(paths).not.toContain('ignored/leak.py');
    expect(paths).not.toContain('scratch.tmp');
  });

  it('respectGitignore:false scans everything', async () => {
    const files = await walk({ cwd: root, respectGitignore: false });
    const paths = files.map((f) => f.path);
    expect(paths).toContain('app/main.py');
    expect(paths).toContain('ignored/leak.py');
    // scratch.tmp is not a default-include extension so still absent.
  });
});

describe('walk default-ignores Python venv + caches', () => {
  let root: string;

  beforeAll(async () => {
    root = join(tmpdir(), `vh-venv-test-${Date.now()}`);
    await mkdir(join(root, 'app'), { recursive: true });
    await mkdir(
      join(root, 'venv', 'lib', 'python3.11', 'site-packages', 'django'),
      { recursive: true },
    );
    await mkdir(join(root, '.venv'), { recursive: true });
    await mkdir(join(root, '__pycache__'), { recursive: true });
    await mkdir(join(root, '.pytest_cache'), { recursive: true });
    await writeFile(join(root, 'app', 'main.py'), 'DEBUG = True\n');
    await writeFile(
      join(root, 'venv', 'lib', 'python3.11', 'site-packages', 'django', 'conf.py'),
      'DEBUG = False\n',
    );
    await writeFile(join(root, '.venv', 'activate.py'), 'DEBUG = True\n');
    await writeFile(join(root, '__pycache__', 'main.cpython-311.pyc'), '');
    await writeFile(
      join(root, '.pytest_cache', 'CACHEDIR.tag'),
      'Signature: 8a477f597d28d172789f06886806bc55\n',
    );
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('skips venv / .venv / __pycache__ / .pytest_cache by default', async () => {
    const files = await walk({ cwd: root });
    const paths = files.map((f) => f.path);
    expect(paths).toContain('app/main.py');
    expect(paths.some((p) => p.includes('venv/'))).toBe(false);
    expect(paths.some((p) => p.includes('__pycache__'))).toBe(false);
    expect(paths.some((p) => p.includes('.pytest_cache'))).toBe(false);
  });
});
