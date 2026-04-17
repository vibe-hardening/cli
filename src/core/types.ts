export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category =
  | 'secret'
  | 'auth'
  | 'injection'
  | 'config'
  | 'dependency'
  | 'llm'
  | 'supply-chain'
  | 'cors'
  | 'ssrf'
  | 'database';

export type PlatformId =
  | 'v0'
  | 'lovable'
  | 'bolt'
  | 'cursor'
  | 'claude-code'
  | 'replit-agent'
  | 'windsurf'
  | 'devin'
  | 'trae'
  | 'unknown';

export interface FileContext {
  path: string;
  content: string;
}

export interface Finding {
  ruleId: string;
  severity: Severity;
  category: Category;
  file: string;
  line: number;
  column: number;
  snippet: string;
  message: string;
  remediation?: string;
  metadata?: Record<string, unknown>;
}

export function offsetToLineCol(
  src: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < offset; i++) {
    if (src.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, column: offset - lastNl };
}
