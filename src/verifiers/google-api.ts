import type { VerifierKind, VerifierOptions, VerifyResult } from './index.js';
import { defaultTimeoutSignal, drainResponse, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'google-api';

/**
 * Verifies a Google API key (shared format `AIzaSy...` across every
 * Google service — Gemini, Maps, YouTube, Cloud, Vertex AI, etc.) by
 * hitting the Generative Language listing endpoint.
 *
 * HTTP status interpretation:
 *   200  → `live`    — key is valid AND has the Gemini API enabled
 *   400  → `revoked` — `API_KEY_INVALID` (hard failure signal)
 *   403  → body-dependent:
 *          · `error.status === 'API_KEY_INVALID'` → `revoked`
 *          · anything else (`PERMISSION_DENIED`, referrer-blocked,
 *            scope-restricted) → `unknown` — key may still be live
 *            for Maps / YouTube / Cloud, we can't tell from here.
 *   other → `unknown`
 */
export async function verifyGoogleApi(
  key: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const timeout = defaultTimeoutSignal(opts);
  let resp: Response | undefined;

  // Google API keys authenticate via query string, not header. The
  // dispatcher's CRLF/NUL guard runs before we get here so `key` is
  // already safe, but we still `encodeURIComponent` it belt-and-braces.
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    key,
  )}`;

  try {
    try {
      resp = await fetchFn(url, {
        method: 'GET',
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: timeout.signal,
      });
    } catch (e) {
      return {
        kind: KIND,
        status: 'unknown',
        error: e instanceof Error ? e.message : 'fetch failed',
        checkedAt,
      };
    }

    if (resp.status === 200) {
      return { kind: KIND, status: 'live', httpStatus: 200, checkedAt };
    }

    if (resp.status === 400) {
      return {
        kind: KIND,
        status: 'revoked',
        httpStatus: 400,
        checkedAt,
      };
    }

    // 403 is ambiguous on Google APIs — could be a genuinely invalid
    // key OR a scope-restricted one. Peek at the error.status field
    // to disambiguate; fall back to `unknown` if we can't parse.
    if (resp.status === 403 || resp.status === 401) {
      let errorStatus = '';
      try {
        const body = (await resp.clone().json()) as {
          error?: { status?: string };
        };
        errorStatus = body.error?.status ?? '';
      } catch {
        // JSON parse failed — treat as unknown (conservative).
      }

      if (errorStatus === 'API_KEY_INVALID') {
        return {
          kind: KIND,
          status: 'revoked',
          httpStatus: resp.status,
          info: { googleErrorStatus: errorStatus },
          checkedAt,
        };
      }

      return {
        kind: KIND,
        status: 'unknown',
        httpStatus: resp.status,
        info: errorStatus ? { googleErrorStatus: errorStatus } : undefined,
        error:
          'key may be valid but restricted to non-Gemini Google APIs (Maps / YouTube / Cloud) or blocked by referrer / IP policy',
        checkedAt,
      };
    }

    return {
      kind: KIND,
      status: 'unknown',
      httpStatus: resp.status,
      error: `unexpected status ${resp.status}`,
      checkedAt,
    };
  } finally {
    drainResponse(resp);
    timeout.clear();
  }
}
