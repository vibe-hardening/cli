import type { VerifierKind, VerifierOptions, VerifyResult } from './index.js';
import { defaultTimeoutSignal, drainResponse, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'twilio';

export async function verifyTwilio(
  token: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const timeout = defaultTimeoutSignal(opts);
  let resp: Response | undefined;

  // A Twilio Auth Token by itself doesn't identify an account — but
  // the enclosing rule captures the paired Account SID (`AC[0-9a-f]{32}`)
  // and stores both in the raw value as `SID:TOKEN`. We split back out
  // here for Basic auth. If the caller passes a bare token with no SID
  // prefix we fall back to the 'bearer master' auth which Twilio
  // accepts for some endpoints and otherwise errors — still safe.
  const [sidPart, tokenPart] = token.includes(':')
    ? token.split(':', 2)
    : ['', token];
  const sid = sidPart || 'AC' + '0'.repeat(32);
  const authHeader = `Basic ${Buffer.from(`${sid}:${tokenPart}`).toString('base64')}`;

  try {
    try {
      // `/Accounts/{SID}.json` is a read-only account metadata lookup.
      resp = await fetchFn(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`,
        {
          method: 'GET',
          headers: {
            authorization: authHeader,
            'user-agent': USER_AGENT,
          },
          signal: timeout.signal,
        },
      );
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
    if (resp.status === 404) {
      // A 404 on the account URL means the SID is wrong but auth may
      // still be valid — treat as unknown rather than claiming revoked.
      return {
        kind: KIND,
        status: 'unknown',
        httpStatus: 404,
        error: 'account SID not found (auth unverified)',
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
