import type { SecretRule } from '../engines/secret-regex.js';

/**
 * Auth / crypto / config rules for Rust.
 *
 * Covers TLS verification disabled in reqwest, JWT alg=none accepted
 * via jsonwebtoken without explicit Validation::new, bcrypt cost too
 * low, and timing-leaky comparisons on secret bytes.
 */
export const RUST_AUTH_RULES: SecretRule[] = [
  {
    id: 'vh-rs-tls-no-verify',
    severity: 'critical',
    category: 'config',
    message:
      'reqwest client built with `danger_accept_invalid_certs(true)` — MITM attacks unchallenged',
    remediation:
      'Remove `danger_accept_invalid_certs`. For self-signed dev servers, use `add_root_certificate(...)` with the specific cert.',
    patterns: [
      {
        name: 'danger-accept-invalid-certs',
        regex: /\bdanger_accept_invalid_certs\s*\(\s*true\s*\)/g,
      },
      {
        // Same family: hyper with custom Connector that disables verify
        name: 'danger-accept-invalid-hostnames',
        regex: /\bdanger_accept_invalid_hostnames\s*\(\s*true\s*\)/g,
      },
    ],
  },
  {
    id: 'vh-rs-jwt-alg-none',
    severity: 'critical',
    category: 'auth',
    message:
      'jsonwebtoken `decode` called with `Validation::default()` and no algorithm assertion — `alg: none` accepted',
    remediation:
      'Use `let mut validation = Validation::new(Algorithm::HS256); validation.required_spec_claims = [...]`. Never call `decode` with default Validation if you accept tokens from untrusted parties.',
    patterns: [
      {
        // jsonwebtoken::decode with Validation::default() — accepts the
        // first algorithm the token claims, including alg=none.
        name: 'validation-default',
        regex:
          /\bjsonwebtoken::decode\s*[:<][^>]*>?\s*\(\s*[^,)]+,\s*[^,)]+,\s*&?Validation::default\s*\(\s*\)/g,
      },
    ],
  },
  {
    id: 'vh-rs-bcrypt-low-cost',
    severity: 'high',
    category: 'auth',
    message:
      'bcrypt cost < 10 — easily brute-forceable on modern GPUs',
    remediation:
      'Use cost 10 minimum, 12 recommended. `bcrypt::hash(pwd, 12)`. The bcrypt crate exposes `MIN_COST` (4) but never use it in production.',
    patterns: [
      {
        // bcrypt::hash(pwd, 4) — single-digit literal cost, or MIN_COST.
        name: 'bcrypt-low-cost',
        regex:
          /\bbcrypt::hash\s*\(\s*[^,)]+,\s*(?:bcrypt::MIN_COST|MIN_COST|[0-9])\s*\)/g,
      },
    ],
  },
  {
    id: 'vh-rs-hmac-not-timing-safe',
    severity: 'high',
    category: 'auth',
    message:
      'MAC / signature compared with `==` — timing attack',
    remediation:
      'Use `subtle::ConstantTimeEq::ct_eq` or `hmac::Mac::verify_slice`. `==` on `&[u8]` short-circuits at the first mismatching byte and leaks position via timing.',
    patterns: [
      {
        // == comparison where one operand is named like a MAC artefact.
        name: 'eq-on-mac',
        regex:
          /\b(?:hmac|mac|sig|signature|token_hash|expected_token|provided_mac)\s*==\s*\w/g,
      },
    ],
  },
  {
    id: 'vh-rs-insecure-random-token',
    severity: 'high',
    category: 'auth',
    message:
      '`rand::random` / thread_rng used for security-relevant value — predictable, NOT cryptographically random',
    remediation:
      'For tokens / session IDs / secrets, use `rand::rngs::OsRng` (backed by the OS CSPRNG) or `getrandom`. `thread_rng` and `rand::random` use a non-cryptographic PRNG.',
    patterns: [
      {
        // let token = rand::random::<u64>() — using the non-CSPRNG path
        // for a security-named binding.
        name: 'random-for-token',
        regex:
          /\blet\s+(?:token|secret|nonce|session_id|csrf|key|api_key)\s*[:=][^\n]*(?:rand::random|thread_rng\(\))/gi,
      },
    ],
  },
];
