import type { VerifierKind, VerifierOptions, VerifyResult } from './index.js';
import { defaultTimeoutSignal, drainResponse, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'gemini';

export async function verifyGemini(
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
    // Google distinguishes key-invalid (400 API_KEY_INVALID) from
    // key-scope-restricted (403 / 401). 400 is a hard revoke signal.
    if (resp.status === 400) {
      return {
        kind: KIND,
        status: 'revoked',
        httpStatus: 400,
        checkedAt,
      };
    }
    // 403 often means "this Google API key exists and is valid, but
    // doesn't have the Generative Language API enabled" — the key
    // could still be live for Maps / YouTube / Cloud. Report
    // 'unknown' instead of a misleading 'revoked'.
    if (resp.status === 403 || resp.status === 401) {
      return {
        kind: KIND,
        status: 'unknown',
        httpStatus: resp.status,
        error:
          'key may be valid but restricted to non-Gemini Google APIs (Maps / YouTube / Cloud)',
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
