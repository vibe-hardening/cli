import type { FileContext, Finding } from '../core/types.js';

/**
 * Maps a secret-detection rule ID to the conventional env var name
 * users would use to replace the inline secret. The names match the
 * provider's own documentation conventions where possible.
 *
 * Only secret rules where the fix is "move literal → env var" are
 * listed. Findings with no entry here aren't `--suggest-fix` targets
 * (e.g. SQL injection, missing auth — those need contextual code
 * changes that templated suggestions would mangle).
 */
export const ENV_VAR_FOR_RULE: Record<string, string> = {
  'vh-secret-openai': 'OPENAI_API_KEY',
  'vh-secret-anthropic': 'ANTHROPIC_API_KEY',
  'vh-secret-stripe': 'STRIPE_SECRET_KEY',
  'vh-secret-github-pat': 'GITHUB_TOKEN',
  'vh-secret-slack-token': 'SLACK_BOT_TOKEN',
  'vh-secret-sendgrid': 'SENDGRID_API_KEY',
  'vh-secret-notion': 'NOTION_TOKEN',
  'vh-secret-twilio-auth-token': 'TWILIO_AUTH_TOKEN',
  'vh-secret-google-api': 'GOOGLE_API_KEY',
  'vh-secret-aws-access-key': 'AWS_ACCESS_KEY_ID',
  'vh-secret-db-url': 'DATABASE_URL',
  'vh-secret-jwt-hardcoded': 'JWT_SECRET',
};

export interface FixSuggestion {
  ruleId: string;
  file: string;
  line: number;
  /** The full line of source as it currently exists. */
  oldText: string;
  /** The same line with the secret literal swapped for `process.env.X`. */
  newText: string;
  envVarName: string;
}

/**
 * Generates inline replacement suggestions for findings that match a
 * fixable rule. Does NOT touch the filesystem — output is meant to be
 * printed for the user to review and copy-paste. The point is zero
 * risk of breaking code: any false positive in a suggestion is just
 * a piece of text the user ignores, not a destructive write.
 *
 * The slicing below uses `finding.column` (1-indexed start of the
 * regex match) and `metadata.length` (chars matched). Both come from
 * `evalPattern` in secret-regex.ts so the bounds are byte-exact.
 */
export function generateSuggestions(
  findings: Finding[],
  files: FileContext[],
): FixSuggestion[] {
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const out: FixSuggestion[] = [];

  for (const f of findings) {
    const envVar = ENV_VAR_FOR_RULE[f.ruleId];
    if (!envVar) continue;

    const ctx = fileMap.get(f.file);
    if (!ctx) continue;

    const secretLength =
      typeof f.metadata?.length === 'number' ? f.metadata.length : 0;
    if (secretLength <= 0) continue;

    const lines = ctx.content.split('\n');
    const lineIdx = f.line - 1;
    const oldLine = lines[lineIdx];
    if (oldLine === undefined) continue;

    let startCol = f.column - 1;
    let endCol = startCol + secretLength;
    if (startCol < 0 || endCol > oldLine.length) continue;

    // If the secret is wrapped in matching quote characters (',",`),
    // expand the bounds so the replacement swallows them too.
    // Otherwise we'd emit `'process.env.OPENAI_API_KEY'` — a string
    // literal containing the words, not an env var reference.
    const before = oldLine[startCol - 1];
    const after = oldLine[endCol];
    if (
      (before === "'" || before === '"' || before === '`') &&
      before === after
    ) {
      startCol -= 1;
      endCol += 1;
    }

    const replacement = `process.env.${envVar}`;
    const newLine =
      oldLine.slice(0, startCol) + replacement + oldLine.slice(endCol);

    out.push({
      ruleId: f.ruleId,
      file: f.file,
      line: f.line,
      oldText: oldLine,
      newText: newLine,
      envVarName: envVar,
    });
  }

  return out;
}
