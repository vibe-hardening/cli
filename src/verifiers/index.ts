export type VerifierKind =
  | 'openai'
  | 'anthropic'
  | 'stripe'
  | 'github-pat'
  | 'slack';

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
    default:
      return {
        kind,
        status: 'unknown',
        error: `no verifier for kind "${kind as string}"`,
        checkedAt: new Date().toISOString(),
      };
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
  'vibe-hardening/0.0.7 (+https://vibe-hardening.io) self-verification';
