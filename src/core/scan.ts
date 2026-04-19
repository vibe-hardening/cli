import type { FileContext, Finding, Severity } from './types.js';
import { scanRlsDisabled } from '../engines/rls-diff.js';
import { scanJwtServiceRole } from '../engines/jwt-payload.js';
import { scanAuthMissing } from '../engines/auth-missing-ast.js';
import { scanSecrets } from '../engines/secret-regex.js';
import { SECRET_RULES } from '../rules/secrets.js';

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
}

export interface ScanOptions {
  files: FileContext[];
  minSeverity?: Severity;
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
  const isRoute =
    /(^|\/)app\/api\/.+\/route\.(ts|tsx|js|mjs|cjs)$/.test(p) ||
    /(^|\/)src\/app\/api\/.+\/route\.(ts|tsx|js|mjs|cjs)$/.test(p) ||
    /(^|\/)pages\/api\/.+\.(ts|tsx|js|mjs|cjs)$/.test(p) ||
    /(^|\/)src\/pages\/api\/.+\.(ts|tsx|js|mjs|cjs)$/.test(p);
  return isRoute;
}

function runEnginesOnFile(file: FileContext): Finding[] {
  const out: Finding[] = [];

  if (hasExt(file.path, ['sql'])) {
    out.push(...scanRlsDisabled(file));
  }

  out.push(...scanJwtServiceRole(file));

  if (hasExt(file.path, ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'])) {
    out.push(...scanSecrets(file, SECRET_RULES));
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
    out.push(...scanSecrets(file, SECRET_RULES));
  }

  return out;
}

function emptySummary(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

export async function runScan(opts: ScanOptions): Promise<ScanReport> {
  const start = Date.now();
  const minRank = SEVERITY_RANK[opts.minSeverity ?? 'info'];

  const all: Finding[] = [];
  for (const file of opts.files) {
    const findings = runEnginesOnFile(file);
    for (const f of findings) {
      if (SEVERITY_RANK[f.severity] < minRank) continue;
      all.push(f);
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
  };
}
