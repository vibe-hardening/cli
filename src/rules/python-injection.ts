import type { SecretRule } from '../engines/secret-regex.js';

/**
 * Python-specific injection rules. Applied to `.py` files.
 * Regex-based for Phase 2 MVP — AST parsing via tree-sitter-python
 * lands in Phase 3 once the rule set is empirically stable.
 */
export const PYTHON_INJECTION_RULES: SecretRule[] = [
  {
    id: 'vh-py-inj-sql-fstring',
    severity: 'critical',
    category: 'injection',
    message: 'SQL query built by f-string / .format() with user input (SQL injection)',
    remediation:
      'Use parameterised queries with placeholders (? / %s / :param) or an ORM. Never interpolate user input into SQL literals.',
    patterns: [
      {
        name: 'fstring',
        regex:
          /(?:cursor|conn|db|session)\.execute\s*\(\s*f["'][^"']*\{[^}]+\}[^"']*["']/g,
      },
      {
        name: 'format',
        regex:
          /(?:cursor|conn|db|session)\.execute\s*\(\s*["'][^"']*\{\}[^"']*["']\.format\(/g,
      },
      {
        name: 'concat',
        regex:
          /(?:cursor|conn|db|session)\.execute\s*\(\s*["'][^"']+["']\s*\+\s*(?:request\.|user_input|params\[|args\.)/g,
      },
    ],
  },
  {
    id: 'vh-py-inj-cmd-shell',
    severity: 'critical',
    category: 'injection',
    message: 'subprocess / os.system with shell=True and user input (RCE)',
    remediation:
      'Use subprocess.run with a list argument and shell=False. Never pass user input through a shell.',
    patterns: [
      {
        name: 'subprocess-shell',
        regex:
          /subprocess\.(?:call|run|Popen|check_output|check_call)\s*\([^)]*shell\s*=\s*True[^)]*\)/g,
      },
      {
        name: 'os-system',
        regex:
          /os\.system\s*\(\s*(?:f["']|["'][^"']+["']\s*\+|\w+\s*%)/g,
      },
      {
        name: 'popen-fstring',
        regex:
          /os\.popen\s*\(\s*f["'][^"']*\{[^}]+\}/g,
      },
    ],
  },
  {
    id: 'vh-py-eval-exec-user-input',
    severity: 'critical',
    category: 'injection',
    message: 'eval() / exec() / compile() called with user input (arbitrary code execution)',
    remediation:
      'Never call eval, exec, or compile on untrusted data. Use ast.literal_eval for literal parsing or a safe expression evaluator.',
    patterns: [
      {
        name: 'eval-req',
        regex:
          /\b(?:eval|exec|compile)\s*\(\s*(?:request\.|user_input|params\[|args\.|input\()/g,
      },
    ],
  },
  {
    id: 'vh-py-inj-path-traversal',
    severity: 'high',
    category: 'injection',
    message: 'open() / send_file() with raw request parameter (path traversal)',
    remediation:
      'Resolve with os.path.realpath and reject paths that escape a fixed base. Flask send_from_directory, FastAPI FileResponse, and Django FileResponse do this for you when used correctly.',
    patterns: [
      {
        name: 'open-req',
        regex:
          /\b(?:open|send_file|FileResponse)\s*\(\s*(?:request\.args|request\.form|request\.json|request\.query_params|body\.|params\[)/g,
      },
    ],
  },
  {
    id: 'vh-py-yaml-load-unsafe',
    severity: 'high',
    category: 'injection',
    message: 'yaml.load called without a safe loader (arbitrary Python object instantiation)',
    remediation:
      'Replace with yaml.safe_load(data). yaml.load without Loader=SafeLoader lets attackers construct arbitrary Python objects.',
    patterns: [
      {
        name: 'yaml-load',
        regex:
          /yaml\.load\s*\((?![^)]*Loader\s*=\s*(?:yaml\.)?SafeLoader)/g,
      },
    ],
  },
  {
    id: 'vh-py-pickle-user-input',
    severity: 'critical',
    category: 'injection',
    message: 'pickle.loads / pickle.load with user-controlled bytes (arbitrary code execution)',
    remediation:
      'Pickle is not safe on untrusted input. Use json, msgpack, or a signed/verified payload format.',
    patterns: [
      {
        name: 'pickle-loads',
        regex:
          /pickle\.(?:loads?|Unpickler)\s*\(\s*(?:request\.|body|params\[|cookie|base64\.b64decode\(request\.)/g,
      },
    ],
  },
];
