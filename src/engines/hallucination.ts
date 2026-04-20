import type { FileContext, Finding } from '../core/types.js';
import { offsetToLineCol } from '../core/types.js';

export interface HallucinationOptions {
  registry?: string;
  downloadsEndpoint?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  concurrency?: number;
  minWeeklyDownloads?: number;
  /**
   * Called once with a summary if npm registry lookups failed for one
   * or more packages. Without this hook the engine treats each failed
   * fetch as `unknown` and silently returns zero findings on offline /
   * restricted networks — giving users a false sense of safety.
   */
  onWarning?: (message: string) => void;
}

interface DependencyRef {
  name: string;
  spec: string;
  offset: number;
}

function extractDependencies(content: string): DependencyRef[] {
  let parsed: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const out: DependencyRef[] = [];
  const seen = new Set<string>();

  const collect = (group: Record<string, string> | undefined) => {
    if (!group) return;
    for (const [name, spec] of Object.entries(group)) {
      if (seen.has(name)) continue;
      seen.add(name);
      // Local / git / workspace / file refs aren't from npm — skip
      if (
        spec.startsWith('file:') ||
        spec.startsWith('link:') ||
        spec.startsWith('git') ||
        spec.startsWith('workspace:') ||
        spec.startsWith('http')
      ) {
        continue;
      }
      // Locate the dependency name in the raw text for line/col
      const searchToken = `"${name}"`;
      const offset = content.indexOf(searchToken);
      out.push({ name, spec, offset: offset >= 0 ? offset : 0 });
    }
  };

  collect(parsed.dependencies);
  collect(parsed.devDependencies);
  collect(parsed.peerDependencies);
  collect(parsed.optionalDependencies);
  return out;
}

type CheckResult =
  | { status: 'unknown'; reason: 'fetch-failed' }
  | { status: 'missing' }
  | { status: 'low-downloads'; weekly: number }
  | { status: 'ok' };

const DEFAULT_TIMEOUT_MS = 10_000;

function withDefaultTimeout(signal?: AbortSignal): AbortSignal {
  if (signal) return signal;
  return AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
}

/**
 * npm package names are restricted to chars that are URL-safe in path
 * segments (lowercase letters, digits, '-', '_', '.', plus '@' / '/' in
 * scoped names). RFC 3986 allows '@' and '/' unescaped in path segments,
 * and the npm downloads endpoint *requires* the literal '@scope/name'
 * form — encoding as '%40scope%2Fname' returns 404 and silently
 * disables low-trust detection for the highest-risk namespace.
 */
function packagePath(name: string): string {
  // Reject anything outside the allowed npm name charset rather than
  // blindly encoding it — an invalid-looking name is already a finding
  // worth flagging upstream.
  if (!/^@?[a-z0-9._~-]+(\/[a-z0-9._~-]+)?$/i.test(name)) {
    return encodeURIComponent(name);
  }
  return name;
}

async function checkSingle(
  name: string,
  opts: HallucinationOptions,
): Promise<CheckResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const registry = opts.registry ?? 'https://registry.npmjs.org/';
  const downloadsEndpoint =
    opts.downloadsEndpoint ?? 'https://api.npmjs.org/downloads/point/last-week/';
  const minDownloads = opts.minWeeklyDownloads ?? 50;
  const path = packagePath(name);

  let resp: Response;
  try {
    resp = await fetchFn(`${registry}${path}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: withDefaultTimeout(opts.signal),
    });
  } catch {
    return { status: 'unknown', reason: 'fetch-failed' };
  }
  if (resp.status === 404) return { status: 'missing' };
  if (!resp.ok) return { status: 'unknown', reason: 'fetch-failed' };

  let dlResp: Response;
  try {
    dlResp = await fetchFn(`${downloadsEndpoint}${path}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: withDefaultTimeout(opts.signal),
    });
  } catch {
    return { status: 'ok' };
  }
  if (!dlResp.ok) return { status: 'ok' };

  let body: { downloads?: number };
  try {
    body = (await dlResp.json()) as { downloads?: number };
  } catch {
    return { status: 'ok' };
  }
  const weekly = body.downloads ?? 0;
  if (weekly < minDownloads) return { status: 'low-downloads', weekly };
  return { status: 'ok' };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function scanHallucinated(
  packageJson: FileContext,
  opts: HallucinationOptions = {},
): Promise<Finding[]> {
  const deps = extractDependencies(packageJson.content);
  if (deps.length === 0) return [];

  const concurrency = opts.concurrency ?? 4;
  const checks = await runWithConcurrency(deps, concurrency, async (d) => ({
    dep: d,
    result: await checkSingle(d.name, opts),
  }));

  // Surface a single warning if a substantial fraction of the registry
  // lookups failed — otherwise a user on a restricted network gets a
  // clean "no hallucinated packages" report that actually means "we
  // couldn't check at all."
  const fetchFailed = checks.filter(
    (c) =>
      c.result.status === 'unknown' && c.result.reason === 'fetch-failed',
  ).length;
  if (fetchFailed > 0 && opts.onWarning) {
    opts.onWarning(
      `hallucinated-package check: npm registry lookups failed for ${fetchFailed}/${checks.length} dependencies. Slopsquat results may be incomplete.`,
    );
  }

  const findings: Finding[] = [];
  for (const { dep, result } of checks) {
    if (result.status === 'ok' || result.status === 'unknown') continue;

    const { line, column } =
      dep.offset > 0
        ? offsetToLineCol(packageJson.content, dep.offset)
        : { line: 1, column: 1 };

    if (result.status === 'missing') {
      findings.push({
        ruleId: 'vh-llm-hallucinated-package',
        severity: 'high',
        category: 'llm',
        file: packageJson.path,
        line,
        column,
        snippet: `"${dep.name}": "${dep.spec}"`,
        message: `Package "${dep.name}" does not exist on npm — possible LLM hallucination / slopsquat target`,
        remediation: `Verify the intended package name. Slopsquatters often register these to ship malware. Remove the entry and run npm install to confirm.`,
        metadata: {
          package: dep.name,
          spec: dep.spec,
          reason: 'not-found-on-npm',
        },
      });
    } else if (result.status === 'low-downloads') {
      findings.push({
        ruleId: 'vh-llm-low-trust-package',
        severity: 'medium',
        category: 'llm',
        file: packageJson.path,
        line,
        column,
        snippet: `"${dep.name}": "${dep.spec}"`,
        message: `Package "${dep.name}" exists but only ${result.weekly} weekly downloads — verify it is the intended package`,
        remediation: `Check the npm page, author, and GitHub repo. Low-download packages are a common supply-chain risk vector.`,
        metadata: {
          package: dep.name,
          spec: dep.spec,
          weeklyDownloads: result.weekly,
          reason: 'low-downloads',
        },
      });
    }
  }
  return findings;
}

export const __internal = { extractDependencies };
