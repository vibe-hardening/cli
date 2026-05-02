import type { ScanReport } from '../core/scan.js';
import type { Finding, Severity } from '../core/types.js';

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: '🔴 CRITICAL',
  high: '🟠 HIGH',
  medium: '🟡 MEDIUM',
  low: '⚪ LOW',
  info: '⚪ INFO',
};

// Severity sort order so the report leads with the worst findings.
// Mirrors the console reporter's ordering — keeps console / markdown /
// HTML/JSON consistent so users moving between formats see the same
// triage prioritisation.
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

// Render inline code that survives a Markdown table cell. Plain
// backtick wrapping breaks when the snippet itself contains a
// backtick (common in JS template literals). The dance with double-
// or triple-backtick fences that GFM specifies for inline code is
// unreliable inside table cells, so we fall back to an HTML <code>
// element with backticks (and HTML-meaningful chars) entity-escaped.
// GFM tables happily render <code> tags.
function inlineCode(s: string): string {
  if (
    !s.includes('`') &&
    !s.includes('<') &&
    !s.includes('>') &&
    !s.includes('&')
  ) {
    return '`' + s + '`';
  }
  // Order matters: escape `&` first so the entity escapes we add
  // afterward don't get re-encoded.
  const escaped = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;');
  return `<code>${escaped}</code>`;
}

function escapePipes(s: string): string {
  // Markdown table cells split on `|` — escape so a snippet containing
  // a pipe (e.g. `a || b`) doesn't blow up the row.
  return s.replace(/\|/g, '\\|');
}

/**
 * Renders a scan report as GitHub-flavoured markdown. Designed for
 * pasting into PR comments / Issues / Slack canvases — same
 * triage-ordered findings list as the console reporter, but with no
 * ANSI escapes and proper markdown structure (headings, tables, fenced
 * code blocks). Console-only ergonomics like `--roast` and
 * `--suggest-fix` are intentionally NOT rendered here; markdown is a
 * shareable artefact and should stay neutral.
 */
export function renderMarkdown(report: ScanReport, version: string): string {
  const lines: string[] = [];

  lines.push(`# vibe-hardening scan report`);
  lines.push('');
  lines.push(
    `> **${report.score.score} / 100** · grade **${report.score.grade}** · ` +
      `${report.filesScanned} files · ${report.durationMs}ms · v${version}`,
  );
  lines.push('');

  // Delta marker — when compare-mode, prepend an explicit notice so
  // a reader pasting the report into a PR comment sees immediately
  // that findings/summary are filtered.
  if (report.compare) {
    lines.push(
      `> **Δ vs baseline** \`${report.compare.baselinePath}\` — ` +
        `**+${report.compare.added} new** · ` +
        `**-${report.compare.removed} fixed** · ` +
        `${report.compare.unchanged} unchanged. ` +
        `Findings below show only what changed; score reflects absolute state.`,
    );
    lines.push('');
  }

  if (report.platform.platform !== 'unknown') {
    const pct = Math.round(report.platform.confidence * 100);
    lines.push(
      `**Platform fingerprint:** \`${report.platform.platform}\` (${pct}% confidence)`,
    );
    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|------:|');
  lines.push(`| 🔴 Critical | ${report.summary.critical} |`);
  lines.push(`| 🟠 High     | ${report.summary.high} |`);
  lines.push(`| 🟡 Medium   | ${report.summary.medium} |`);
  lines.push(`| ⚪ Low      | ${report.summary.low} |`);
  lines.push(`| ⚪ Info     | ${report.summary.info} |`);
  lines.push('');

  if (report.findings.length === 0) {
    lines.push('## Findings');
    lines.push('');
    lines.push('_No findings. Ship with confidence._');
    lines.push('');
    return lines.join('\n');
  }

  // Group by file so reviewers see all changes for one file together —
  // matches the console reporter's grouping.
  const byFile = new Map<string, Finding[]>();
  const sortedFindings = [...report.findings].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
  for (const f of sortedFindings) {
    const arr = byFile.get(f.file);
    if (arr) arr.push(f);
    else byFile.set(f.file, [f]);
  }

  lines.push(`## Findings (${report.findings.length})`);
  lines.push('');

  for (const [file, findings] of byFile) {
    lines.push(`### \`${file}\``);
    lines.push('');
    lines.push('| Severity | Rule | Line | Issue |');
    lines.push('|----------|------|-----:|-------|');
    for (const f of findings) {
      const sev = SEVERITY_BADGE[f.severity];
      const rule = inlineCode(f.ruleId);
      const where = `${f.line}:${f.column}`;
      const msg = escapePipes(f.message);
      lines.push(`| ${sev} | ${rule} | ${where} | ${msg} |`);
    }
    lines.push('');

    // Per-finding remediation block — easier to read than cramming into
    // the table.
    for (const f of findings) {
      if (!f.remediation) continue;
      lines.push(
        `- **${inlineCode(f.ruleId)}** at line ${f.line} — ${f.remediation}`,
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    `_Generated by [vibe-hardening](https://vibe-hardening.io) v${version}._ ` +
      `_Run \`vh explain <rule-id>\` locally for full rule docs._`,
  );

  return lines.join('\n');
}
