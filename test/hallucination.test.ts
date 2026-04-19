import { describe, it, expect, vi } from 'vitest';
import { scanHallucinated, __internal } from '../src/engines/hallucination.js';

const { extractDependencies } = __internal;

function makeFetch(map: Record<string, { status: number; json?: unknown }>) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    const entry = Object.entries(map).find(([k]) => u.includes(k));
    if (!entry) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    const { status, json } = entry[1];
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
    };
  }) as unknown as typeof fetch;
}

describe('hallucination: dep extraction', () => {
  it('extracts from dependencies and devDependencies', () => {
    const src = JSON.stringify({
      dependencies: { react: '19', 'react-dom': '19' },
      devDependencies: { vitest: '2' },
    });
    const out = extractDependencies(src);
    expect(out.map((d) => d.name).sort()).toEqual(
      ['react', 'react-dom', 'vitest'].sort(),
    );
  });

  it('skips file: / workspace: / git specs', () => {
    const src = JSON.stringify({
      dependencies: {
        'local-lib': 'file:../local-lib',
        'workspace-lib': 'workspace:*',
        'git-lib': 'git+https://github.com/foo/bar',
        normal: '1.0.0',
      },
    });
    const out = extractDependencies(src);
    expect(out.map((d) => d.name)).toEqual(['normal']);
  });

  it('dedupes across groups', () => {
    const src = JSON.stringify({
      dependencies: { foo: '1' },
      devDependencies: { foo: '1' },
    });
    const out = extractDependencies(src);
    expect(out.length).toBe(1);
  });
});

describe('hallucination: scan', () => {
  it('reports missing package', async () => {
    const pkg = JSON.stringify({
      dependencies: { 'react-auth-helper-fake': '1.0.0' },
    });
    const stub = makeFetch({
      'react-auth-helper-fake': { status: 404 },
    });
    const f = await scanHallucinated(
      { path: 'package.json', content: pkg },
      { fetchImpl: stub },
    );
    expect(f).toHaveLength(1);
    expect(f[0]?.ruleId).toBe('vh-llm-hallucinated-package');
    expect(f[0]?.severity).toBe('high');
    expect(f[0]?.metadata?.reason).toBe('not-found-on-npm');
  });

  it('reports low-downloads package', async () => {
    const pkg = JSON.stringify({
      dependencies: { 'tiny-unknown-pkg': '1.0.0' },
    });
    const stub = makeFetch({
      'registry.npmjs.org/tiny-unknown-pkg': {
        status: 200,
        json: { name: 'tiny-unknown-pkg' },
      },
      'downloads/point/last-week/tiny-unknown-pkg': {
        status: 200,
        json: { downloads: 3 },
      },
    });
    const f = await scanHallucinated(
      { path: 'package.json', content: pkg },
      { fetchImpl: stub },
    );
    expect(f).toHaveLength(1);
    expect(f[0]?.ruleId).toBe('vh-llm-low-trust-package');
    expect(f[0]?.severity).toBe('medium');
    expect(f[0]?.metadata?.weeklyDownloads).toBe(3);
  });

  it('skips popular package with high downloads', async () => {
    const pkg = JSON.stringify({
      dependencies: { react: '19.0.0' },
    });
    const stub = makeFetch({
      'registry.npmjs.org/react': {
        status: 200,
        json: { name: 'react' },
      },
      'downloads/point/last-week/react': {
        status: 200,
        json: { downloads: 50_000_000 },
      },
    });
    const f = await scanHallucinated(
      { path: 'package.json', content: pkg },
      { fetchImpl: stub },
    );
    expect(f).toEqual([]);
  });

  it('tolerates network failure gracefully', async () => {
    const pkg = JSON.stringify({
      dependencies: { foo: '1.0.0' },
    });
    const stub = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const f = await scanHallucinated(
      { path: 'package.json', content: pkg },
      { fetchImpl: stub },
    );
    expect(f).toEqual([]);
  });

  it('preserves @scope/name path for scoped packages (review fix)', async () => {
    const pkg = JSON.stringify({
      dependencies: { '@acme/ghost': '1.0.0' },
    });
    const urls: string[] = [];
    const stub = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return { ok: false, status: 404, json: async () => ({}) };
    }) as unknown as typeof fetch;

    await scanHallucinated(
      { path: 'package.json', content: pkg },
      { fetchImpl: stub },
    );
    const registryUrl = urls.find((u) => u.includes('registry.npmjs.org'));
    expect(registryUrl).toContain('@acme/ghost');
    expect(registryUrl).not.toContain('%2Fghost');
  });

  it('records package name + spec in snippet', async () => {
    const pkg = JSON.stringify({
      dependencies: { ghostly: '^9.9.9' },
    });
    const stub = makeFetch({ ghostly: { status: 404 } });
    const f = await scanHallucinated(
      { path: 'package.json', content: pkg },
      { fetchImpl: stub },
    );
    expect(f[0]?.snippet).toContain('ghostly');
    expect(f[0]?.snippet).toContain('^9.9.9');
  });
});
