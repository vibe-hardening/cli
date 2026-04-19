import type {
  VerifierKind,
  VerifierOptions,
  VerifyResult,
} from './index.js';
import { defaultTimeoutSignal, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'stripe';

export async function verifyStripe(
  key: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();

  // Stripe uses HTTP Basic auth: key as username, empty password.
  const authHeader = `Basic ${Buffer.from(`${key}:`).toString('base64')}`;

  // `/v1/charges?limit=1` is a cheap read; does not create anything.
  let resp: Response;
  try {
    resp = await fetchFn('https://api.stripe.com/v1/charges?limit=1', {
      method: 'GET',
      headers: {
        authorization: authHeader,
        'user-agent': USER_AGENT,
        'stripe-version': '2024-06-20',
      },
      signal: defaultTimeoutSignal(opts),
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
    return {
      kind: KIND,
      status: 'live',
      httpStatus: 200,
      info: { mode: key.includes('_live_') ? 'live' : 'test' },
      checkedAt,
    };
  }
  if (resp.status === 401) {
    return {
      kind: KIND,
      status: 'revoked',
      httpStatus: 401,
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
}
