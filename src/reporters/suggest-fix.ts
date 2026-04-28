import pc from 'picocolors';
import type { FixSuggestion } from '../fix/suggestions.js';

// Strip ANSI / terminal control sequences from untrusted source text.
// `oldText` and `newText` are derived from the scanned file's raw
// content — a malicious repo could embed escape sequences that hijack
// terminal color state, change the title bar, or render OSC hyperlinks.
// We're a security tool: don't be the vector.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /[\x1b\x9b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-nq-uy=><~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|[\x00-\x08\x0b-\x1f\x7f]/g;
function safe(s: string): string {
  return s.replace(ANSI_RE, '');
}

/**
 * Renders fix suggestions as a unified-diff-ish block users can
 * copy directly. Console-only. JSON / HTML reporters never see
 * these — `--suggest-fix` is a CLI ergonomics feature, not a
 * machine-parseable contract.
 *
 * Output groups by file so reviewers see all changes for one file
 * together. Each suggestion shows the old line, new line, and a
 * .env.example hint. We deliberately do NOT auto-write — the user
 * applies manually so any false positive is just visual noise,
 * never destructive.
 */
export function renderSuggestFix(suggestions: FixSuggestion[]): string {
  if (suggestions.length === 0) return '';

  const lines: string[] = [];
  lines.push('');
  lines.push(pc.dim('─'.repeat(60)));
  lines.push(
    `  ${pc.bold(pc.red('▲ SUGGESTED FIXES'))}  ${pc.dim(`(${suggestions.length})`)}`,
  );
  lines.push(pc.dim('─'.repeat(60)));
  lines.push('');

  // Group by file so all changes for one file appear together.
  const byFile = new Map<string, FixSuggestion[]>();
  for (const s of suggestions) {
    const arr = byFile.get(s.file);
    if (arr) arr.push(s);
    else byFile.set(s.file, [s]);
  }

  for (const [file, entries] of byFile) {
    lines.push(`${pc.cyan(pc.underline(safe(file)))}`);
    for (const s of entries) {
      lines.push(
        `  ${pc.dim(`(${s.line})`)}  ${pc.bold(s.ruleId)}`,
      );
      lines.push(`    ${pc.red('-')} ${pc.dim(safe(s.oldText))}`);
      lines.push(`    ${pc.green('+')} ${safe(s.newText)}`);
      lines.push('');
    }
  }

  // Aggregate env var names so the user gets one .env.example block
  // at the bottom instead of repeated entries per finding.
  const envVars = Array.from(new Set(suggestions.map((s) => s.envVarName)));
  if (envVars.length > 0) {
    lines.push(pc.dim('Add to .env.example:'));
    for (const name of envVars) {
      lines.push(`    ${pc.green('+')} ${name}=`);
    }
    lines.push('');
    lines.push(
      pc.dim(
        '  Then add real values to your local .env (NOT committed) and verify .env is in .gitignore.',
      ),
    );
    lines.push(pc.dim('  Rotate the leaked keys at the provider dashboard.'));
    lines.push('');
  }

  return lines.join('\n');
}
