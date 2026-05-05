import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import type { AgentDetected, AgentId, AgentScanResult } from './types.js';

/**
 * Known-platform shortlist. Each entry is one filesystem check. Most
 * users will only have 1-2 of these installed; the detector returns
 * only the matched ones.
 *
 * Adding a new platform here costs nothing — but we don't NEED to add
 * it because the generic agentskills.io detector below picks up any
 * `~/.<dir>/skills/` directory that follows the standard. This list
 * just gives us platform-specific path hints (OpenClaw's
 * `workspace/comms/`, Hermes's `.env`) that generic detection can't
 * know about.
 */
const KNOWN_AGENT_DIRS: Array<{ id: Exclude<AgentId, 'unknown'>; dir: string }> = [
  { id: 'openclaw', dir: '.openclaw' },
  { id: 'hermes', dir: '.hermes' },
  { id: 'cursor', dir: '.cursor' },
  { id: 'claude-code', dir: '.claude' },
  { id: 'gemini-cli', dir: '.gemini' },
  { id: 'goose', dir: '.goose' },
  { id: 'opencode', dir: '.opencode' },
  { id: 'codex', dir: '.codex' },
  { id: 'trae', dir: '.trae' },
  { id: 'factory', dir: '.factory' },
];

function safeIsDir(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function safeIsFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Filesystem-check based agent detection. No network, no spawn, no
 * file content reads — just `stat` calls. Cheap and synchronous so
 * the prelude can render the detection result immediately.
 *
 * The platform-specific path hints below mirror Spec v1.1 §2:
 *   - OpenClaw: openclaw.json + workspace/skills + workspace/comms + .env
 *   - Hermes:   config.yaml + skills/ + .env (secrets here, not yaml)
 *   - Claude:   settings.json + skills/
 *   - Cursor:   mcp.json + (skills/ if present)
 */
export function detectAgents(home: string = homedir()): AgentDetected[] {
  const detected: AgentDetected[] = [];

  for (const { id, dir } of KNOWN_AGENT_DIRS) {
    const rootPath = join(home, dir);
    if (!safeIsDir(rootPath)) continue;

    const agent: AgentDetected = { id, rootPath };

    // Platform-specific path hints. Each one is a single stat call
    // gated on the rootPath check above, so total cost stays under
    // ~30 stats even with all 10 platforms installed.
    if (id === 'openclaw') {
      const cfg = join(rootPath, 'openclaw.json');
      if (safeIsFile(cfg)) agent.configPath = cfg;
      const skills = join(rootPath, 'workspace', 'skills');
      if (safeIsDir(skills)) agent.skillsPath = skills;
    } else if (id === 'hermes') {
      const cfg = join(rootPath, 'config.yaml');
      if (safeIsFile(cfg)) agent.configPath = cfg;
      const skills = join(rootPath, 'skills');
      if (safeIsDir(skills)) agent.skillsPath = skills;
      const env = join(rootPath, '.env');
      if (safeIsFile(env)) agent.envPath = env;
    } else if (id === 'claude-code') {
      const cfg = join(rootPath, 'settings.json');
      if (safeIsFile(cfg)) agent.configPath = cfg;
      const skills = join(rootPath, 'skills');
      if (safeIsDir(skills)) agent.skillsPath = skills;
    } else if (id === 'cursor') {
      const cfg = join(rootPath, 'mcp.json');
      if (safeIsFile(cfg)) agent.configPath = cfg;
      const skills = join(rootPath, 'skills');
      if (safeIsDir(skills)) agent.skillsPath = skills;
    } else {
      // Generic agentskills.io fallback for the long tail (Goose,
      // OpenCode, Codex, Trae, Factory, etc.). Just look for a
      // `skills/` subdir following the open standard.
      const skills = join(rootPath, 'skills');
      if (safeIsDir(skills)) agent.skillsPath = skills;
    }

    detected.push(agent);
  }

  return detected;
}

export interface RunAgentScanOptions {
  cwd: string;
  /** Optional override of home dir — used in tests. */
  home?: string;
}

/**
 * D1 scaffold. Wires detection + reporter + telemetry plumbing
 * together but does not yet run rules — `findings` is empty.
 *
 * D2 (rule A, secrets) onward will:
 *   1. Walk skillsPath / configPath / envPath for each detected agent
 *   2. Parse SKILL.md (frontmatter + body), JSON, YAML, .env
 *   3. Apply rule modules (a-secrets / b-injection / c-shell / d-schema / g-mcp)
 *   4. Aggregate findings into the result
 */
export async function runAgentScan(
  opts: RunAgentScanOptions,
): Promise<AgentScanResult> {
  const startMs = Date.now();
  const agentsDetected = detectAgents(opts.home);

  // Rules ship D2 onward. Empty for D1 scaffold — but the result
  // shape, exit codes, telemetry, and reporter all work end-to-end
  // already so we have a runnable smoke test today.
  return {
    agentsDetected,
    findings: [],
    filesScanned: 0,
    durationMs: Date.now() - startMs,
  };
}
