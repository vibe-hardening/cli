/**
 * Type contract for the agent scan module.
 *
 * Scope: scan local agentskills.io-compatible install dirs for security
 * issues. The standard is Anthropic-developed and supported by 30+
 * platforms (OpenClaw, Hermes, Cursor, Claude Code, Gemini CLI, Goose,
 * OpenCode, Codex, Trae, Factory, ...). v1.1 only enumerates a known
 * shortlist below — generic detection of any `~/.<agent>/skills/`
 * pattern is added in D1 too.
 */

/**
 * Known agent platforms with verified install paths. Adding a new
 * platform = one entry here; generic detection still picks up unknowns
 * via the agentskills.io directory pattern.
 */
export type AgentId =
  | 'openclaw'
  | 'hermes'
  | 'cursor'
  | 'claude-code'
  | 'gemini-cli'
  | 'goose'
  | 'opencode'
  | 'codex'
  | 'trae'
  | 'factory'
  | 'unknown';

/**
 * One detected agent install. `rootPath` always exists; the more
 * specific paths (config, skills, env) are filled in only when the
 * detector confirms them on disk — downstream rules check for
 * undefined before scanning.
 */
export interface AgentDetected {
  id: AgentId;
  rootPath: string;
  configPath?: string;
  skillsPath?: string;
  envPath?: string;
}

export type AgentSeverity = 'high' | 'medium' | 'low' | 'info';

export type AgentRuleCategory =
  | 'secret' // A — reuses v1 SECRET_RULES
  | 'injection' // B — prompt injection patterns
  | 'shell' // C — dangerous shell commands
  | 'skill-schema' // D — agentskills.io schema + body checks
  | 'mcp'; // G — MCP server config issues

export interface AgentFinding {
  ruleId: string;
  severity: AgentSeverity;
  category: AgentRuleCategory;
  file: string;
  line: number;
  column: number;
  snippet: string;
  message: string;
  fixHint?: string;
}

export interface AgentScanResult {
  agentsDetected: AgentDetected[];
  findings: AgentFinding[];
  filesScanned: number;
  durationMs: number;
}
