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

const PATTERN_RULES = [
  ...SECRET_RULES,
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

function runEnginesOnFile(file: FileContext): Finding[] {
  const out: Finding[] = [];

  if (hasExt(file.path, ['sql'])) {
    out.push(...scanRlsDisabled(file));
  }

  out.push(...scanJwtServiceRole(file));

  if (hasExt(file.path, ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'])) {
    out.push(...scanSecrets(file, PATTERN_RULES));
    if (isApiRouteHandler(file.path)) {
      try {
        out.push(...scanAuthMissing(file.path, file.content));
      } catch {
        // AST parse errors on JSX-heavy non-router files — skip
      }
    }
  }

  if (
    hasExt(file.path, ['env', 'yml', 'yaml', 'toml', 'json', 'md']) ||
    isEnvFile(file.path) ||
    isDockerFile(file.path)
  ) {
    out.push(...scanSecrets(file, PATTERN_RULES));
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
  return (
    files.find((f) => f.path === 'package-lock.json') ??
    files.find((f) => f.path.endsWith('/package-lock.json'))
  );
}

export async function runScan(opts: ScanOptions): Promise<ScanReport> {
  const start = Date.now();
  const minRank = SEVERITY_RANK[opts.minSeverity ?? 'info'];

  const platform = detectPlatform(opts.files);

  const all: Finding[] = [];
  for (const file of opts.files) {
    const findings = runEnginesOnFile(file);
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
