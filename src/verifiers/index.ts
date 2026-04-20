export type VerifierKind =
  | 'openai'
  | 'anthropic'
  | 'stripe'
  | 'github-pat'
  | 'slack'
  | 'sendgrid'
  | 'twilio'
  | 'notion'
  | 'google-api';

export type VerifyStatus = 'live' | 'revoked' | 'unknown';

export interface VerifyResult {
  kind: VerifierKind;
  status: VerifyStatus;
  httpStatus?: number;
  /** Additional metadata — e.g. GitHub scopes, Slack team */
  info?: Record<string, string | number | boolean | undefined>;
  /** Error message when status is 'unknown' due to fetch/timeout */
  error?: string;
  checkedAt: string;
}

export interface VerifierOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Per-request timeout; default 5 s */
  timeoutMs?: number;
}

import { verifyOpenAI } from './openai.js';
import { verifyAnthropic } from './anthropic.js';
import { verifyStripe } from './stripe.js';
import { verifyGithub } from './github.js';
import { verifySlack } from './slack.js';
import { verifySendgrid } from './sendgrid.js';
import { verifyTwilio } from './twilio.js';
import { verifyNotion } from './notion.js';
import { verifyGoogleApi } from './google-api.js';

/**
 * Dispatch a verification call for a given secret kind. Each verifier
 * performs a single minimal-side-effect HTTP request (listing / auth
 * check) to confirm the credential is currently valid.
 *
 * Rules:
 *   - NEVER do destructive operations (no create/delete/charge)
 *   - Set a clear User-Agent so providers can identify scan traffic
 *   - 5 s timeout by default
 *   - Return 'unknown' for network errors, never throw
 */
export async function verifySecret(
  kind: VerifierKind,
  value: string,
  opts: VerifierOptions = {},
): Promise<VerifyResult> {
  // Defense against CRLF header injection: a real API key never
  // contains newline or NUL bytes. Any captured value that does is
  // either a regex miscapture or an injection attempt. Reject before
  // the value reaches any `fetch` header-construction path — some
  // custom fetchImpls (e.g. test mocks) don't validate headers the
  // way undici does.
  if (/[\r\n\0]/.test(value)) {
    return {
      kind,
      status: 'unknown',
      error: 'invalid secret: contains control characters',
      checkedAt: new Date().toISOString(),
    };
  }
  switch (kind) {
    case 'openai':
      return verifyOpenAI(value, opts);
    case 'anthropic':
      return verifyAnthropic(value, opts);
    case 'stripe':
      return verifyStripe(value, opts);
    case 'github-pat':
      return verifyGithub(value, opts);
    case 'slack':
      return verifySlack(value, opts);
    case 'sendgrid':
      return verifySendgrid(value, opts);
    case 'twilio':
      return verifyTwilio(value, opts);
    case 'notion':
      return verifyNotion(value, opts);
    case 'google-api':
      return verifyGoogleApi(value, opts);
    default: {
      // Exhaustiveness guard: if a new VerifierKind is added to the
      // union but missing from this switch, TypeScript will fail at
      // this assignment with "Type 'string' is not assignable to
      // type 'never'". Prevents silent no-op verifier dispatches.
      const _exhaustive: never = kind;
      return {
        kind: _exhaustive,
        status: 'unknown',
        error: `no verifier for kind "${_exhaustive as string}"`,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

/**
 * Run an async task over a list with a bounded concurrency. Used for
 * the verify loop: a burst of 50 parallel fetches against one provider
 * trips secondary rate limits (GitHub) or RPM caps (OpenAI), so every
 * result comes back as `unknown`. Cap at 5 in-flight.
 */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      await task(items[idx]!);
    }
  };
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    worker,
  );
  await Promise.all(workers);
}

/**
 * Fire-and-forget body drain. Node's undici keeps the socket in the
 * pool until the response stream is fully consumed or cancelled — on
 * the 401/403/429 paths we don't read the body, so without this call
 * the socket stays half-open and future verifies queue behind it.
 */
export function drainResponse(resp: Response | undefined): void {
  if (!resp || !resp.body) return;
  try {
    resp.body.cancel().catch(() => undefined);
  } catch {
    // already locked / consumed — no-op
  }
}

/**
 * Verifier timeout handle.
 *
 * `AbortSignal.timeout()` creates a timer that stays alive until it fires,
 * preventing the Node event loop from exiting even after the fetch
 * resolves. We return a manual `AbortController` + `setTimeout` pair so
 * the caller can `clear()` once the response is in hand.
 */
export interface TimeoutHandle {
  signal: AbortSignal;
  clear(): void;
}

export function defaultTimeoutSignal(opts: VerifierOptions): TimeoutHandle {
  if (opts.signal) {
    return { signal: opts.signal, clear: () => undefined };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5_000);
  // Allow Node to exit if this is the only pending timer — tests using
  // `--detectOpenHandles` would otherwise hang even after all assertions
  // pass.
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as { unref: () => void }).unref();
  }
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export const USER_AGENT =
  'vibe-hardening/0.0.8 (+https://vibe-hardening.io) self-verification';
