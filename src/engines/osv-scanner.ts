import type { FileContext, Finding, Severity } from '../core/types.js';
import { offsetToLineCol } from '../core/types.js';

interface OsvQuery {
  package: { name: string; ecosystem: 'npm' };
  version: string;
}

export interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{ type: string; score: string }>;
  references?: Array<{ type: string; url: string }>;
  database_specific?: { severity?: string };
}

interface OsvResponse {
  results: Array<{ vulns?: OsvVulnerability[] }>;
}

export interface OsvScanOptions {
  endpoint?: string;
  signal?: AbortSignal;
  maxBatchSize?: number;
  fetchImpl?: typeof fetch;
}

interface LockPackage {
  name: string;
  version: string;
}

interface PackageLockJson {
  lockfileVersion?: number;
  packages?: Record<string, { version?: string }>;
  dependencies?: Record<string, { version?: string; dependencies?: unknown }>;
}

function extractFromPackageLock(content: string): LockPackage[] {
  let parsed: PackageLockJson;
  try {
    parsed = JSON.parse(content) as PackageLockJson;
  } catch {
    return [];
  }
  const out: LockPackage[] = [];
  const seen = new Set<string>();

  if (parsed.packages) {
    for (const [key, info] of Object.entries(parsed.packages)) {
      if (!key || key === '') continue;
      const name = key.replace(/^node_modules\//, '').split('/node_modules/').pop();
      if (!name) continue;
      if (!info.version) continue;
      const id = `${name}@${info.version}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ name, version: info.version });
    }
  } else if (parsed.dependencies) {
    const walk = (tree: Record<string, { version?: string; dependencies?: unknown }>) => {
      for (const [name, info] of Object.entries(tree)) {
        if (info.version) {
          const id = `${name}@${info.version}`;
          if (!seen.has(id)) {
            seen.add(id);
            out.push({ name, version: info.version });
          }
        }
        if (
          info.dependencies &&
          typeof info.dependencies === 'object' &&
          info.dependencies !== null
        ) {
          walk(info.dependencies as Record<string, { version?: string; dependencies?: unknown }>);
        }
      }
    };
    walk(parsed.dependencies);
  }
  return out;
}

function osvSeverityFor(v: OsvVulnerability): Severity {
  const hint = v.database_specific?.severity?.toUpperCase() ?? '';
  if (hint.includes('CRITICAL')) return 'critical';
  if (hint.includes('HIGH')) return 'high';
  if (hint.includes('MODERATE') || hint.includes('MEDIUM')) return 'medium';
  if (hint.includes('LOW')) return 'low';

  const cvss = v.severity?.find((s) => s.type.startsWith('CVSS'));
  if (cvss) {
    // Vector strings start with "CVSS:3.1/..." so we use the LAST numeric
    // token in the string to avoid treating the CVSS version as the score.
    const allNumbers = cvss.score.match(/\d+(?:\.\d+)?/g);
    const last = allNumbers?.[allNumbers.length - 1];
    const score = last ? parseFloat(last) : NaN;
    if (!Number.isNaN(score)) {
      if (score >= 9.0) return 'critical';
      if (score >= 7.0) return 'high';
      if (score >= 4.0) return 'medium';
      return 'low';
    }
  }
  return 'medium';
}

function firstUrl(v: OsvVulnerability): string | undefined {
  const raw = v.references?.find(
    (r) => r.type === 'ADVISORY' || r.type === 'WEB',
  )?.url;
  if (!raw) return undefined;
  // OSV references come from a third-party API. Only trust https:// —
  // a compromised mirror could otherwise inject `javascript:` or
  // `data:` schemes that would become a clickable XSS vector in any
  // downstream tool that renders the `remediation` field as HTML
  // without its own sanitisation.
  if (!/^https:\/\//i.test(raw)) return undefined;
  return raw;
}

/**
 * OSV entries sometimes populate summary, sometimes details, sometimes
 * neither. Details can be a few paragraphs of markdown — we truncate
 * to the first sentence / 180 chars for the message line.
 */
function bestSummary(v: OsvVulnerability): string {
  if (v.summary && v.summary.trim().length > 0) {
    return v.summary.trim();
  }
  if (v.details && v.details.trim().length > 0) {
    const first = v.details
      .trim()
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)[0];
    if (first && first.length <= 180) return first;
    return v.details.trim().slice(0, 180) + '…';
  }
  return 'vulnerability details unavailable';
}

const DEFAULT_TIMEOUT_MS = 10_000;

function withDefaultTimeout(signal?: AbortSignal): AbortSignal {
  if (signal) return signal;
  return AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
}

async function queryOsv(
  packages: LockPackage[],
  opts: OsvScanOptions,
): Promise<Map<string, OsvVulnerability[]>> {
  const endpoint = opts.endpoint ?? 'https://api.osv.dev/v1/querybatch';
  const fetchFn = opts.fetchImpl ?? fetch;
  // OSV caps batches at 1000 but 500 keeps payloads under ~80KB and
  // each batch small enough that a single timeout doesn't punish
  // users with lots of deps.
  const batchSize = opts.maxBatchSize ?? 500;
  const result = new Map<string, OsvVulnerability[]>();

  for (let i = 0; i < packages.length; i += batchSize) {
    const chunk = packages.slice(i, i + batchSize);
    const queries: OsvQuery[] = chunk.map((p) => ({
      package: { name: p.name, ecosystem: 'npm' },
      version: p.version,
    }));

    let resp: Response;
    try {
      resp = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queries }),
        signal: withDefaultTimeout(opts.signal),
      });
    } catch {
      // timeout / DNS / offline — skip this batch, continue with next
      continue;
    }
    if (!resp.ok) continue;

    let body: OsvResponse;
    try {
      body = (await resp.json()) as OsvResponse;
    } catch {
      continue;
    }

    for (let j = 0; j < chunk.length; j++) {
      const vulns = body.results[j]?.vulns ?? [];
      if (vulns.length === 0) continue;
      const pkg = chunk[j];
      if (!pkg) continue;
      result.set(`${pkg.name}@${pkg.version}`, vulns);
    }
  }
  return result;
}

export async function scanOsv(
  lockfile: FileContext,
  opts: OsvScanOptions = {},
): Promise<Finding[]> {
  const packages = extractFromPackageLock(lockfile.content);
  if (packages.length === 0) return [];

  const vulnsByPackage = await queryOsv(packages, opts);
  const findings: Finding[] = [];

  for (const pkg of packages) {
    const key = `${pkg.name}@${pkg.version}`;
    const vulns = vulnsByPackage.get(key);
    if (!vulns || vulns.length === 0) continue;

    const offset = lockfile.content.indexOf(`"${pkg.name}"`);
    const { line, column } =
      offset >= 0 ? offsetToLineCol(lockfile.content, offset) : { line: 1, column: 1 };

    for (const v of vulns) {
      const severity = osvSeverityFor(v);
      const url = firstUrl(v);
      const summary = bestSummary(v);
      findings.push({
        ruleId: `vh-dep-cve-${v.id}`,
        severity,
        category: 'dependency',
        file: lockfile.path,
        line,
        column,
        snippet: key,
        message: `${pkg.name}@${pkg.version}: ${v.id} — ${summary}`,
        remediation: url
          ? `Details: ${url}. Upgrade ${pkg.name} to a patched version.`
          : `Upgrade ${pkg.name} to a version without ${v.id}.`,
        metadata: {
          cveId: v.id,
          package: pkg.name,
          version: pkg.version,
          summary,
          advisoryUrl: url,
        },
      });
    }
  }
  return findings;
}

// Exposed for tests only
export const __internal = { extractFromPackageLock };
