import type { VerifierKind, VerifierOptions, VerifyResult } from './index.js';
import { defaultTimeoutSignal, drainResponse, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'sendgrid';

export async function verifySendgrid(
  key: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const timeout = defaultTimeoutSignal(opts);
  let resp: Response | undefined;

  try {
    try {
      // `/v3/user/account` is a read-only account profile lookup; no
      // quota consumed.
      resp = await fetchFn('https://api.sendgrid.com/v3/user/account', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${key}`,
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
