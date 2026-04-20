import type {
  VerifierKind,
  VerifierOptions,
  VerifyResult,
} from './index.js';
import { defaultTimeoutSignal, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'slack';

export async function verifySlack(
  token: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const timeout = defaultTimeoutSignal(opts);

  try {
    // auth.test echoes back the authenticated user/team when the token
    // is live; returns { ok: false, error: 'invalid_auth' } otherwise.
    let resp: Response;
    try {
      resp = await fetchFn('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/x-www-form-urlencoded',
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

    if (!resp.ok) {
      return {
        kind: KIND,
        status: 'unknown',
        httpStatus: resp.status,
        error: `unexpected status ${resp.status}`,
        checkedAt,
      };
    }

    let body: { ok?: boolean; team?: string; user?: string; error?: string };
    try {
      body = (await resp.json()) as typeof body;
    } catch {
      return {
        kind: KIND,
        status: 'unknown',
        httpStatus: resp.status,
        error: 'invalid JSON response',
        checkedAt,
      };
    }

    if (body.ok === true) {
      return {
        kind: KIND,
        status: 'live',
        httpStatus: resp.status,
        info: {
          team: body.team ?? undefined,
          user: body.user ?? undefined,
        },
        checkedAt,
      };
    }
    if (body.error === 'invalid_auth' || body.error === 'token_revoked') {
      return {
        kind: KIND,
        status: 'revoked',
        httpStatus: resp.status,
        info: { slackError: body.error },
        checkedAt,
      };
    }
    return {
      kind: KIND,
      status: 'unknown',
      httpStatus: resp.status,
      error: body.error ?? 'unexpected response',
      checkedAt,
    };
  } finally {
    timeout.clear();
  }
}
