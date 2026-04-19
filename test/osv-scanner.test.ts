import { describe, it, expect, vi } from 'vitest';
import { scanOsv, __internal } from '../src/engines/osv-scanner.js';

const { extractFromPackageLock } = __internal;

describe('osv: package-lock v3 parsing', () => {
  it('extracts packages from lockfileVersion 3', () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { version: '0.0.0' },
        'node_modules/express': { version: '4.18.0' },
        'node_modules/lodash': { version: '4.17.19' },
      },
    });
    const out = extractFromPackageLock(lock);
    expect(out).toContainEqual({ name: 'express', version: '4.18.0' });
    expect(out).toContainEqual({ name: 'lodash', version: '4.17.19' });
  });

  it('handles nested node_modules paths', () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        'node_modules/a/node_modules/b': { version: '1.0.0' },
      },
    });
    const out = extractFromPackageLock(lock);
    expect(out).toContainEqual({ name: 'b', version: '1.0.0' });
  });

  it('dedupes same package@version', () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        'node_modules/lodash': { version: '4.17.19' },
        'node_modules/foo/node_modules/lodash': { version: '4.17.19' },
      },
    });
    const out = extractFromPackageLock(lock);
    const lodashes = out.filter((p) => p.name === 'lodash');
    expect(lodashes.length).toBe(1);
  });

  it('returns empty for invalid JSON', () => {
    expect(extractFromPackageLock('not json')).toEqual([]);
  });
});

describe('osv: scanning + finding generation', () => {
  it('returns empty when lockfile has no packages', async () => {
    const f = await scanOsv(
      { path: 'package-lock.json', content: '{}' },
      { fetchImpl: vi.fn() as unknown as typeof fetch },
    );
    expect(f).toEqual([]);
  });

  it('produces finding per vulnerability from a stubbed OSV response', async () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        'node_modules/lodash': { version: '4.17.15' },
      },
    });
    const stubFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            vulns: [
              {
                id: 'GHSA-xxx-yyy-zzz',
                summary: 'Prototype pollution in lodash',
                database_specific: { severity: 'HIGH' },
                references: [
                  { type: 'ADVISORY', url: 'https://example.com/advisory' },
                ],
              },
            ],
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const f = await scanOsv(
      { path: 'package-lock.json', content: lock },
      { fetchImpl: stubFetch },
    );
    expect(f).toHaveLength(1);
    expect(f[0]?.severity).toBe('high');
    expect(f[0]?.metadata?.cveId).toBe('GHSA-xxx-yyy-zzz');
    expect(f[0]?.ruleId).toBe('vh-dep-cve-GHSA-xxx-yyy-zzz');
    expect(f[0]?.remediation).toContain('https://example.com/advisory');
  });

  it('gracefully skips when fetch fails', async () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: { 'node_modules/x': { version: '1.0.0' } },
    });
    const stubFetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const f = await scanOsv(
      { path: 'package-lock.json', content: lock },
      { fetchImpl: stubFetch },
    );
    expect(f).toEqual([]);
  });

  it('maps CVSS score to severity when no database_specific tag', async () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: { 'node_modules/foo': { version: '1.0.0' } },
    });
    const stubFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            vulns: [
              {
                id: 'GHSA-aaa',
                summary: 'Critical flaw',
                severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/... 9.8' }],
              },
            ],
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const f = await scanOsv(
      { path: 'package-lock.json', content: lock },
      { fetchImpl: stubFetch },
    );
    expect(f[0]?.severity).toBe('critical');
  });
});
