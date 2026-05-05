import { readFile } from 'node:fs/promises';
import yaml from 'yaml';

/**
 * YAML config parser for `~/.hermes/config.yaml` and any other
 * agentskills.io platform that stores config as YAML.
 *
 * Hermes notably keeps secrets in `~/.hermes/.env` rather than in
 * `config.yaml`, so this parser is mostly for non-secret config —
 * but we still scan `raw` for secrets (rule A) defensively.
 */
export interface YamlConfigParsed {
  filePath: string;
  raw: string;
  parsed: unknown | null;
  parseError?: string;
}

export async function parseYamlConfig(
  filePath: string,
): Promise<YamlConfigParsed> {
  const raw = await readFile(filePath, 'utf8');
  return parseYamlConfigContent(filePath, raw);
}

export function parseYamlConfigContent(
  filePath: string,
  raw: string,
): YamlConfigParsed {
  try {
    const parsed = yaml.parse(raw) as unknown;
    return { filePath, raw, parsed };
  } catch (err) {
    return {
      filePath,
      raw,
      parsed: null,
      parseError: err instanceof Error ? err.message : 'yaml parse error',
    };
  }
}
