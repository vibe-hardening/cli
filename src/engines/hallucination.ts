import type { FileContext, Finding } from '../core/types.js';
import { offsetToLineCol } from '../core/types.js';

export interface HallucinationOptions {
  registry?: string;
  downloadsEndpoint?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  concurrency?: number;
  minWeeklyDownloads?: number;
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

async function checkSingle(
  name: string,
  opts: HallucinationOptions,
): Promise<CheckResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const registry = opts.registry ?? 'https://registry.npmjs.org/';
  const downloadsEndpoint =
    opts.downloadsEndpoint ?? 'https://api.npmjs.org/downloads/point/last-week/';
  const minDownloads = opts.minWeeklyDownloads ?? 50;

  let resp: Response;
  try {
    resp = await fetchFn(`${registry}${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: opts.signal,
    });
  } catch {
    return { status: 'unknown', reason: 'fetch-failed' };
  }
  if (resp.status === 404) return { status: 'missing' };
  if (!resp.ok) return { status: 'unknown', reason: 'fetch-failed' };

  let dlResp: Response;
  try {
    dlResp = await fetchFn(`${downloadsEndpoint}${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: opts.signal,
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
