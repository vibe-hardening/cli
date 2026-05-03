import type { SecretRule } from '../engines/secret-regex.js';

/**
 * Injection rules for Go.
 *
 * Targets the patterns AI tools (Cursor / Claude Code / Copilot) most
 * commonly produce when generating Go server code:
 *   - SQL queries built with string concatenation or `fmt.Sprintf`
 *   - `exec.Command("sh", "-c", userInput)` shell injection
 *   - `template.HTML(userInput)` raw cast
 *   - Path operations on user-controlled paths without `filepath.Clean`
 *
 * These are pattern-match heuristics. Some legitimate uses
 * (parameterised templates, validated inputs) will still match — pair
 * with `// vibe-hardening-disable-next-line` to suppress false positives.
 */
export const GO_INJECTION_RULES: SecretRule[] = [
  {
    id: 'vh-go-inj-sql-concat',
    severity: 'critical',
    category: 'injection',
    message:
      'SQL query built by string concatenation with user input — SQL injection',
    remediation:
      'Use parameterised queries: `db.Query("SELECT ... WHERE id = ?", userID)`. Never concatenate user input into SQL.',
    patterns: [
      {
        // db.Query / db.Exec / db.QueryRow / Tx.Query etc. with `+ x` style concat
        // inside the first arg. Captures `.Query("..." + something)` and
        // `.Exec("..." + something)`.
        name: 'sql-concat',
        regex:
          /\b(?:db|tx|conn|sql)\.(?:Query|QueryRow|QueryContext|QueryRowContext|Exec|ExecContext|Prepare)\w*\s*\(\s*[^,)]*"[^"]*"\s*\+\s*\w/g,
      },
    ],
  },
  {
    id: 'vh-go-inj-sql-sprintf',
    severity: 'critical',
    category: 'injection',
    message:
      'SQL query built with fmt.Sprintf — bypasses driver parameterisation, SQL injection',
    remediation:
      'Replace `fmt.Sprintf("SELECT ... %s", x)` with parameterised queries. Sprintf gives no escaping; the database driver does.',
    patterns: [
      {
        // .Query/.Exec(fmt.Sprintf(...)) — the SQL is built via Sprintf
        // before reaching the driver, defeating the whole point of
        // prepared statements.
        name: 'sql-sprintf',
        regex:
          /\b(?:db|tx|conn|sql)\.(?:Query|QueryRow|QueryContext|QueryRowContext|Exec|ExecContext|Prepare)\w*\s*\(\s*fmt\.Sprintf\s*\(\s*"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|UNION|DROP)/gi,
      },
    ],
  },
  {
    id: 'vh-go-inj-cmd-exec',
    severity: 'critical',
    category: 'injection',
    message:
      'exec.Command with `sh -c` / `bash -c` plus user-controlled string — shell injection',
    remediation:
      'Use `exec.Command(binary, arg1, arg2, ...)` form with each arg as a separate value. Never pass `sh -c "..."` with interpolated user input.',
    patterns: [
      {
        // exec.Command("sh", "-c", "git clone " + userRepo) and
        // exec.Command("bash", "-c", fmt.Sprintf(...))
        name: 'sh-c-concat',
        regex:
          /\bexec\.Command\s*\(\s*"(?:sh|bash|zsh|cmd)"\s*,\s*"-c"\s*,\s*[^)]*(?:\+|fmt\.Sprintf)/g,
      },
    ],
  },
  {
    id: 'vh-go-inj-path-traversal',
    severity: 'high',
    category: 'injection',
    message:
      'File path built from user input without validation — path traversal',
    remediation:
      'Use `filepath.Clean` then `filepath.Rel` against an allow-rooted base; reject paths that escape the base. Also reject paths containing `..`.',
    patterns: [
      {
        // os.Open / os.ReadFile / ioutil.ReadFile / os.Remove with concat
        // including a likely user-controlled token.
        name: 'os-path-concat',
        regex:
          /\b(?:os|ioutil)\.(?:Open|OpenFile|ReadFile|Remove|RemoveAll|Create)\s*\(\s*[^,)]*"[^"]*"\s*\+\s*\w+/g,
      },
    ],
  },
  {
    id: 'vh-go-inj-template-html-user',
    severity: 'high',
    category: 'injection',
    message:
      'template.HTML or template.JS cast on user input — escapes the safety net of html/template',
    remediation:
      'Pass the value as a regular string to `html/template`; the package will escape it. Only cast to `template.HTML` for content you control.',
    patterns: [
      {
        name: 'template-html-cast',
        regex:
          /\btemplate\.(?:HTML|JS|JSStr|URL|HTMLAttr)\s*\(\s*(?:r\.|req\.|c\.|ctx\.)/g,
      },
    ],
  },
];
