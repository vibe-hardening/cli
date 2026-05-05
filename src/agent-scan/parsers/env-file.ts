import { readFile } from 'node:fs/promises';

/**
 * Parser for `.env`-style files (KEY=VALUE per line). Used for
 * `~/.hermes/.env` (Hermes stores ALL secrets here) and for any
 * project-local `.env` we encounter.
 *
 * We explicitly do NOT use `dotenv` — the runtime cost / dependency
 * isn't worth it, the semantics we need are minimal, and we want
 * line numbers (which dotenv doesn't expose). Also dotenv mutates
 * `process.env` as a side effect; we never want that here.
 */
export interface EnvEntry {
  key: string;
  value: string;
  line: number;
  /** Column where the value starts (1-indexed). */
  column: number;
}

export interface EnvFileParsed {
  filePath: string;
  raw: string;
  entries: EnvEntry[];
}

export async function parseEnvFile(filePath: string): Promise<EnvFileParsed> {
  const raw = await readFile(filePath, 'utf8');
  return parseEnvFileContent(filePath, raw);
}

const ENV_LINE_RE =
  /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;

export function parseEnvFileContent(
  filePath: string,
  raw: string,
): EnvFileParsed {
  const entries: EnvEntry[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    // Skip blank lines and comments. Inline `#` after a value is left
    // intact — many tools (foreman, dotenv) don't strip it because the
    // `#` may legitimately appear inside an unquoted value (URL fragment,
    // generated password, etc.). Secret rules don't care either way.
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const m = line.match(ENV_LINE_RE);
    if (!m) continue;
    const key = m[1] ?? '';
    let value = m[2] ?? '';

    // Strip surrounding quotes if both ends match. Don't unescape the
    // body — secret rules match on raw values, and unescaping could
    // change which characters are present in subtle ways.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    // Column where the value starts in the original line — used to
    // produce accurate (line, column) finding coordinates.
    const eqIndex = line.indexOf('=');
    const column = eqIndex >= 0 ? eqIndex + 2 : 1;

    entries.push({ key, value, line: i + 1, column });
  }
  return { filePath, raw, entries };
}
