import type { OsvVulnerability } from './osv-scanner.js';

const OSV_VULN_ENDPOINT = 'https://api.osv.dev/v1/vulns';

export interface OsvFetchOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  /**
   * Per-call timeout. Default 5000ms — `vh explain` is interactive
   * and shouldn't block the prompt longer than that. On timeout we
   * fall back to the static doc text rather than blocking the user.
   */
  timeoutMs?: number;
}

/**
 * Fetch a single OSV.dev advisory by ID. Returns null on any error
 * (offline, 404, malformed JSON, timeout) so callers can degrade
 * gracefully to the static `vh explain` block.
 *
 * Distinct from `osv-scanner.ts` which uses the *batch* endpoint
 * during scan to look up many (name, version) pairs at once. This
 * is the per-advisory-ID lookup used by `vh explain vh-dep-cve-X`
 * to enrich the docs with live advisory metadata.
 */
export async function fetchOsvAdvisory(
  advisoryId: string,
  opts: OsvFetchOptions = {},
): Promise<OsvVulnerability | null> {
  const endpoint = opts.endpoint ?? OSV_VULN_ENDPOINT;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 5000;

  // path-encode for IDs that contain `/` or other URL-meaningful
  // characters (some PYSEC / GO advisories do).
  const url = `${endpoint}/${encodeURIComponent(advisoryId)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as OsvVulnerability;
    return json;
  } catch {
    // Offline / DNS failure / timeout / parse error — caller falls
    // back to static doc text.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pick the most informative severity score from the OSV record.
 * Prefer CVSS_V3 / CVSS_V4 scores over the older formats. Return
 * the raw vector string (e.g. "CVSS:3.1/AV:N/AC:L/...") which the
 * caller can render as-is or parse for the base-score component.
 */
export function pickSeverity(
  v: OsvVulnerability,
): { type: string; score: string } | null {
  if (!v.severity || v.severity.length === 0) return null;
  const preferred = v.severity.find(
    (s) => s.type === 'CVSS_V4' || s.type === 'CVSS_V3',
  );
  return preferred ?? v.severity[0] ?? null;
}

/**
 * Extract a human-readable severity label from the OSV record.
 *
 * OSV.dev's `severity[].score` field is the CVSS vector string
 * (e.g. `CVSS:3.1/AV:N/...`), not a numeric score — computing the
 * base score from the vector would require shipping a CVSS impl,
 * which is overkill for an explain block. Instead we look for an
 * explicit string label in `database_specific.severity` (GHSA,
 * Go advisories, and several DBs ship one), falling back to the
 * vector's type tag (`CVSS_V3`, `CVSS_V4`).
 */
export function severityLabel(v: OsvVulnerability): string | null {
  const dbLabel = v.database_specific?.severity;
  if (dbLabel) return dbLabel;
  const sev = pickSeverity(v);
  if (sev) return sev.type;
  return null;
}
