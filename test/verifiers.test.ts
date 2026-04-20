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
