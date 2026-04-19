import type {
  VerifierKind,
  VerifierOptions,
  VerifyResult,
} from './index.js';
import { defaultTimeoutSignal, USER_AGENT } from './index.js';

const KIND: VerifierKind = 'github-pat';

export async function verifyGithub(
  token: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();

  let resp: Response;
  try {
    resp = await fetchFn('https://api.github.com/user', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': USER_AGENT,
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
    const scopes = resp.headers.get('x-oauth-scopes') ?? '';
    let login = '';
    try {
      const body = (await resp.json()) as { login?: string };
      login = body.login ?? '';
    } catch {
      // ignore — still treat as live
    }
    return {
      kind: KIND,
      status: 'live',
      httpStatus: 200,
      info: {
        login: login || undefined,
        scopes: scopes || 'fine-grained-or-no-scope',
      },
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
