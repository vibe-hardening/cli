import type { VerifierKind, VerifierOptions, VerifyResult } from './index.js';
import { defaultTimeoutSignal, drainResponse, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'notion';

export async function verifyNotion(
  token: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const timeout = defaultTimeoutSignal(opts);
  let resp: Response | undefined;

  try {
    try {
      // `/v1/users/me` is a read-only identity endpoint — no pages or
      // databases touched.
      resp = await fetchFn('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
          'notion-version': '2022-06-28',
          'user-agent': USER_AGENT,
        },
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
    if (resp.status === 401 || resp.status === 403) {
      return {
        kind: KIND,
        status: 'revoked',
        httpStatus: resp.status,
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
