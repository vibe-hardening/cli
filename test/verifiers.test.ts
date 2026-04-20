import { describe, expect, it } from 'vitest';
import { verifySecret, runWithConcurrency } from '../src/verifiers/index.js';

type FakeFetch = (url: string, init?: RequestInit) => Promise<Response>;

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('verifySecret dispatcher', () => {
  it('openai: 200 -> live', async () => {
    const fake: FakeFetch = async (url) => {
      expect(url).toBe('https://api.openai.com/v1/models');
      return jsonResponse(200, { data: [] });
    };
    const r = await verifySecret('openai', 'sk-proj-live', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
    expect(r.httpStatus).toBe(200);
  });

  it('openai: 401 -> revoked', async () => {
    const fake: FakeFetch = async () => jsonResponse(401, {});
    const r = await verifySecret('openai', 'sk-bad', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('revoked');
  });

  it('anthropic: 200 -> live', async () => {
    const fake: FakeFetch = async (url, init) => {
      expect(url).toBe('https://api.anthropic.com/v1/models');
      const headers = init?.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('sk-ant-api03-live');
      return jsonResponse(200, { data: [] });
    };
    const r = await verifySecret('anthropic', 'sk-ant-api03-live', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
  });

  it('anthropic: 401 -> revoked', async () => {
    const fake: FakeFetch = async () => jsonResponse(401, {});
    const r = await verifySecret('anthropic', 'sk-ant-bad', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('revoked');
  });

  it('stripe: 200 -> live (live mode)', async () => {
    const fake: FakeFetch = async () =>
      jsonResponse(200, { livemode: true, data: [] });
    const r = await verifySecret('stripe', 'sk_live_abc', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
    expect(r.info?.mode).toBe('live');
  });

  it('github-pat: 200 -> live with scopes', async () => {
    const fake: FakeFetch = async () =>
      jsonResponse(
        200,
        { login: 'octocat' },
        { 'x-oauth-scopes': 'repo, user' },
      );
    const r = await verifySecret('github-pat', 'ghp_live', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
    expect(r.info?.login).toBe('octocat');
    expect(r.info?.scopes).toBe('repo, user');
  });

  it('github-pat: 401 -> revoked', async () => {
    const fake: FakeFetch = async () => jsonResponse(401, {});
    const r = await verifySecret('github-pat', 'ghp_bad', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('revoked');
  });

  it('slack: body.ok=true -> live', async () => {
    const fake: FakeFetch = async () =>
      jsonResponse(200, { ok: true, team: 'Acme', user: 'alice' });
    const r = await verifySecret('slack', 'xoxb-live', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
    expect(r.info?.team).toBe('Acme');
  });

  it('slack: body.error=invalid_auth -> revoked', async () => {
    const fake: FakeFetch = async () =>
      jsonResponse(200, { ok: false, error: 'invalid_auth' });
    const r = await verifySecret('slack', 'xoxb-bad', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('revoked');
  });

  it('sendgrid: 200 -> live', async () => {
    const fake: FakeFetch = async (url, init) => {
      expect(url).toBe('https://api.sendgrid.com/v3/user/account');
      const headers = init?.headers as Record<string, string>;
      expect(headers.authorization).toBe('Bearer SG.x.y');
      return jsonResponse(200, { type: 'free' });
    };
    const r = await verifySecret('sendgrid', 'SG.x.y', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
  });

  it('sendgrid: 401 -> revoked', async () => {
    const fake: FakeFetch = async () => jsonResponse(401, {});
    const r = await verifySecret('sendgrid', 'SG.bad.key', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('revoked');
  });

  it('notion: 200 -> live', async () => {
    const fake: FakeFetch = async (url, init) => {
      expect(url).toBe('https://api.notion.com/v1/users/me');
      const headers = init?.headers as Record<string, string>;
      expect(headers['notion-version']).toBe('2022-06-28');
      return jsonResponse(200, { object: 'user' });
    };
    const r = await verifySecret('notion', 'secret_live', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('live');
  });

  it('notion: 401 -> revoked', async () => {
    const fake: FakeFetch = async () => jsonResponse(401, {});
    const r = await verifySecret('notion', 'secret_bad', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('revoked');
  });

  it('twilio: 200 with SID:TOKEN combined value -> live', async () => {
    const fake: FakeFetch = async (url, init) => {
      expect(url).toContain('/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json');
      const headers = init?.headers as Record<string, string>;
      expect(headers.authorization).toMatch(/^Basic /);
      return jsonResponse(200, { status: 'active' });
    };
    const r = await verifySecret(
      'twilio',
      'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:tokenliveaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      { fetchImpl: fake as typeof fetch },
    );
    expect(r.status).toBe('live');
  });

  it('twilio: 401 -> revoked', async () => {
    const fake: FakeFetch = async () => jsonResponse(401, {});
    const r = await verifySecret(
      'twilio',
      'AC11111111111111111111111111111111:badtokenbadtokenbadtokenbadtokenb',
      { fetchImpl: fake as typeof fetch },
    );
    expect(r.status).toBe('revoked');
  });

  it('google-api: 200 -> live', async () => {
    const fake: FakeFetch = async (url) => {
      expect(url).toContain(
        'generativelanguage.googleapis.com/v1beta/models',
      );
      expect(url).toContain('key=AIzaSy');
      return jsonResponse(200, { models: [] });
    };
    const r = await verifySecret(
      'google-api',
      'AIzaSy' + 'A'.repeat(33),
      { fetchImpl: fake as typeof fetch },
    );
    expect(r.status).toBe('live');
  });

  it('google-api: 400 -> revoked (API_KEY_INVALID body, top-level)', async () => {
    const fake: FakeFetch = async () =>
      jsonResponse(400, {
        error: { code: 400, message: 'API key not valid' },
      });
    const r = await verifySecret(
      'google-api',
      'AIzaSy' + 'B'.repeat(33),
      { fetchImpl: fake as typeof fetch },
    );
    expect(r.status).toBe('revoked');
  });

  it('google-api: 403 + PERMISSION_DENIED -> unknown (scope-restricted)', async () => {
    // The key likely still works for Maps / YouTube / Cloud — don't
    // falsely claim it is revoked.
    const fake: FakeFetch = async () =>
      jsonResponse(403, {
        error: { code: 403, status: 'PERMISSION_DENIED' },
      });
    const r = await verifySecret(
      'google-api',
      'AIzaSy' + 'C'.repeat(33),
      { fetchImpl: fake as typeof fetch },
    );
    expect(r.status).toBe('unknown');
    expect(r.error).toContain('restricted');
    expect(r.info?.googleErrorStatus).toBe('PERMISSION_DENIED');
  });

  it('google-api: 403 + API_KEY_INVALID -> revoked (truly dead)', async () => {
    // Distinguish genuinely revoked keys from merely scope-restricted
    // ones — a previous version lumped both into `unknown` and missed
    // real revocations.
    const fake: FakeFetch = async () =>
      jsonResponse(403, {
        error: { code: 403, status: 'API_KEY_INVALID' },
      });
    const r = await verifySecret(
      'google-api',
      'AIzaSy' + 'D'.repeat(33),
      { fetchImpl: fake as typeof fetch },
    );
    expect(r.status).toBe('revoked');
    expect(r.info?.googleErrorStatus).toBe('API_KEY_INVALID');
  });

  it('network failure -> unknown, never throws', async () => {
    const fake: FakeFetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    const r = await verifySecret('openai', 'sk-x', {
      fetchImpl: fake as typeof fetch,
    });
    expect(r.status).toBe('unknown');
    expect(r.error).toContain('ECONNREFUSED');
  });

  it('rejects secret containing CRLF (header injection guard)', async () => {
    let called = false;
    const fake: FakeFetch = async () => {
      called = true;
      return jsonResponse(200, {});
    };
    const r = await verifySecret(
      'openai',
      'sk-abc\r\nX-Injected: evil',
      { fetchImpl: fake as typeof fetch },
    );
    expect(called).toBe(false);
    expect(r.status).toBe('unknown');
    expect(r.error).toContain('control');
  });

  it('rejects secret containing NUL byte', async () => {
    let called = false;
    const fake: FakeFetch = async () => {
      called = true;
      return jsonResponse(200, {});
    };
    const r = await verifySecret('github-pat', 'ghp_abc\0def', {
      fetchImpl: fake as typeof fetch,
    });
    expect(called).toBe(false);
    expect(r.status).toBe('unknown');
  });
});

describe('runWithConcurrency', () => {
  it('caps in-flight tasks at the given limit', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let inFlight = 0;
    let maxSeen = 0;
    await runWithConcurrency(items, 5, async () => {
      inFlight++;
      maxSeen = Math.max(maxSeen, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
    });
    expect(maxSeen).toBeLessThanOrEqual(5);
    expect(maxSeen).toBeGreaterThan(0);
  });

  it('handles empty list', async () => {
    let called = 0;
    await runWithConcurrency([], 5, async () => {
      called++;
    });
    expect(called).toBe(0);
  });

  it('processes every item exactly once', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const processed: number[] = [];
    await runWithConcurrency(items, 3, async (n) => {
      processed.push(n);
    });
    expect(processed.sort((a, b) => a - b)).toEqual(items);
  });
});
