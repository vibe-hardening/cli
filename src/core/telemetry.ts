import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import pc from 'picocolors';
import type { ScanReport } from './scan.js';

/**
 * Telemetry is the single thing this CLI phones home for. The rules are:
 *
 *   1. **Opt-in only.** Default state for a fresh install is OFF. We
 *      only flip to ON if the user explicitly says yes at the first-run
 *      prompt OR runs `vibe-hardening config set telemetry on`.
 *   2. **No PII, ever.** No file paths, snippets, repo names, IP, or
 *      email — see `buildEvent` for the strict whitelist of fields.
 *   3. **Universal opt-outs always win.** Any truthy `DO_NOT_TRACK`,
 *      `CI`, or `VH_TELEMETRY_DISABLED` env var, plus the explicit
 *      `VH_TELEMETRY=off` form, short-circuit everything — even an
 *      explicitly enabled config never fires telemetry in those envs.
 *   4. **Failure is silent.** Telemetry must never block, slow, or
 *      crash a scan. AbortController caps each POST at POST_TIMEOUT_MS;
 *      any error is swallowed.
 *
 * The endpoint is a Cloudflare Worker (or equivalent) that accepts JSON
 * POSTs and writes to a backend. The endpoint URL is configurable via
 * `VH_TELEMETRY_ENDPOINT` for self-hosted runs.
 */

export const CONSENT_VERSION = 1;
const POST_TIMEOUT_MS = 1500;

const DEFAULT_ENDPOINT = 'https://telemetry.vibe-hardening.io/v1/scan';

/**
 * Endpoint resolution. The env var override exists for self-hosted
 * runs and for our own internal end-to-end tests. To prevent SSRF via
 * a hostile env var (a malicious wrapper script setting
 * `VH_TELEMETRY_ENDPOINT=http://169.254.169.254/`), the override is
 * accepted only if it parses as `https://` to a hostname-shaped host.
 * Anything malformed silently falls back to the default endpoint.
 */
function getEndpoint(): string {
  const override = process.env.VH_TELEMETRY_ENDPOINT;
  if (!override) return DEFAULT_ENDPOINT;
  try {
    const u = new URL(override);
    if (u.protocol !== 'https:') return DEFAULT_ENDPOINT;
    // Reject IP literals — both forms — and userinfo-bearing URLs. The
    // common SSRF targets (169.254.169.254 / localhost via 127.0.0.1 /
    // [::1]) all fail the hostname-with-a-dot test below.
    if (!/^[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/.test(u.hostname)) {
      return DEFAULT_ENDPOINT;
    }
    if (u.username || u.password) return DEFAULT_ENDPOINT;
    return override;
  } catch {
    return DEFAULT_ENDPOINT;
  }
}

export interface TelemetryConfig {
  /** Explicit opt-in flag. Only true if the user said yes. */
  enabled: boolean;
  /** UUID v4 — generated once, stable across runs. Lets us de-dupe scan
   *  events without identifying the user. */
  anonymousId: string;
  /** Schema version of the consent the user gave. Currently only 1 —
   *  if we ever widen what we collect, the migration path is to bump
   *  this constant and add a re-prompt branch in `ensureConfig`. */
  consentVersion: number;
  /** ISO timestamp of first prompt — purely diagnostic. */
  firstSeen: string;
}

export interface TelemetryEvent {
  /** Discriminator: 'scan' = code scan (v1), 'agent_scan' = agent skill
   *  scan (D5+). Shared `anonymous_id` lets the backend correlate one
   *  user's scan and agent_scan events without identifying them. */
  event_type: 'scan' | 'agent_scan';
  anonymous_id: string;
  consent_version: number;
  vh_version: string;
  platform_fingerprint: string;
  files_scanned: number;
  duration_ms: number;
  score: number;
  grade: string;
  /** Map of ruleId → trigger count for this scan. Rule IDs are public
   *  identifiers (`vh-secret-openai`, `vh-go-inj-sql-concat`); they
   *  reveal nothing about the user's code beyond which rules fired. */
  rules_fired: Record<string, number>;
  os: string;
  node_version: string;
  /** Set ONLY on `event_type === 'agent_scan'`. Per-agent boolean
   *  presence map — tells us which agentskills.io-compatible
   *  platforms this user has installed. Public platform IDs only,
   *  no paths or contents. */
  agents_detected?: Record<string, boolean>;
}

/**
 * Config dir resolution. Follows platform conventions:
 *   - Windows: `%APPDATA%\vibe-hardening`
 *   - macOS / Linux: `$XDG_CONFIG_HOME/vibe-hardening` (default
 *     `~/.config/vibe-hardening`)
 */
export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData =
      process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'vibe-hardening');
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  return join(xdg || join(homedir(), '.config'), 'vibe-hardening');
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export async function loadConfig(): Promise<TelemetryConfig | null> {
  try {
    const raw = await readFile(getConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<TelemetryConfig>;
    if (
      typeof parsed.enabled === 'boolean' &&
      typeof parsed.anonymousId === 'string' &&
      typeof parsed.consentVersion === 'number' &&
      typeof parsed.firstSeen === 'string'
    ) {
      return parsed as TelemetryConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveConfig(config: TelemetryConfig): Promise<void> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });
  // Atomic write: write to a temp file, then rename. A crash mid-write
  // can't leave a torn config.json — the rename is atomic on the same
  // filesystem and either the old file or the new file is visible at
  // every moment. Concurrent first-run races still write divergent
  // UUIDs (last-writer wins) — acceptable trade for an indie CLI;
  // server-side de-dup handles multiple UUIDs from one user.
  const tmp = getConfigPath() + '.tmp';
  await writeFile(
    tmp,
    JSON.stringify(config, null, 2) + '\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  await rename(tmp, getConfigPath());
}

/**
 * Hard opt-outs that bypass everything else — even an explicitly
 * enabled config respects these. Standard CI envs and DO_NOT_TRACK
 * count: a scan running in GitHub Actions or an air-gapped runner
 * should never phone home, regardless of what the local config says.
 *
 * For DO_NOT_TRACK and CI we accept any non-empty truthy value, not
 * just `1`. yarn / pnpm / Gatsby do the same — for a "universal
 * opt-out" the right default is permissive, since any false-positive
 * just means we skip telemetry (which is the safe failure mode).
 */
export function isUniversallyOptedOut(): boolean {
  // Opt-out wins over opt-in. If a user sets VH_TELEMETRY=on alongside
  // DO_NOT_TRACK=1 — privacy/CI signal beats the per-tool override.
  if (process.env.VH_TELEMETRY === 'off') return true;
  if (truthyEnv(process.env.VH_TELEMETRY_DISABLED)) return true;
  if (truthyEnv(process.env.DO_NOT_TRACK)) return true;
  if (truthyEnv(process.env.CI)) return true;
  return false;
}

function truthyEnv(v: string | undefined): boolean {
  if (!v) return false;
  const lc = v.trim().toLowerCase();
  if (!lc) return false;
  return lc !== '0' && lc !== 'false' && lc !== 'no' && lc !== 'off';
}

/**
 * First-run interactive prompt. Returns true on opt-in, false on opt-out.
 *
 * Disclosure surface is intentionally compact: 2 columns of "what we
 * collect / what we don't" + the env-var escape hatch + a link to the
 * full Privacy doc. We don't bury the disclosure under a "more details"
 * link because the next chance to re-disclose is `consentVersion`
 * bumps, which should be rare.
 */
async function promptOptIn(): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  process.stdout.write('\n');
  process.stdout.write(
    `${pc.bold(pc.red('▲ vibe-hardening'))} ${pc.dim('· first run — help us harden the rules')}\n\n`,
  );
  process.stdout.write(
    `  ${pc.green('We collect')}${pc.dim(': rule IDs that fired, AI platform fingerprint,')}\n`,
  );
  process.stdout.write(
    `              ${pc.dim('CLI version, scan duration, file count, score, anon UUID.')}\n`,
  );
  process.stdout.write(
    `  ${pc.red('We never')}${pc.dim('  : your code, secrets, file names, paths, IP, email.')}\n\n`,
  );
  process.stdout.write(
    `  ${pc.dim('Opt in later:    ')}${pc.cyan('vibe-hardening config set telemetry on')}\n`,
  );
  process.stdout.write(
    `  ${pc.dim('Privacy:         ')}${pc.cyan('https://vibe-hardening.io/privacy')}\n\n`,
  );

  let answer: string;
  try {
    answer = await rl.question(
      `  ${pc.bold('Share anonymous scan stats?')} ${pc.dim('[y/N] ')}`,
    );
  } finally {
    // Always close — leaving readline open keeps stdin listeners
    // attached and prevents Node from exiting naturally if the CLI
    // ever stops calling process.exit() explicitly.
    rl.close();
  }

  process.stdout.write('\n');

  // Default-no semantics: bare Enter, closed stdin (resolves to ''),
  // or anything other than an explicit 'y'/'yes' = opt out. The
  // launch rule says "telemetry must be opt-in, not default-on" —
  // requiring affirmative consent is the strict reading. A user who
  // wants to opt in later has the `config set telemetry on` escape
  // hatch (also disclosed in the prompt above).
  const trimmed = answer.trim().toLowerCase();
  return trimmed === 'y' || trimmed === 'yes';
}

/**
 * Idempotent first-run flow. If a config exists, returns it untouched.
 * If no config exists and we're in an interactive TTY, prompts the user
 * and writes a config. Otherwise (piped output / CI / non-TTY) returns
 * null — no prompt is shown and no config is written, so the next
 * interactive run will prompt fresh.
 */
export async function ensureConfig(opts: {
  interactive: boolean;
}): Promise<TelemetryConfig | null> {
  if (isUniversallyOptedOut()) {
    return null;
  }

  const existing = await loadConfig();
  if (existing) {
    return existing;
  }

  if (!opts.interactive) {
    return null;
  }

  let optIn = false;
  try {
    optIn = await promptOptIn();
  } catch {
    // Reading from stdin can fail if it's been closed unexpectedly.
    // Treat as opt-out.
    return null;
  }

  const config: TelemetryConfig = {
    enabled: optIn,
    anonymousId: randomUUID(),
    consentVersion: CONSENT_VERSION,
    firstSeen: new Date().toISOString(),
  };

  try {
    await saveConfig(config);
  } catch {
    // Read-only home dir or permission denied — non-fatal. We return
    // the in-memory config so this single run respects the user's
    // choice; next run will re-prompt because nothing was persisted.
  }

  return config;
}

/**
 * Build the wire payload from a scan report. Strict whitelist — anything
 * not listed below is NOT included. In particular:
 *   - findings[].file / .snippet / .message — would leak path + code
 *   - report.platform.signals[].source — would leak the file paths the
 *     platform detector matched against (e.g. `.cursor/rules/foo.mdc`)
 *   - any environment variable, cwd, or git remote
 *
 * The shape of this object is the public contract for the telemetry
 * endpoint and any future schema migrations should bump CONSENT_VERSION.
 */
export function buildEvent(opts: {
  config: TelemetryConfig;
  report: ScanReport;
  vhVersion: string;
}): TelemetryEvent {
  const rulesFired: Record<string, number> = {};
  for (const f of opts.report.findings) {
    rulesFired[f.ruleId] = (rulesFired[f.ruleId] || 0) + 1;
  }

  return {
    event_type: 'scan',
    anonymous_id: opts.config.anonymousId,
    consent_version: opts.config.consentVersion,
    vh_version: opts.vhVersion,
    platform_fingerprint: opts.report.platform.platform,
    files_scanned: opts.report.filesScanned,
    duration_ms: opts.report.durationMs,
    score: opts.report.score.score,
    grade: opts.report.score.grade,
    rules_fired: rulesFired,
    os: process.platform,
    node_version: process.version,
  };
}

/**
 * Agent-scan variant of `buildEvent`. Same anonymous_id, same
 * privacy guarantees, but adds `agents_detected` and uses
 * `event_type: 'agent_scan'` so the backend can route separately.
 *
 * Fields that don't apply to agent scans (score / grade / platform
 * fingerprint) are zeroed/empty rather than omitted, so the backend
 * has a single uniform schema and doesn't need conditional access.
 */
export function buildAgentScanEvent(opts: {
  config: TelemetryConfig;
  vhVersion: string;
  agentsDetected: string[];
  /** Public platform IDs this CLI knows how to probe. We emit `false`
   *  for the ones that weren't found so the backend has a stable
   *  presence vector and can compute install-rate over time. */
  knownAgentIds: readonly string[];
  rulesFired: Record<string, number>;
  filesScanned: number;
  durationMs: number;
}): TelemetryEvent {
  const presence: Record<string, boolean> = {};
  for (const id of opts.knownAgentIds) {
    presence[id] = opts.agentsDetected.includes(id);
  }
  return {
    event_type: 'agent_scan',
    anonymous_id: opts.config.anonymousId,
    consent_version: opts.config.consentVersion,
    vh_version: opts.vhVersion,
    platform_fingerprint: '', // not meaningful for agent scan
    files_scanned: opts.filesScanned,
    duration_ms: opts.durationMs,
    score: 0,
    grade: '',
    rules_fired: opts.rulesFired,
    os: process.platform,
    node_version: process.version,
    agents_detected: presence,
  };
}

/**
 * Fire-and-forget POST. Caller does not need to handle errors —
 * everything is swallowed. The 1.5 s timeout means worst-case the user
 * sees ~1.5 s of dead time at scan end; in practice fetch resolves in
 * tens of milliseconds when the endpoint is healthy.
 *
 * `fetchImpl` is injectable for tests so we can assert on the request
 * body without hitting the network.
 */
export async function postEvent(
  event: TelemetryEvent,
  opts: { fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<void> {
  const fetchFn = opts.fetchImpl || fetch;
  const url = opts.endpoint || getEndpoint();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), POST_TIMEOUT_MS);
  try {
    await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      signal: ctrl.signal,
    });
  } catch {
    // Network down, endpoint unreachable, abort fired — all silent.
  } finally {
    clearTimeout(timer);
  }
}
