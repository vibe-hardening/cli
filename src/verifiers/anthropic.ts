import type {
  VerifierKind,
  VerifierOptions,
  VerifyResult,
} from './index.js';
import { defaultTimeoutSignal, drainResponse, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'anthropic';

export async function verifyAnthropic(
  key: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const timeout = defaultTimeoutSignal(opts);
  let resp: Response | undefined;

  try {
    // `/v1/models` is read-only and does not consume tokens.
    try {
      resp = await fetchFn('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
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
