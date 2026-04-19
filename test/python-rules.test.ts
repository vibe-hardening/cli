import { describe, it, expect } from 'vitest';
import { scanSecrets } from '../src/engines/secret-regex.js';
import { PYTHON_INJECTION_RULES } from '../src/rules/python-injection.js';
import { PYTHON_AUTH_RULES } from '../src/rules/python-auth.js';

function scan(
  rules: typeof PYTHON_INJECTION_RULES,
  path: string,
  content: string,
) {
  return scanSecrets({ path, content }, rules);
}

describe('python injection rules', () => {
  it('fires on SQL injection via f-string', () => {
    const src = `cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-sql-fstring')).toBe(true);
  });

  it('fires on SQL injection via .format()', () => {
    const src = `cursor.execute("SELECT * FROM users WHERE id = {}".format(user_id))`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-sql-fstring')).toBe(true);
  });

  it('fires on SQLAlchemy engine.execute f-string', () => {
    const src = `engine.execute(f"SELECT * FROM users WHERE id = {uid}")`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-sql-fstring')).toBe(true);
  });

  it('fires on SQLAlchemy engine.execute(text(f"..."))', () => {
    const src = `engine.execute(text(f"SELECT {col} FROM users"))`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-sql-fstring')).toBe(true);
  });

  it('passes on parameterised query', () => {
    const src = `cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-sql-fstring')).toBe(false);
  });

  it('fires on subprocess shell=True', () => {
    const src = `subprocess.run(cmd, shell=True)`;
    const f = scan(PYTHON_INJECTION_RULES, 'worker.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-cmd-shell')).toBe(true);
  });

  it('fires on bare run() from `from subprocess import run`', () => {
    const src = `from subprocess import run\nrun("ls " + user_input, shell=True)`;
    const f = scan(PYTHON_INJECTION_RULES, 'worker.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-cmd-shell')).toBe(true);
  });

  it('fires on bare Popen() from `from subprocess import Popen`', () => {
    const src = `Popen(cmd, shell=True)`;
    const f = scan(PYTHON_INJECTION_RULES, 'worker.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-cmd-shell')).toBe(true);
  });

  it('fires on os.system with user input', () => {
    const src = `os.system("ls " + path)`;
    const f = scan(PYTHON_INJECTION_RULES, 'worker.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-inj-cmd-shell')).toBe(true);
  });

  it('fires on eval(request.*)', () => {
    const src = `result = eval(request.args.get("expr"))`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-eval-exec-user-input')).toBe(
      true,
    );
  });

  it('fires on open() with request parameter (path traversal)', () => {
    const src = `with open(request.args.get("file")) as f:`;
    const ff = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(ff.some((x) => x.ruleId === 'vh-py-inj-path-traversal')).toBe(true);
  });

  it('fires on yaml.load without SafeLoader', () => {
    const src = `data = yaml.load(body)`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-yaml-load-unsafe')).toBe(true);
  });

  it('passes on yaml.safe_load', () => {
    const src = `data = yaml.safe_load(body)`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-yaml-load-unsafe')).toBe(false);
  });

  it('fires on pickle.loads(request.*)', () => {
    const src = `obj = pickle.loads(request.body)`;
    const f = scan(PYTHON_INJECTION_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-pickle-user-input')).toBe(true);
  });
});

describe('python auth / config rules', () => {
  it('fires on Django DEBUG = True', () => {
    const src = `DEBUG = True\n`;
    const f = scan(PYTHON_AUTH_RULES, 'settings.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-django-debug-true')).toBe(true);
  });

  it('passes on DEBUG = os.getenv', () => {
    const src = `DEBUG = os.getenv("DEBUG") == "true"`;
    const f = scan(PYTHON_AUTH_RULES, 'settings.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-django-debug-true')).toBe(false);
  });

  it('fires on DEBUG = True with inline # comment (round-5 regression)', () => {
    const src = `DEBUG = True  # for dev`;
    const f = scan(PYTHON_AUTH_RULES, 'settings.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-django-debug-true')).toBe(true);
  });

  it('fires on hardcoded SECRET_KEY', () => {
    const src = `SECRET_KEY = 'django-insecure-AbCdEfGhIjKlMnOpQrStUvWxYz'\n`;
    const f = scan(PYTHON_AUTH_RULES, 'settings.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-django-secret-key')).toBe(true);
  });

  it('fires on ALLOWED_HOSTS wildcard', () => {
    const src = `ALLOWED_HOSTS = ['*']\n`;
    const f = scan(PYTHON_AUTH_RULES, 'settings.py', src);
    expect(
      f.some((x) => x.ruleId === 'vh-py-django-allowed-hosts-wildcard'),
    ).toBe(true);
  });

  it('fires on Flask app.run(debug=True)', () => {
    const src = `app.run(debug=True, host="0.0.0.0")`;
    const f = scan(PYTHON_AUTH_RULES, 'main.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-flask-debug-run')).toBe(true);
  });

  it("fires on jwt.decode algorithms=['none']", () => {
    const src = `jwt.decode(token, key, algorithms=['none', 'HS256'])`;
    const f = scan(PYTHON_AUTH_RULES, 'auth.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-jwt-algorithm-none')).toBe(true);
  });

  it('fires on jwt.decode verify=False', () => {
    const src = `jwt.decode(token, verify=False)`;
    const f = scan(PYTHON_AUTH_RULES, 'auth.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-jwt-algorithm-none')).toBe(true);
  });

  it('fires on hardcoded password', () => {
    const src = `password = "RealP4ssw0rd!"`;
    const f = scan(PYTHON_AUTH_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-hardcoded-password')).toBe(true);
  });

  it('passes on placeholder password', () => {
    const src = `password = "your_password_here"`;
    const f = scan(PYTHON_AUTH_RULES, 'app.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-hardcoded-password')).toBe(false);
  });

  it('fires on @csrf_exempt decorator', () => {
    const src = `@csrf_exempt\ndef view(request): pass`;
    const f = scan(PYTHON_AUTH_RULES, 'views.py', src);
    expect(f.some((x) => x.ruleId === 'vh-py-django-csrf-exempt')).toBe(true);
  });
});
