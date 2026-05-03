import type { SecretRule } from '../engines/secret-regex.js';

/**
 * Auth / crypto / config rules for Go.
 *
 * Covers the patterns AI tools generate that produce silently-broken
 * security: TLS verification disabled "to test", JWT signed with
 * `alg: none` accepted, bcrypt cost too low, HMAC compared with `==`
 * (timing attack), and HTTP servers without read/write timeouts
 * (slowloris).
 */
export const GO_AUTH_RULES: SecretRule[] = [
  {
    id: 'vh-go-tls-skip-verify',
    severity: 'critical',
    category: 'config',
    message:
      'TLS certificate verification disabled (`InsecureSkipVerify: true`) — MITM attacks go through unchallenged',
    remediation:
      'Remove `InsecureSkipVerify: true` and use a properly-rooted CA bundle. If you need to talk to a self-signed dev server, use a custom RootCAs pool, not skip-verify.',
    patterns: [
      {
        name: 'insecure-skip-verify',
        regex: /\bInsecureSkipVerify\s*:\s*true\b/g,
      },
    ],
  },
  {
    id: 'vh-go-jwt-alg-none',
    severity: 'critical',
    category: 'auth',
    message:
      'JWT verifier callback returns key without checking `token.Method` — `alg: none` tokens accepted',
    remediation:
      'In your `keyFunc`, assert `token.Method` is the expected algorithm, e.g. `if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok { return nil, fmt.Errorf("unexpected alg") }`.',
    patterns: [
      {
        // jwt.Parse callback that immediately returns the key without a
        // type assertion on token.Method — accepts alg=none. Common AI
        // copy-paste pattern.
        name: 'jwt-no-alg-check',
        regex:
          /\bjwt\.Parse\w*\s*\([^,]+,\s*func\s*\([^)]*\)\s*\(\s*interface\{\}\s*,\s*error\s*\)\s*\{\s*return\s+\[\]byte/g,
      },
    ],
  },
  {
    id: 'vh-go-bcrypt-low-cost',
    severity: 'high',
    category: 'auth',
    message:
      'bcrypt cost < 10 — easily brute-forceable on modern GPUs',
    remediation:
      'Use cost 10 minimum, 12 recommended. `bcrypt.GenerateFromPassword(pwd, 12)`. `bcrypt.MinCost` is 4 — never use it in production.',
    patterns: [
      {
        // bcrypt.GenerateFromPassword(pwd, 4) — single-digit cost or
        // `bcrypt.MinCost`.
        name: 'bcrypt-low',
        regex:
          /\bbcrypt\.GenerateFromPassword\s*\(\s*[^,)]+,\s*(?:bcrypt\.MinCost|[0-9])\s*\)/g,
      },
    ],
  },
  {
    id: 'vh-go-hmac-not-timing-safe',
    severity: 'high',
    category: 'auth',
    message:
      'HMAC / signature compared with `==` or `bytes.Equal` — timing attack',
    remediation:
      'Use `hmac.Equal(a, b)` for HMAC comparison and `subtle.ConstantTimeCompare(a, b) == 1` for any other secret-byte compare. `==` and `bytes.Equal` short-circuit on first mismatching byte and leak length / position info via timing.',
    patterns: [
      {
        // bytes.Equal(hmacResult, expected) — timing-leaky.
        name: 'bytes-equal-on-mac',
        regex:
          /\bbytes\.Equal\s*\(\s*\w*(?:[Mm]ac|[Ss]ig|[Hh]mac|[Tt]oken|[Ss]ignature)\w*\s*,/g,
      },
    ],
  },
  {
    id: 'vh-go-insecure-random-token',
    severity: 'high',
    category: 'auth',
    message:
      'math/rand used in security context — predictable, NOT cryptographically random',
    remediation:
      'For tokens / session IDs / secrets / nonces, use `crypto/rand` (`rand.Read`). `math/rand` is for non-security simulations only.',
    patterns: [
      {
        // math/rand call assigned to a variable named like a security
        // artefact.
        name: 'mathrand-for-token',
        regex:
          /\b(?:token|secret|nonce|sessionID|sessionId|csrf|key)\s*[:=]\s*[^\n]*math\/rand|\b(?:token|secret|nonce|sessionID|sessionId|csrf|key)\s*[:=]\s*[^\n]*rand\.(?:Int|Intn|Int31|Int63|Float)/gi,
      },
    ],
  },
  {
    id: 'vh-go-http-no-timeout',
    severity: 'medium',
    category: 'config',
    message:
      'http.ListenAndServe / http.Server without ReadTimeout / WriteTimeout — slowloris DoS',
    remediation:
      'Configure an `&http.Server{ Addr: ..., ReadTimeout: 5 * time.Second, WriteTimeout: 10 * time.Second, ... }`. The convenience `http.ListenAndServe(addr, h)` accepts no timeouts.',
    patterns: [
      {
        // Bare http.ListenAndServe call — convenience function with no
        // timeout configurability.
        name: 'listen-and-serve',
        regex: /\bhttp\.ListenAndServe(?:TLS)?\s*\(\s*["']/g,
      },
    ],
  },
  {
    // Split from a single rule into two — the previous design used
    // `disallowSubstrings: ['Secure: true', 'HttpOnly: true']` which the
    // engine evaluates with `.some()`, meaning it skipped the finding
    // if EITHER flag was present. A cookie with `Secure: true` but no
    // `HttpOnly: true` was silently passed. Now each flag has its own
    // rule so a partially-hardened cookie still flags the missing half.
    id: 'vh-go-cookie-missing-secure',
    severity: 'medium',
    category: 'auth',
    message:
      '`http.Cookie` for session / auth set without `Secure: true` — cookie sent over plain HTTP',
    remediation:
      'Add `Secure: true` to the `http.Cookie{}` literal. Combined with `HttpOnly: true` and `SameSite: http.SameSiteLaxMode` for full hardening.',
    patterns: [
      {
        name: 'cookie-no-secure',
        regex:
          /\bhttp\.SetCookie\s*\(\s*\w+\s*,\s*&http\.Cookie\s*\{\s*[^}]{0,400}Name\s*:\s*"(?:session|auth|sid|jwt|token)"[^}]{0,400}\}\s*\)/g,
        disallowSubstrings: ['Secure: true'],
      },
    ],
  },
  {
    id: 'vh-go-cookie-missing-httponly',
    severity: 'medium',
    category: 'auth',
    message:
      '`http.Cookie` for session / auth set without `HttpOnly: true` — cookie readable from JS, every XSS becomes session hijack',
    remediation:
      'Add `HttpOnly: true` to the `http.Cookie{}` literal so document.cookie cannot read it from a compromised page.',
    patterns: [
      {
        name: 'cookie-no-httponly',
        regex:
          /\bhttp\.SetCookie\s*\(\s*\w+\s*,\s*&http\.Cookie\s*\{\s*[^}]{0,400}Name\s*:\s*"(?:session|auth|sid|jwt|token)"[^}]{0,400}\}\s*\)/g,
        disallowSubstrings: ['HttpOnly: true'],
      },
    ],
  },
];
