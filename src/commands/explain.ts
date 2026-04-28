import pc from 'picocolors';
import { SECRET_RULES } from '../rules/secrets.js';
import { INJECTION_RULES } from '../rules/injection.js';
import { NETWORK_RULES } from '../rules/network.js';
import { AUTH_PATTERN_RULES } from '../rules/auth-patterns.js';
import { PYTHON_AUTH_RULES } from '../rules/python-auth.js';
import { PYTHON_INJECTION_RULES } from '../rules/python-injection.js';
import { ABUSE_COSTS } from '../reporters/abuse-costs.js';
import { ENV_VAR_FOR_RULE } from '../fix/suggestions.js';
import type { SecretRule } from '../engines/secret-regex.js';
import type { Category, Severity } from '../core/types.js';
import type { VerifierKind } from '../verifiers/index.js';

interface SpecialRule {
  id: string;
  severity: Severity;
  category: Category;
  message: string;
  remediation: string;
  what: string;
}

// Rules that aren't in the SecretRule[] arrays — AST-based, dynamic, or
// emitted by specialised engines. Authored here so `--explain` covers
// every ruleId a user can possibly see in a finding.
const SPECIAL_RULES: SpecialRule[] = [
  {
    id: 'vh-auth-missing-middleware',
    severity: 'high',
    category: 'auth',
    message: 'HTTP route handler has no auth/session check',
    remediation:
      'Wrap the handler with your auth middleware (getServerSession, requireAuth, etc.) or call it inside the function before any data access.',
    what: 'AST scan of Next.js / Express / Fastify route handlers. Walks the function body up to one helper level deep looking for known auth identifiers (getSession, requireAuth, verifyToken, ...). Skips handlers that perform a shared-secret check (timingSafeEqual on a header).',
  },
  {
    id: 'vh-llm-hallucinated-package',
    severity: 'high',
    category: 'supply-chain',
    message: 'package.json references a package that does not exist on npm',
    remediation:
      'Verify the package name with the AI / docs. Common cause: LLM invented a plausible-looking name. Either install the real package or remove the import.',
    what: 'For each non-builtin import in your package.json, queries the npm registry. A 404 means the package is not published. Hallucinated names are how supply-chain attackers squat plausible typos — see `vh-llm-low-trust-package` for the squatting variant.',
  },
  {
    id: 'vh-llm-low-trust-package',
    severity: 'medium',
    category: 'supply-chain',
    message: 'package has very low downloads / age — possible typosquat',
    remediation:
      'Cross-check the package name against the official docs of the library you intended to use. If it was AI-suggested, the real package may be off by one letter.',
    what: 'Heuristic: package exists on npm but has < 100 weekly downloads AND was published within the last 90 days. Combined with edit-distance similarity to popular packages, this catches typosquats AI tools sometimes invent.',
  },
  {
    id: 'vh-dep-cve-*',
    severity: 'high',
    category: 'supply-chain',
    message: 'dependency has a known CVE in OSV.dev',
    remediation:
      'Run `npm audit fix`, or upgrade the affected package per the advisory. If no fix is available yet, check whether the vulnerable code path is reachable in your app.',
    what: 'For every (name, version) in your lockfile, queries OSV.dev for known vulnerabilities. The actual rule ID is `vh-dep-cve-<CVE-or-GHSA-id>` — explain works on the wildcard prefix.',
  },
  {
    id: 'vh-secret-supabase-service-role',
    severity: 'critical',
    category: 'secret',
    message: 'JWT decoded as a Supabase service_role key',
    remediation:
      'Move the key to a server-only env var (never NEXT_PUBLIC_*). Rotate by generating a new service role key in the Supabase dashboard under Project Settings → API.',
    what: 'Decodes any JWT-shaped string in source files. If the payload\'s `role` field is `service_role`, this fires — service role bypasses every RLS policy and must never reach a browser.',
  },
  {
    id: 'vh-supabase-rls-disabled',
    severity: 'critical',
    category: 'config',
    message: 'Supabase migration creates a table without enabling RLS',
    remediation:
      'Add `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` and at least one policy. Without RLS, the anon key can read/write the table from any browser.',
    what: 'Parses `supabase/migrations/*.sql`. For each `CREATE TABLE` statement, looks for a matching `ENABLE ROW LEVEL SECURITY` somewhere in the same migration. Misses are flagged.',
  },
];

interface RuleEntry {
  id: string;
  severity: Severity;
  category: Category;
  message: string;
  remediation: string;
  patterns?: SecretRule['patterns'];
  verifyKind?: VerifierKind;
  what?: string;
}

function buildLookup(): Map<string, RuleEntry> {
  const map = new Map<string, RuleEntry>();
  const allSecretRules: SecretRule[] = [
    ...SECRET_RULES,
    ...INJECTION_RULES,
    ...NETWORK_RULES,
    ...AUTH_PATTERN_RULES,
    ...PYTHON_AUTH_RULES,
    ...PYTHON_INJECTION_RULES,
  ];
  for (const r of allSecretRules) {
    map.set(r.id, {
      id: r.id,
      severity: r.severity,
      category: r.category,
      message: r.message,
      remediation: r.remediation,
      patterns: r.patterns,
      verifyKind: r.verify?.kind,
    });
  }
  for (const s of SPECIAL_RULES) {
    map.set(s.id, {
      id: s.id,
      severity: s.severity,
      category: s.category,
      message: s.message,
      remediation: s.remediation,
      what: s.what,
    });
  }
  return map;
}

const RULE_LOOKUP = buildLookup();

function severityColor(s: Severity): (text: string) => string {
  switch (s) {
    case 'critical':
      return (t) => pc.bgRed(pc.black(pc.bold(` ${t.toUpperCase()} `)));
    case 'high':
      return (t) => pc.bgYellow(pc.black(pc.bold(` ${t.toUpperCase()} `)));
    case 'medium':
      return (t) => pc.bgBlue(pc.white(` ${t.toUpperCase()} `));
    case 'low':
      return (t) => pc.dim(` ${t.toUpperCase()} `);
    case 'info':
      return (t) => pc.dim(` ${t.toUpperCase()} `);
    default: {
      // Exhaustiveness guard: adding a new Severity in core/types.ts
      // without updating this switch is a compile error (`Type 'string'
      // is not assignable to type 'never'`). The runtime fallback below
      // is only reached if someone bypasses the type system — keep it
      // honest about its arguments by colorising `t`, not `s`.
      const _exhaustive: never = s;
      void _exhaustive;
      return (t) => ` ${t.toUpperCase()} `;
    }
  }
}

export function explainRule(ruleId: string): string | null {
  // Dynamic CVE rules collapse to the wildcard entry.
  const lookupKey = ruleId.startsWith('vh-dep-cve-') ? 'vh-dep-cve-*' : ruleId;
  const r = RULE_LOOKUP.get(lookupKey);
  if (!r) return null;

  const lines: string[] = [];
  lines.push('');
  lines.push(pc.bold(pc.cyan(r.id)));
  lines.push(pc.dim('─'.repeat(60)));
  lines.push(`${severityColor(r.severity)(r.severity)}  ${pc.dim('category:')} ${r.category}`);
  lines.push('');

  lines.push(pc.bold('WHAT IT DETECTS'));
  if (r.what) {
    lines.push(`  ${r.what}`);
  } else if (r.patterns && r.patterns.length > 0) {
    const named = r.patterns
      .map((p) => p.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
    if (named.length > 0) {
      lines.push(
        `  ${r.patterns.length} regex pattern(s): ${named.join(', ')}.`,
      );
    } else {
      lines.push(`  ${r.patterns.length} regex pattern(s).`);
    }
    lines.push(`  ${pc.dim(r.message)}`);
  } else {
    lines.push(`  ${pc.dim(r.message)}`);
  }
  lines.push('');

  // Pull abuse cost / verifier info when present — turns a dry rule
  // entry into an actionable risk briefing for the user.
  if (r.verifyKind) {
    const cost = ABUSE_COSTS[r.verifyKind];
    lines.push(pc.bold('WHY IT MATTERS'));
    lines.push(`  Estimated abuse cost: ${pc.yellow(cost.label)}`);
    lines.push(`  Vector: ${cost.vector}`);
    lines.push(`  ${pc.dim(`Source: ${cost.source}`)}`);
    lines.push('');
  }

  lines.push(pc.bold('HOW TO FIX'));
  lines.push(`  ${r.remediation}`);
  const envVar = ENV_VAR_FOR_RULE[r.id];
  if (envVar) {
    lines.push('');
    lines.push(
      `  ${pc.dim('Tip:')} run ${pc.cyan('vibe-hardening scan --suggest-fix')} to get a copy-paste diff.`,
    );
    lines.push(`  ${pc.dim(`Conventional env var: ${envVar}`)}`);
  }
  lines.push('');

  if (r.verifyKind) {
    lines.push(pc.bold('VERIFICATION'));
    lines.push(
      `  Has live verifier — pair with ${pc.cyan('--verify --own')} to`,
    );
    lines.push(
      `  check whether the leaked key is still valid at the provider.`,
    );
    lines.push('');
  }

  return lines.join('\n');
}

export function runExplainCommand(ruleId: string): number {
  const out = explainRule(ruleId);
  if (out === null) {
    process.stderr.write(
      pc.red(`error: unknown rule id "${ruleId}".\n`) +
        pc.dim(
          '       run `vibe-hardening scan` to see rule IDs in your findings,\n' +
            '       or check https://github.com/vibe-hardening/cli for the full list.\n',
        ),
    );
    return 1;
  }
  process.stdout.write(out + '\n');
  return 0;
}

// Exported so tests can cross-check that every shipped rule id has an
// explanation entry (no orphans). The returned list includes the
// sentinel `vh-dep-cve-*` — all real `vh-dep-cve-<id>` findings collapse
// to it via the wildcard logic in `explainRule`. Consumers iterating
// this list to match against emitted rule IDs should either filter the
// `*` entry or apply the same `startsWith('vh-dep-cve-')` collapse.
export function listKnownRuleIds(): string[] {
  return Array.from(RULE_LOOKUP.keys());
}
