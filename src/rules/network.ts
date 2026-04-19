import type { SecretRule } from '../engines/secret-regex.js';

export const NETWORK_RULES: SecretRule[] = [
  {
    id: 'vh-cors-wildcard-credentials',
    severity: 'high',
    category: 'cors',
    message:
      "CORS configured with origin: '*' together with credentials: true (browser rejects, but misconfigs still leak)",
    remediation:
      'Use an allow-list array of trusted origins when credentials are enabled.',
    patterns: [
      {
        name: 'cors-object',
        regex:
          /cors\s*\(\s*\{[^}]*origin\s*:\s*['"`]\*['"`][^}]*credentials\s*:\s*true[^}]*\}/g,
      },
      {
        name: 'cors-object-reversed',
        regex:
          /cors\s*\(\s*\{[^}]*credentials\s*:\s*true[^}]*origin\s*:\s*['"`]\*['"`][^}]*\}/g,
      },
    ],
  },
  {
    id: 'vh-cors-reflect-origin',
    severity: 'medium',
    category: 'cors',
    message: 'Access-Control-Allow-Origin reflects req.headers.origin without an allow-list check',
    remediation:
      'Compare req.headers.origin against a hard-coded allow-list before echoing it back in the header.',
    patterns: [
      {
        name: 'reflect-header',
        regex:
          /setHeader\s*\(\s*['"`]Access-Control-Allow-Origin['"`]\s*,\s*req\.headers\.origin/g,
      },
    ],
  },
  {
    id: 'vh-ssrf-fetch-user-url',
    severity: 'high',
    category: 'ssrf',
    message:
      'fetch / axios called with a URL straight from the request (SSRF — attacker can hit internal metadata endpoints)',
    remediation:
      'Validate the host against an allow-list and block private IP ranges (10.x / 172.16.x / 192.168.x / 169.254.x / localhost).',
    patterns: [
      {
        name: 'fetch-req',
        regex:
          /\b(?:fetch|axios(?:\.get|\.post|\.put|\.delete|\.patch)?)\s*\(\s*(?:req|request)\.(?:body|query|params)\./g,
      },
    ],
  },
  {
    id: 'vh-open-redirect',
    severity: 'medium',
    category: 'ssrf',
    message: 'res.redirect / NextResponse.redirect uses a URL taken straight from the request (open redirect)',
    remediation:
      'Validate the target URL against an allow-list of internal paths or hostnames before redirecting.',
    patterns: [
      {
        name: 'redirect-req',
        regex:
          /\b(?:res|response)\.redirect\s*\(\s*req\.(?:query|body|params)\./g,
      },
      {
        name: 'next-redirect-req',
        regex:
          /NextResponse\.redirect\s*\(\s*(?:req|request)\.(?:nextUrl\.searchParams\.get|query|body|params)\(?['"`]?[^)]*\)?/g,
      },
    ],
  },
];
