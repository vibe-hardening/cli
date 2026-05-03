import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadConfig,
  saveConfig,
  getConfigDir,
  getConfigPath,
  isUniversallyOptedOut,
  ensureConfig,
  buildEvent,
  postEvent,
  CONSENT_VERSION,
  type TelemetryConfig,
  type TelemetryEvent,
} from '../src/core/telemetry.js';
import type { ScanReport } from '../src/core/scan.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = join(tmpdir(), `vh-telemetry-test-${Date.now()}-${Math.random()}`);
  await mkdir(tempDir, { recursive: true });
  // Both code paths in getConfigDir() (POSIX + Windows) read these env
  // vars first, so stubbing both keeps tests platform-portable.
  vi.stubEnv('XDG_CONFIG_HOME', tempDir);
  vi.stubEnv('APPDATA', tempDir);
  // Clear opt-out env vars so tests start from a known state — CI=true
  // is set in vitest's own runner and would short-circuit ensureConfig
  // otherwise.
  vi.stubEnv('VH_TELEMETRY', '');
  vi.stubEnv('VH_TELEMETRY_DISABLED', '');
  vi.stubEnv('DO_NOT_TRACK', '');
  vi.stubEnv('CI', '');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tempDir, { recursive: true, force: true });
});

describe('config dir resolution', () => {
  it('resolves under the stubbed XDG_CONFIG_HOME / APPDATA', () => {
    expect(getConfigDir().startsWith(tempDir)).toBe(true);
    expect(getConfigDir().endsWith('vibe-hardening')).toBe(true);
  });

  it('config file path is config.json under the dir', () => {
    expect(getConfigPath()).toBe(join(getConfigDir(), 'config.json'));
  });
});

describe('loadConfig', () => {
  it('returns null when config file does not exist', async () => {
    expect(await loadConfig()).toBeNull();
  });

  it('returns null when config file is malformed JSON', async () => {
    await mkdir(getConfigDir(), { recursive: true });
    await writeFile(getConfigPath(), '{not json', 'utf8');
    expect(await loadConfig()).toBeNull();
  });

  it('returns null when config is missing required fields', async () => {
    await mkdir(getConfigDir(), { recursive: true });
    await writeFile(
      getConfigPath(),
      JSON.stringify({ enabled: true }),
      'utf8',
    );
    expect(await loadConfig()).toBeNull();
  });
});

describe('saveConfig + loadConfig round-trip', () => {
  it('persists and re-reads the config exactly', async () => {
    const config: TelemetryConfig = {
      enabled: true,
      anonymousId: '11111111-2222-3333-4444-555555555555',
      consentVersion: CONSENT_VERSION,
      firstSeen: '2026-05-03T00:00:00.000Z',
    };
    await saveConfig(config);
    const loaded = await loadConfig();
    expect(loaded).toEqual(config);
  });

  it('creates the config dir if it does not exist', async () => {
    const config: TelemetryConfig = {
      enabled: false,
      anonymousId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      consentVersion: CONSENT_VERSION,
      firstSeen: '2026-05-03T00:00:00.000Z',
    };
    await saveConfig(config);
    const s = await stat(getConfigDir());
    expect(s.isDirectory()).toBe(true);
  });
});

describe('isUniversallyOptedOut', () => {
  it('returns false when no opt-out env vars are set', () => {
    expect(isUniversallyOptedOut()).toBe(false);
  });

  it('respects VH_TELEMETRY=off', () => {
    vi.stubEnv('VH_TELEMETRY', 'off');
    expect(isUniversallyOptedOut()).toBe(true);
  });

  it('respects VH_TELEMETRY_DISABLED=1', () => {
    vi.stubEnv('VH_TELEMETRY_DISABLED', '1');
    expect(isUniversallyOptedOut()).toBe(true);
  });

  it('respects DO_NOT_TRACK=1', () => {
    vi.stubEnv('DO_NOT_TRACK', '1');
    expect(isUniversallyOptedOut()).toBe(true);
  });

  it('respects CI=true', () => {
    vi.stubEnv('CI', 'true');
    expect(isUniversallyOptedOut()).toBe(true);
  });

  it('respects CI=1', () => {
    vi.stubEnv('CI', '1');
    expect(isUniversallyOptedOut()).toBe(true);
  });

  it('does NOT opt out for falsy CI values', () => {
    for (const v of ['0', 'false', 'no', 'off', 'False', 'NO', '  off ']) {
      vi.stubEnv('CI', v);
      expect(isUniversallyOptedOut()).toBe(false);
    }
  });

  it('does NOT opt out for falsy DO_NOT_TRACK values', () => {
    vi.stubEnv('DO_NOT_TRACK', '0');
    expect(isUniversallyOptedOut()).toBe(false);
    vi.stubEnv('DO_NOT_TRACK', 'false');
    expect(isUniversallyOptedOut()).toBe(false);
  });

  it('handles whitespace around env values', () => {
    vi.stubEnv('CI', '  true  ');
    expect(isUniversallyOptedOut()).toBe(true);
    vi.stubEnv('CI', '');
    vi.stubEnv('DO_NOT_TRACK', '   ');
    expect(isUniversallyOptedOut()).toBe(false);
  });
});

describe('ensureConfig', () => {
  it('returns null and writes nothing when universally opted out', async () => {
    vi.stubEnv('DO_NOT_TRACK', '1');
    const out = await ensureConfig({ interactive: false });
    expect(out).toBeNull();
    expect(await loadConfig()).toBeNull();
  });

  it('returns null when non-interactive and no config exists', async () => {
    const out = await ensureConfig({ interactive: false });
    expect(out).toBeNull();
    // Importantly: nothing was written, so the next interactive run
    // will get the prompt fresh.
    expect(await loadConfig()).toBeNull();
  });

  it('returns existing config without re-prompting when present', async () => {
    const existing: TelemetryConfig = {
      enabled: true,
      anonymousId: 'existing-id',
      consentVersion: CONSENT_VERSION,
      firstSeen: '2026-01-01T00:00:00.000Z',
    };
    await saveConfig(existing);
    // interactive:true would normally prompt — but the existing config
    // short-circuits that path entirely.
    const out = await ensureConfig({ interactive: true });
    expect(out).toEqual(existing);
  });
});

// SAMPLE_REPORT mirrors the REAL shape of `ScanReport` and the REAL
// shape of `PlatformFingerprint` (with `signals`, not a hand-crafted
// `evidence` field). This matters for the PII guard below: the actual
// runtime `report.platform.signals` array contains file paths the
// platform detector matched against (e.g. `.cursor/rules/foo.mdc`),
// which would be a path leak if `buildEvent` ever spreads the whole
// platform object instead of reading only `platform.platform`.
const SAMPLE_REPORT: ScanReport = {
  findings: [
    {
      ruleId: 'vh-secret-openai',
      severity: 'critical',
      category: 'secret',
      file: 'src/server.ts',
      line: 42,
      column: 11,
      snippet: 'sk-proj-secret-abc123',
      message: 'OpenAI API key in source',
    },
    {
      ruleId: 'vh-secret-openai',
      severity: 'critical',
      category: 'secret',
      file: 'src/other.ts',
      line: 7,
      column: 3,
      snippet: 'sk-proj-secret-xyz789',
      message: 'OpenAI API key in source',
    },
    {
      ruleId: 'vh-go-inj-sql-concat',
      severity: 'high',
      category: 'injection',
      file: 'cmd/api/users.go',
      line: 88,
      column: 17,
      snippet: 'db.Query("SELECT * FROM u WHERE id=" + id)',
      message: 'SQL concat',
    },
  ],
  summary: { critical: 2, high: 1, medium: 0, low: 0, info: 0 },
  filesScanned: 142,
  durationMs: 4287,
  platform: {
    platform: 'cursor',
    confidence: 0.9,
    signals: [
      {
        source: '.cursor/rules/internal-payroll.mdc',
        weight: 10,
        reason: 'MDC rules directory',
      },
      {
        source: 'CLAUDE.md',
        weight: 5,
        reason: 'Claude Code repo marker',
      },
    ],
    secondary: [{ platform: 'claude-code', confidence: 0.4 }],
  },
  score: { score: 62, grade: 'C+', deductions: [] } as never,
};

const SAMPLE_CONFIG: TelemetryConfig = {
  enabled: true,
  anonymousId: 'test-uuid-1234',
  consentVersion: CONSENT_VERSION,
  firstSeen: '2026-05-03T00:00:00.000Z',
};

describe('buildEvent — schema + PII guard', () => {
  it('includes the public whitelist of fields', () => {
    const event = buildEvent({
      config: SAMPLE_CONFIG,
      report: SAMPLE_REPORT,
      vhVersion: '0.2.1',
    });
    expect(event.anonymous_id).toBe('test-uuid-1234');
    expect(event.consent_version).toBe(CONSENT_VERSION);
    expect(event.vh_version).toBe('0.2.1');
    expect(event.platform_fingerprint).toBe('cursor');
    expect(event.files_scanned).toBe(142);
    expect(event.duration_ms).toBe(4287);
    expect(event.score).toBe(62);
    expect(event.grade).toBe('C+');
    expect(event.os).toBe(process.platform);
    expect(event.node_version).toBe(process.version);
  });

  it('aggregates rules_fired by ruleId with correct counts', () => {
    const event = buildEvent({
      config: SAMPLE_CONFIG,
      report: SAMPLE_REPORT,
      vhVersion: '0.2.1',
    });
    expect(event.rules_fired).toEqual({
      'vh-secret-openai': 2,
      'vh-go-inj-sql-concat': 1,
    });
  });

  it('NEVER includes PII — no file paths, snippets, messages, or platform signal sources', () => {
    const event = buildEvent({
      config: SAMPLE_CONFIG,
      report: SAMPLE_REPORT,
      vhVersion: '0.2.1',
    });
    const wire = JSON.stringify(event);
    // The fixture report has these PII strings; if any reach the wire
    // payload, this guard breaks. New fields added to TelemetryEvent
    // should be added here too if they could carry PII.
    expect(wire).not.toContain('src/server.ts');
    expect(wire).not.toContain('src/other.ts');
    expect(wire).not.toContain('cmd/api/users.go');
    expect(wire).not.toContain('sk-proj-secret-abc123');
    expect(wire).not.toContain('sk-proj-secret-xyz789');
    expect(wire).not.toContain('OpenAI API key in source');
    expect(wire).not.toContain('SQL concat');
    // Platform detector signals contain file paths that match against
    // detection (e.g. `.cursor/rules/internal-payroll.mdc`). This is
    // the highest-risk leak because path names often reveal project
    // identity. buildEvent must read only the platform LABEL, never
    // the underlying signals array.
    expect(wire).not.toContain('.cursor/rules/internal-payroll.mdc');
    expect(wire).not.toContain('CLAUDE.md');
    expect(wire).not.toContain('MDC rules directory');
    expect(wire).not.toContain('Claude Code repo marker');
  });

  it('payload has exactly the expected top-level keys', () => {
    const event = buildEvent({
      config: SAMPLE_CONFIG,
      report: SAMPLE_REPORT,
      vhVersion: '0.2.1',
    });
    expect(Object.keys(event).sort()).toEqual(
      [
        'anonymous_id',
        'consent_version',
        'duration_ms',
        'files_scanned',
        'grade',
        'node_version',
        'os',
        'platform_fingerprint',
        'rules_fired',
        'score',
        'vh_version',
      ].sort(),
    );
  });
});

describe('postEvent', () => {
  const event: TelemetryEvent = {
    anonymous_id: 'test-uuid',
    consent_version: 1,
    vh_version: '0.2.1',
    platform_fingerprint: 'cursor',
    files_scanned: 10,
    duration_ms: 1234,
    score: 88,
    grade: 'B+',
    rules_fired: { 'vh-secret-openai': 1 },
    os: 'linux',
    node_version: 'v20.0.0',
  };

  it('POSTs JSON to the endpoint with the event in the body', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      calls.push({
        url: typeof url === 'string' ? url : url.toString(),
        init: init as RequestInit,
      });
      return new Response('{}', { status: 200 });
    };

    await postEvent(event, {
      fetchImpl: fakeFetch,
      endpoint: 'https://example.test/v1/scan',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/v1/scan');
    expect(calls[0].init.method).toBe('POST');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual(event);
  });

  it('swallows network errors silently', async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    // Must not throw — that would crash the user's scan exit.
    await expect(
      postEvent(event, {
        fetchImpl: fakeFetch,
        endpoint: 'https://example.test/v1/scan',
      }),
    ).resolves.toBeUndefined();
  });

  describe('endpoint resolution (SSRF guard)', () => {
    async function captureUrl(envValue: string | undefined): Promise<string> {
      if (envValue === undefined) {
        vi.stubEnv('VH_TELEMETRY_ENDPOINT', '');
      } else {
        vi.stubEnv('VH_TELEMETRY_ENDPOINT', envValue);
      }
      let captured = '';
      const fakeFetch: typeof fetch = async (url) => {
        captured = typeof url === 'string' ? url : url.toString();
        return new Response('{}');
      };
      await postEvent(event, { fetchImpl: fakeFetch });
      return captured;
    }

    it('falls back to default when env override is http://', async () => {
      const url = await captureUrl('http://attacker.example.com/scan');
      expect(url).not.toContain('attacker.example.com');
      expect(url.startsWith('https://')).toBe(true);
    });

    it('falls back to default when env override is an IPv4 literal', async () => {
      const url = await captureUrl('https://169.254.169.254/scan');
      expect(url).not.toContain('169.254.169.254');
    });

    it('falls back to default when env override is localhost', async () => {
      const url = await captureUrl('https://localhost:8080/scan');
      expect(url).not.toContain('localhost');
    });

    it('falls back to default when env override is an IPv6 literal', async () => {
      const url = await captureUrl('https://[::1]/scan');
      expect(url).not.toContain('::1');
    });

    it('falls back to default when env override has userinfo', async () => {
      const url = await captureUrl(
        'https://user:pass@evil.example.com/scan',
      );
      expect(url).not.toContain('evil.example.com');
      expect(url).not.toContain('user:pass');
    });

    it('falls back to default when env override is malformed', async () => {
      const url = await captureUrl('not a url at all');
      expect(url.startsWith('https://')).toBe(true);
    });

    it('accepts a valid https hostname override', async () => {
      const url = await captureUrl('https://my-self-host.example.com/v1/scan');
      expect(url).toBe('https://my-self-host.example.com/v1/scan');
    });
  });

  it('aborts after the timeout when fetch hangs', async () => {
    let aborted = false;
    const fakeFetch: typeof fetch = (_url, init) => {
      const signal = (init as RequestInit).signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('aborted'));
        });
        // Never resolves — would hang forever without the timeout.
      });
    };
    const start = Date.now();
    await postEvent(event, {
      fetchImpl: fakeFetch,
      endpoint: 'https://example.test/v1/scan',
    });
    const elapsed = Date.now() - start;
    expect(aborted).toBe(true);
    // Internal POST_TIMEOUT_MS is 1500; allow a generous upper bound
    // for slow CI runners. Lower bound proves the abort actually fired
    // (didn't resolve immediately).
    expect(elapsed).toBeGreaterThan(1000);
    expect(elapsed).toBeLessThan(3000);
  });
});
