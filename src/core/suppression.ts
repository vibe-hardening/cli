import type { FileContext, Finding } from './types.js';

/**
 * Parses a file's source and returns a per-line map of disable
 * directives. Two forms are supported:
 *
 *   // vibe-hardening-disable-next-line
 *   // vibe-hardening-disable-next-line vh-secret-openai,vh-cors-*
 *
 * The directive applies to findings reported on the *next* line. Empty
 * rule-id list means "suppress any finding on the next line".
 *
 * Block-form directives (file-wide / begin-end) are out of scope for
 * the preview release.
 */
const RE_DIRECTIVE =
  /\/[/*]\s*vibe-hardening-disable-next-line(?:\s+([a-z0-9,\-*\s]+))?/i;

interface Directive {
  lineAffected: number; // the line number the directive suppresses
  ruleIds: string[] | 'all';
}

function parseDirectives(content: string): Directive[] {
  const directives: Directive[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = RE_DIRECTIVE.exec(lines[i]!);
    if (!match) continue;
    const argStr = match[1];
    let ruleIds: string[] | 'all' = 'all';
    if (argStr && argStr.trim().length > 0) {
      const parsed = argStr
        .split(',')
        // Extract the leading identifier / glob from each segment so
        // block-comment close `*/` or trailing whitespace doesn't
        // contaminate the rule-id.
        .map((s) => /^\s*([a-z][a-z0-9\-]*\*?)/i.exec(s)?.[1] ?? '')
        .filter((s) => s.length > 0);
      if (parsed.length > 0) ruleIds = parsed;
    }
    directives.push({ lineAffected: i + 2, ruleIds });
  }
  return directives;
}

function ruleMatches(pattern: string, ruleId: string): boolean {
  if (pattern === ruleId) return true;
  if (pattern.endsWith('*')) {
    return ruleId.startsWith(pattern.slice(0, -1));
  }
  return false;
}

export function applySuppressions(
  files: FileContext[],
  findings: Finding[],
): Finding[] {
  const byFile = new Map<string, Directive[]>();
  for (const f of files) {
    const d = parseDirectives(f.content);
    if (d.length > 0) byFile.set(f.path, d);
  }

  return findings.filter((f) => {
    const dirs = byFile.get(f.file);
    if (!dirs) return true;
    const hit = dirs.find((d) => d.lineAffected === f.line);
    if (!hit) return true;
    if (hit.ruleIds === 'all') return false;
    return !hit.ruleIds.some((p) => ruleMatches(p, f.ruleId));
  });
}

// exported for tests
export const __test = { parseDirectives };
