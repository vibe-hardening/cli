import type { SecretRule } from '../engines/secret-regex.js';

export const PYTHON_AUTH_RULES: SecretRule[] = [
  {
    id: 'vh-py-django-debug-true',
    severity: 'high',
    category: 'config',
    message: 'Django DEBUG = True in settings (leaks stack traces + environment)',
    remediation:
      'Read DEBUG from an environment variable and default False. An exception in production with DEBUG=True exposes the settings module, including secrets.',
    patterns: [
      {
        // Trailing `# comment` is common in Python settings.
        name: 'debug-literal',
        regex: /^\s*DEBUG\s*=\s*True\s*(?:#[^\n]*)?$/m,
      },
    ],
  },
  {
    id: 'vh-py-django-secret-key',
    severity: 'critical',
    category: 'secret',
    message: 'Django SECRET_KEY hardcoded in settings',
    remediation:
      'Read SECRET_KEY from an environment variable. The key signs session cookies, password reset tokens, and CSRF tokens — leaking it compromises all three.',
    patterns: [
      {
        name: 'secret-literal',
        regex: /^\s*SECRET_KEY\s*=\s*["'][A-Za-z0-9_\-!@#$%^&*()]{16,}["']/m,
      },
    ],
  },
  {
    id: 'vh-py-django-allowed-hosts-wildcard',
    severity: 'medium',
    category: 'config',
    message: 'Django ALLOWED_HOSTS contains "*" (host header attacks)',
    remediation:
      'Restrict ALLOWED_HOSTS to specific hostnames. Wildcards let attackers supply Host headers that poison cached pages and reset-password emails.',
    patterns: [
      {
        name: 'wildcard',
        regex: /^\s*ALLOWED_HOSTS\s*=\s*\[[^\]]*["']\*["'][^\]]*\]/m,
      },
    ],
  },
  {
    id: 'vh-py-flask-debug-run',
    severity: 'high',
    category: 'config',
    message: 'Flask app.run(debug=True) in production-like context',
    remediation:
      'Never ship with debug=True. The Werkzeug debugger allows arbitrary Python execution via the browser debugger page.',
    patterns: [
      {
        name: 'debug-run',
        regex: /\.run\s*\([^)]*debug\s*=\s*True[^)]*\)/g,
      },
    ],
  },
  {
    id: 'vh-py-fastapi-route-no-depends',
    severity: 'medium',
    category: 'auth',
    message: 'FastAPI route handler has no Depends(get_current_user) or auth decorator',
    remediation:
      'Add an auth dependency: def handler(..., user=Depends(get_current_user)). Without it, anonymous clients can hit protected endpoints.',
    patterns: [
      // Heuristic: @app.{method}(...) followed within 3 lines by def ... missing Depends
      {
        name: 'fastapi-route-no-depends',
        regex:
          /@(?:app|router)\.(?:get|post|put|delete|patch)\s*\([^)]*\)\s*\n(?:\s*#[^\n]*\n)*\s*(?:async\s+)?def\s+\w+\s*\((?!(?:[^)]*\bDepends\()|[^)]*\btoken\s*:\s*)[^)]*\)/g,
      },
    ],
  },
  {
    id: 'vh-py-jwt-algorithm-none',
    severity: 'critical',
    category: 'auth',
    message: "JWT decode allows algorithm 'none'",
    remediation:
      "Pin algorithms: jwt.decode(token, key, algorithms=['HS256']). 'none' lets attackers forge any token.",
    patterns: [
      {
        name: 'jwt-none',
        regex:
          /jwt\.decode\s*\([^)]*algorithms\s*=\s*\[[^\]]*['"]none['"][^\]]*\]/g,
      },
      {
        name: 'verify-false',
        regex:
          /jwt\.decode\s*\([^)]*verify\s*=\s*False/g,
      },
    ],
  },
  {
    id: 'vh-py-hardcoded-password',
    severity: 'high',
    category: 'secret',
    message: 'Password hardcoded in source',
    remediation:
      'Load the password from an environment variable or a secret manager. Rotate any leaked value.',
    patterns: [
      {
        name: 'pw-literal',
        // Capture group 1 = just the secret value, so substring /
        // entropy checks run only on the literal, not the variable
        // name (otherwise the word "password" itself disqualifies
        // every match).
        regex:
          /(?:password|passwd|pwd|api_key|apikey)\s*=\s*["']([^"'\s]{8,})["']/gi,
        captureGroup: 1,
        minEntropy: 3.2,
        disallowSubstrings: [
          'your',
          'placeholder',
          'changeme',
          'example',
          'xxxxxx',
          '<your',
          'fake',
          'dummy',
          '123456',
          'yourpassword',
        ],
      },
    ],
  },
  {
    id: 'vh-py-django-csrf-exempt',
    severity: 'medium',
    category: 'auth',
    message: '@csrf_exempt decorator disables Django CSRF protection on a view',
    remediation:
      'Use @csrf_exempt only for view-by-view integration with non-browser clients. Pair with strong bearer-token auth or the exemption becomes a vulnerability.',
    patterns: [
      {
        name: 'csrf-exempt',
        regex: /@csrf_exempt\b/g,
      },
    ],
  },
];
