import { readFile } from 'node:fs/promises';
import yaml from 'yaml';

/**
 * Parsed shape of a SKILL.md file (agentskills.io standard).
 *
 * Rules consume two surfaces:
 *   - `frontmatter` (parsed YAML object) for schema checks (rule D)
 *   - `body` (markdown after the closing ---) for content scanning
 *     (rules A/B/C)
 *
 * `frontmatterRaw` is the raw text between the `---` delimiters,
 * exposed so secret rules (rule A) can scan it as plain text without
 * relying on YAML key paths — keys are platform-specific extensions
 * (`metadata.hermes.api_key`, `secrets.openai`, etc.) and we don't
 * want to maintain a list per platform.
 */
export interface SkillMdParsed {
  /** Path the file was read from. */
  filePath: string;
  /** Whole file content, useful for fallback line-based scanning. */
  raw: string;
  /** Did the file have a `---\n...\n---` frontmatter block? */
  hasFrontmatter: boolean;
  /** Raw text inside the frontmatter delimiters (without the `---`). */
  frontmatterRaw: string;
  /** Parsed frontmatter object. `null` on parse error. */
  frontmatter: Record<string, unknown> | null;
  /** Body content after the closing `---`, or whole file if no frontmatter. */
  body: string;
  /** Line number where the body starts (1-indexed) — used to map body
   *  finding offsets back to file line numbers. */
  bodyStartLine: number;
  /** Filled when YAML parsing fails, otherwise undefined. */
  parseError?: string;
}

/**
 * Frontmatter delimiter regex. Allows `\r\n` for Windows-authored
 * files and tolerates a UTF-8 BOM at the top. The body capture is
 * non-greedy on the closing `---` to avoid eating inline `---`
 * horizontal rules in markdown.
 */
const FRONTMATTER_RE =
  /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export async function parseSkillMd(filePath: string): Promise<SkillMdParsed> {
  const raw = await readFile(filePath, 'utf8');
  return parseSkillMdContent(filePath, raw);
}

/**
 * Synchronous variant — used by tests and any in-memory scanning path
 * (e.g. when content is already loaded by an upstream walker).
 */
export function parseSkillMdContent(
  filePath: string,
  raw: string,
): SkillMdParsed {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) {
    return {
      filePath,
      raw,
      hasFrontmatter: false,
      frontmatterRaw: '',
      frontmatter: null,
      body: raw,
      bodyStartLine: 1,
    };
  }

  const frontmatterRaw = m[1] ?? '';
  const body = m[2] ?? '';
  // Body line number = (frontmatter lines) + 2 (opening + closing ---) + 1
  const fmLineCount = frontmatterRaw.split(/\r?\n/).length;
  const bodyStartLine = fmLineCount + 3;

  let frontmatter: Record<string, unknown> | null = null;
  let parseError: string | undefined;
  try {
    const parsed = yaml.parse(frontmatterRaw) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    } else {
      // YAML parsed to a scalar / array — treat as no usable frontmatter
      // (rules expecting an object will fail closed). Still surface the
      // raw text for content-based scanning.
      frontmatter = null;
    }
  } catch (err) {
    frontmatter = null;
    parseError = err instanceof Error ? err.message : 'yaml parse error';
  }

  return {
    filePath,
    raw,
    hasFrontmatter: true,
    frontmatterRaw,
    frontmatter,
    body,
    bodyStartLine,
    parseError,
  };
}
