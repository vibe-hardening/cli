import type { SecretRule } from '../engines/secret-regex.js';

export const INJECTION_RULES: SecretRule[] = [
  {
    id: 'vh-inj-sql-template',
    severity: 'critical',
    category: 'injection',
    message: 'SQL query built by string-interpolating user input (SQL injection)',
    remediation:
      'Use parameterised queries ($1 / ? placeholders) or a query builder. Never concatenate user input into SQL.',
    patterns: [
      {
        name: 'template-literal',
        regex:
          /(?:db|client|pool|conn|sql|prisma|knex)\s*\.\s*(?:query|execute|raw|$queryRaw|$executeRaw)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
      },
    ],
  },
  {
    id: 'vh-inj-nosql-dollar',
    severity: 'high',
    category: 'injection',
    message:
      'MongoDB / NoSQL query directly uses req.body or req.query as an object (NoSQL injection)',
    remediation:
      'Coerce to primitives (e.g. String(req.body.email)) or validate the shape with zod / joi before passing to the query.',
    patterns: [
      {
        name: 'mongo-req',
        regex:
          /\.(?:find|findOne|findOneAndUpdate|updateOne|updateMany|deleteOne|deleteMany|aggregate)\w*\s*\(\s*\{[^}]*:\s*req\.(?:body|query|params)\./g,
      },
    ],
  },
  {
    id: 'vh-inj-cmd-exec',
    severity: 'critical',
    category: 'injection',
    message: 'child_process.exec / execSync called with string-interpolated user input (RCE)',
    remediation:
      'Use execFile / spawn with an argv array instead. Never pass user input through a shell.',
    patterns: [
      {
        name: 'exec-template',
        regex:
          /\b(?:exec|execSync|spawnSync)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
      },
    ],
  },
  {
    id: 'vh-inj-path-traversal',
    severity: 'high',
    category: 'injection',
    message:
      'fs.readFile / createReadStream / sendFile called with raw request parameter (path traversal)',
    remediation:
      'Resolve the path against a fixed base and reject anything that escapes it: const safe = path.resolve(BASE, req.query.p); if (!safe.startsWith(BASE)) throw new Error().',
    patterns: [
      {
        name: 'fs-req',
        regex:
          /\bfs\.(?:readFile|createReadStream|sendFile|readFileSync|readdir|readdirSync)\s*\(\s*(?:req|request|params|ctx\.request)\.(?:query|body|params)/g,
      },
    ],
  },
  {
    id: 'vh-inj-eval-user-input',
    severity: 'critical',
    category: 'injection',
    message:
      'eval / Function constructor receives request data — arbitrary code execution',
    remediation:
      'Never eval user input. If you need a tiny expression evaluator, use a safe library like `mathjs` or a hand-written parser. There is no safe configuration of eval() with untrusted input.',
    patterns: [
      {
        // eval(req.body.X) / eval(req.query.X) / eval(req.params.X)
        name: 'eval-req',
        regex: /\beval\s*\(\s*req\.(?:body|query|params)\./g,
      },
      {
        // new Function(req.body.X) and Function(req.body.X). Both
        // forms compile a string into executable code at runtime.
        name: 'function-req',
        regex: /\b(?:new\s+)?Function\s*\(\s*[^)]*req\.(?:body|query|params)\./g,
      },
    ],
  },
  {
    id: 'vh-inj-xss-dangerous-html',
    severity: 'high',
    category: 'injection',
    message:
      'dangerouslySetInnerHTML receives an expression that is not wrapped in a sanitiser (DOMPurify / xss)',
    remediation:
      'Wrap the HTML in DOMPurify.sanitize() or render it as plain React children. Never trust user-provided HTML.',
    patterns: [
      {
        // Lookahead placed BEFORE \s* to prevent whitespace backtracking
        // from stepping past the sanitizer check (regression test
        // "passes on DOMPurify-sanitised inner html").
        name: 'react-dangerous',
        regex:
          /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:(?!\s*(?:DOMPurify|sanitize|sanitizeHtml|xss|escapeHtml))\s*[^}]+\}/g,
      },
    ],
  },
];
