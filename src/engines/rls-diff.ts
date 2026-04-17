import type { Finding, FileContext } from '../core/types.js';
import { offsetToLineCol } from '../core/types.js';

const IDENT = `(?:"[^"]+"|\\w+)`;
const QUALIFIED = `(?:${IDENT}(?:\\.${IDENT})?)`;

const RE_CREATE_TABLE = new RegExp(
  `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${QUALIFIED})`,
  'gi',
);
const RE_ENABLE_RLS = new RegExp(
  `alter\\s+table\\s+(?:if\\s+exists\\s+)?(${QUALIFIED})\\s+enable\\s+row\\s+level\\s+security`,
  'gi',
);

const SUPABASE_INTERNAL_SCHEMAS = new Set([
  'auth',
  'storage',
  'realtime',
  'vault',
  'extensions',
  'graphql',
  'graphql_public',
  'pgsodium',
  'pgsodium_masks',
  'supabase_functions',
  'supabase_migrations',
  'net',
  'pgbouncer',
  'information_schema',
  'pg_catalog',
]);

interface TableRecord {
  name: string;
  offset: number;
}

function normalizeTable(raw: string): string {
  const cleaned = raw.replace(/"/g, '').trim().toLowerCase();
  return cleaned.includes('.') ? cleaned : `public.${cleaned}`;
}

function schemaOf(normalizedName: string): string {
  const idx = normalizedName.indexOf('.');
  return idx >= 0 ? normalizedName.slice(0, idx) : 'public';
}

export function scanRlsDisabled(
  ctx: FileContext,
  ruleId = 'vh-supabase-rls-disabled',
): Finding[] {
  const src = ctx.content;

  const created = new Map<string, TableRecord>();
  RE_CREATE_TABLE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_CREATE_TABLE.exec(src)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    const name = normalizeTable(raw);
    if (!created.has(name)) {
      created.set(name, { name, offset: m.index });
    }
  }

  const enabled = new Set<string>();
  RE_ENABLE_RLS.lastIndex = 0;
  while ((m = RE_ENABLE_RLS.exec(src)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    enabled.add(normalizeTable(raw));
  }

  const findings: Finding[] = [];
  for (const [name, rec] of created) {
    if (enabled.has(name)) continue;
    if (SUPABASE_INTERNAL_SCHEMAS.has(schemaOf(name))) continue;

    const { line, column } = offsetToLineCol(src, rec.offset);
    findings.push({
      ruleId,
      severity: 'critical',
      category: 'database',
      file: ctx.path,
      line,
      column,
      snippet: `create table ${name}`,
      message: `Table ${name} created without RLS enabled`,
      remediation: `alter table ${name} enable row level security;`,
      metadata: { table: name, schema: schemaOf(name) },
    });
  }
  return findings;
}
