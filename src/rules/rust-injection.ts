import type { SecretRule } from '../engines/secret-regex.js';

/**
 * Injection rules for Rust.
 *
 * Targets the patterns AI tools (Cursor / Claude Code / Copilot) most
 * commonly produce when generating Rust server / CLI code:
 *   - SQL queries built with `format!()` instead of parameter binding
 *   - `Command::new` with shell-spawn + format!()
 *   - `.unwrap()` / `.expect()` on user-controlled inputs (DoS via
 *     panic — Rust's "I'll handle errors later" antipattern)
 *   - Path operations on user-controlled paths
 *   - reqwest / hyper fetch with user-controlled URL (SSRF)
 */
export const RUST_INJECTION_RULES: SecretRule[] = [
  {
    id: 'vh-rs-inj-sql-format',
    severity: 'critical',
    category: 'injection',
    message:
      'SQL query built with `format!()` — bypasses sqlx / diesel / rusqlite parameterisation, SQL injection',
    remediation:
      'Use parameterised queries: `sqlx::query!("SELECT ... WHERE id = $1", id)`, `diesel::sql_query("...").bind::<_, _>(id)`, or `conn.execute("... ?1", params![id])`. format!() gives no escaping.',
    patterns: [
      {
        // sqlx::query / diesel::sql_query / conn.execute / .query passed
        // a format!() macro containing an SQL keyword. This catches the
        // common "I know SQL but not the borrow checker" antipattern.
        name: 'sqlx-format',
        regex:
          /\b(?:sqlx::query|sqlx::query_as|diesel::sql_query|conn\.(?:execute|query|prepare))\w*\s*\(\s*&?\s*format!\s*\(\s*"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|UNION|DROP)/gi,
      },
    ],
  },
  {
    id: 'vh-rs-inj-cmd-format',
    severity: 'critical',
    category: 'injection',
    message:
      'std::process::Command spawn with format!() / user input concat — shell injection',
    remediation:
      'Use `Command::new("git").args(&["clone", &repo_url])` form: each arg as a separate value. Never `.arg(format!("git clone {repo}"))` or `Command::new("sh").arg("-c").arg(format!(...))`.',
    patterns: [
      {
        // Command::new("sh").arg("-c").arg(format!(...)) — chained
        // form. Restrict the gap between method calls to whitespace
        // only so we don't span across multiple statements that just
        // happen to contain the right tokens.
        name: 'sh-c-format',
        regex:
          /\bCommand::new\s*\(\s*"(?:sh|bash|zsh|cmd)"\s*\)\s*\.arg\s*\(\s*"-c"\s*\)\s*\.arg\s*\(\s*format!/g,
      },
      {
        // .arg(format!("... {}", user_input)) on the same chain. Same
        // tight chain-only spacing constraint.
        name: 'arg-format',
        regex:
          /\bCommand::new\s*\([^)]+\)\s*(?:\.arg\s*\([^)]*\)\s*){0,3}\.arg\s*\(\s*format!\s*\(\s*"[^"]*\{/g,
      },
    ],
  },
  {
    id: 'vh-rs-inj-unwrap-user-input',
    severity: 'high',
    category: 'injection',
    message:
      '`.unwrap()` / `.expect()` on user-controlled input — single malformed request panics the process (DoS)',
    remediation:
      'Pattern-match the `Result` / `Option` and return a 4xx response. e.g. `let id = req.match_info().get("id").ok_or(BadRequest)?;`. Never call `.unwrap()` on a value derived from request data.',
    patterns: [
      {
        // .parse::<T>().unwrap() / .unwrap() chained on req-derived
        // values. Heuristic: the line contains `req.` / `request.` /
        // `headers.get(` / `query.` / `body.` somewhere before
        // `.unwrap()` / `.expect()` on the same statement.
        //
        // Length bound `{1,120}` caps the over-match window — long
        // expressions are still caught, but a stray `req.` and an
        // unrelated `.unwrap()` two functions apart can't collide.
        name: 'unwrap-on-req',
        regex:
          /\b(?:req|request|ctx|headers|query|body|payload|params)\.[^;{}\n]{1,120}\.(?:unwrap|expect)\s*\(/g,
      },
    ],
  },
  {
    id: 'vh-rs-inj-path-user',
    severity: 'high',
    category: 'injection',
    message:
      'std::fs path built from user input without canonicalisation — path traversal',
    remediation:
      'Canonicalise: `let p = PathBuf::from(base).join(user_input); let canon = p.canonicalize()?;`. Then verify `canon.starts_with(base)`. Reject otherwise.',
    patterns: [
      {
        // fs::read / fs::open / fs::write / File::open with format!() or
        // PathBuf concat using a likely-user-controlled name.
        name: 'fs-format-path',
        regex:
          /\b(?:std::fs|fs|tokio::fs)::(?:read|read_to_string|read_dir|write|remove_file|remove_dir|File::open|File::create)\s*\(\s*(?:&|format!\s*\()/g,
      },
    ],
  },
  {
    id: 'vh-rs-inj-ssrf-fetch-user',
    severity: 'high',
    category: 'ssrf',
    message:
      'reqwest / hyper fetch with user-controlled URL — server-side request forgery',
    remediation:
      'Validate the URL host against an allow-list, or run the request from a network-isolated worker. Block 169.254.169.254 (cloud metadata), 127.0.0.0/8, 10.0.0.0/8.',
    patterns: [
      {
        // reqwest::get(req.body...) / Client.get(req.body...) — fetch
        // with user input as URL.
        name: 'reqwest-user-url',
        regex:
          /\b(?:reqwest::|Client::new\(\)\.|client\.)(?:get|post|put|patch|delete|head|request)\s*\(\s*[^)]*\b(?:req|request|body|query|params|payload)\.\w/g,
      },
    ],
  },
];
