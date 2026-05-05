import { readFile } from 'node:fs/promises';

/**
 * JSON config parser for `openclaw.json`, `mcp.json`, `settings.json`.
 *
 * Rules consume both:
 *   - `parsed` for structured checks (rule G's `mcpServers[*].env` walk)
 *   - `raw` for line-based regex scanning (rule A secret patterns can
 *     match anywhere; we don't want to maintain a JSON path list per
 *     config file shape)
 */
export interface JsonConfigParsed {
  filePath: string;
  raw: string;
  parsed: unknown | null;
  parseError?: string;
}

export async function parseJsonConfig(
  filePath: string,
): Promise<JsonConfigParsed> {
  const raw = await readFile(filePath, 'utf8');
  return parseJsonConfigContent(filePath, raw);
}

export function parseJsonConfigContent(
  filePath: string,
  raw: string,
): JsonConfigParsed {
  // Strip UTF-8 BOM — JSON.parse rejects it on some Node versions and
  // the spec leaves it as undefined behaviour. Easier to normalise here
  // than to debug "expected '{' but got '﻿{'" later.
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return { filePath, raw, parsed };
  } catch (err) {
    return {
      filePath,
      raw,
      parsed: null,
      parseError: err instanceof Error ? err.message : 'json parse error',
    };
  }
}
