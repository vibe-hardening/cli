import type { FileContext, Finding, Severity } from './types.js';
import { scanRlsDisabled } from '../engines/rls-diff.js';
import { scanJwtServiceRole } from '../engines/jwt-payload.js';
import { scanAuthMissing } from '../engines/auth-missing-ast.js';
import { scanSecrets } from '../engines/secret-regex.js';
import { scanOsv } from '../engines/osv-scanner.js';
import { scanHallucinated } from '../engines/hallucination.js';
import { detectPlatform } from '../detectors/platform.js';
import type { PlatformFingerprint } from '../detectors/platform.js';
import { SECRET_RULES } from '../rules/secrets.js';
import { INJECTION_RULES } from '../rules/injection.js';
import { NETWORK_RULES } from '../rules/network.js';
import { AUTH_PATTERN_RULES } from '../rules/auth-patterns.js';

/**
 * Rules are partitioned so we can run them on the right files:
 *  - SECRET_RULES run on code + text (readme / yaml / env / json).
 *    Secrets get pasted everywhere, including README copy.
 *  - NON_SECRET_RULES (injection / network / auth) run ONLY on code.
 *    A README *describing* an SQL injection pattern must not fire.
 */
const NON_SECRET_RULES = [
  ...INJECTION_RULES,
  ...NETWORK_RULES,
  ...AUTH_PATTERN_RULES,
];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export interface ScanReport {
  findings: Finding[];
  summary: Record<Severity, number>;
  filesScanned: number;
  durationMs: number;
  platform: PlatformFingerprint;
}

export interface ScanOptions {
  files: FileContext[];
  minSeverity?: Severity;
  offline?: boolean;
  fetchImpl?: typeof fetch;
  /**
   * Include test files (`**​/test/**`, `*.test.*`, `*.spec.*`,
   * `__tests__/**`, `*.fixture.*`). Default false — test files usually
   * contain deliberate bad patterns used as fixtures.
   */
  includeTests?: boolean;
  /**
   * Include markdown/mdx files for non-secret pattern rules. Default
   * false — docs frequently *describe* security issues and trigger
   * false positives. Secret detection always runs on docs because
   * real API keys do get pasted into READMEs.
   */
  includeDocs?: boolean;
}

function hasExt(path: string, exts: string[]): boolean {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = path.slice(dot + 1).toLowerCase();
  return exts.includes(ext);
}

function isEnvFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  return name === '.env' || name.startsWith('.env.');
}

function isDockerFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  return name === 'dockerfile' || name.startsWith('dockerfile.');
}

function isApiRouteHandler(path: string): boolean {
  const p = path.toLowerCase();
  return (
    /(^|\/)app\/api\/.+\/route\.(ts|tsx|js|mjs|cjs)$/.test(p) ||
    /(^|\/)src\/app\/api\/.+\/route\.(ts|tsx|js|mjs|cjs)$/.test(p) ||
    /(^|\/)pages\/api\/.+\.(ts|tsx|js|mjs|cjs)$/.test(p) ||
    /(^|\/)src\/pages\/api\/.+\.(ts|tsx|js|mjs|cjs)$/.test(p)
  );
}

const IDE_INTERNAL_DIRS = [
  '.cursor/',
  '.claude/',
  '.bolt/',
  '.windsurf/',
  '.devin/',
  '.lovable/',
];

function isIdeInternal(path: string): boolean {
  return IDE_INTERNAL_DIRS.some(
    (dir) => path.startsWith(dir) || path.includes(`/${dir}`),
  );
}

const TEST_PATH_PATTERNS: RegExp[] = [
  /(^|\/)test\//i,
  /(^|\/)tests\//i,
  /(^|\/)__tests__\//i,
  /(^|\/)spec\//i,
  /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/i,
  /\.spec\.(ts|tsx|js|jsx|mjs|cjs)$/i,
  /\.fixture\.(ts|tsx|js|jsx|mjs|cjs)$/i,
  /(^|\/)fixtures?\//i,
];

function isTestFile(path: string): boolean {
  return TEST_PATH_PATTERNS.some((re) => re.test(path));
}

function isDocFile(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path);
}

/**
 * Files that define security rules or orchestrate scanning will
 * contain literal strings that match those rules (the rule file for
 * the 'use client + service_role' composite contains both strings;
 * scan.ts' own docstring mentions both while explaining the logic).
 * These self-references are not vulnerabilities.
 */
function isSecurityRuleDefinition(path: string): boolean {
  return (
    /(^|\/)src\/rules\//.test(path) ||
    /(^|\/)src\/engines\//.test(path) ||
    /(^|\/)src\/detectors\//.test(path) ||
    /(^|\/)src\/core\/scan\.(ts|js)$/.test(path) ||
    /(^|\/)src\/reporters\//.test(path)
  );
}

function runEnginesOnFile(
  file: FileContext,
  opts: { includeTests: boolean; includeDocs: boolean },
): Finding[] {
  const out: Finding[] = [];

  if (isIdeInternal(file.path)) return out;
  if (!opts.includeTests && isTestFile(file.path)) return out;
  if (isSecurityRuleDefinition(file.path)) return out;

  if (hasExt(file.path, ['sql'])) {
    out.push(...scanRlsDisabled(file));
  }

  out.push(...scanJwtServiceRole(file));

  const isCode = hasExt(file.path, [
    'ts',
    'tsx',
    'js',
    'jsx',
    'mjs',
    'cjs',
  ]);
  const isText =
    hasExt(file.path, ['env', 'yml', 'yaml', 'toml', 'json']) ||
    isEnvFile(file.path) ||
    isDockerFile(file.path);
  const isDoc = isDocFile(file.path);

  if (isCode) {
    out.push(...scanSecrets(file, SECRET_RULES));
    out.push(...scanSecrets(file, NON_SECRET_RULES));
    if (isApiRouteHandler(file.path)) {
      try {
        out.push(...scanAuthMissing(file.path, file.content));
      } catch {
        // AST parse errors on JSX-heavy non-router files — skip
      }
    }
  }

  if (isText) {
    out.push(...scanSecrets(file, SECRET_RULES));
  }

  if (isDoc) {
    // Secrets always scanned (people paste real keys into READMEs).
    out.push(...scanSecrets(file, SECRET_RULES));
    // Pattern rules (injection / network / auth) only when opted in —
    // docs describe vulnerabilities, they don't usually contain them.
    if (opts.includeDocs) {
      out.push(...scanSecrets(file, NON_SECRET_RULES));
    }
  }

  return out;
}

function emptySummary(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

function findPackageJson(files: FileContext[]): FileContext | undefined {
  return files.find(
    (f) => f.path === 'package.json' || f.path.endsWith('/package.json'),
  );
}

function findRootLockfile(files: FileContext[]): FileContext | undefined {
  // Only the repo-root lockfile is scanned. We skip nested monorepo
  // package-lock.json files to avoid duplicate CVE reports — a Phase 2
  // upgrade can surface per-workspace findings separately.
  return files.find((f) => f.path === 'package-lock.json');
}

export async function runScan(opts: ScanOptions): Promise<ScanReport> {
  const start = Date.now();
  const minRank = SEVERITY_RANK[opts.minSeverity ?? 'info'];
  const runOpts = {
    includeTests: opts.includeTests ?? false,
    includeDocs: opts.includeDocs ?? false,
  };

  const platform = detectPlatform(opts.files);

  const all: Finding[] = [];
  for (const file of opts.files) {
    const findings = runEnginesOnFile(file, runOpts);
    for (const f of findings) {
      if (SEVERITY_RANK[f.severity] < minRank) continue;
      all.push(f);
    }
  }

  if (!opts.offline) {
    const lockfile = findRootLockfile(opts.files);
    if (lockfile) {
      try {
        const osvFindings = await scanOsv(lockfile, { fetchImpl: opts.fetchImpl });
        for (const f of osvFindings) {
          if (SEVERITY_RANK[f.severity] >= minRank) all.push(f);
        }
      } catch {
        // network down / throttled — skip silently
      }
    }

    const pkg = findPackageJson(opts.files);
    if (pkg) {
      try {
        const hFindings = await scanHallucinated(pkg, { fetchImpl: opts.fetchImpl });
        for (const f of hFindings) {
          if (SEVERITY_RANK[f.severity] >= minRank) all.push(f);
        }
      } catch {
        // same
      }
    }
  }

  all.sort((a, b) => {
    const r = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (r !== 0) return r;
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    return a.line - b.line;
  });

  const summary = emptySummary();
  for (const f of all) summary[f.severity]++;

  return {
    findings: all,
    summary,
    filesScanned: opts.files.length,
    durationMs: Date.now() - start,
    platform,
  };
}
