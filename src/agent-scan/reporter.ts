import pc from 'picocolors';
import type {
  AgentFinding,
  AgentScanResult,
  AgentSeverity,
} from './types.js';

const SEVERITY_LABEL: Record<AgentSeverity, string> = {
  high: pc.red(pc.bold('[ HIGH ]')),
  medium: pc.yellow(pc.bold('[ MED  ]')),
  low: pc.cyan(pc.bold('[ LOW  ]')),
  info: pc.dim('[ INFO ]'),
};

const SEVERITY_RANK: Record<AgentSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function summarize(
  findings: AgentFinding[],
): Record<AgentSeverity, number> {
  const out: Record<AgentSeverity, number> = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) out[f.severity]++;
  return out;
}

/**
 * Brutalist text reporter. Matches v1 `vibe-hardening scan` style —
 * `▲ VH-001` red header, dim `[000.000]` timestamps, `SCAN COMPLETE`
 * footer. Intentionally consistent so users learn one visual language.
 */
export function renderAgentText(result: AgentScanResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${pc.red(pc.bold('▲ VH-001'))} ${pc.dim('· agent scan')}`);

  if (result.agentsDetected.length === 0) {
    lines.push('');
    lines.push(
      `  ${pc.dim(
        '[no agentskills.io-compatible installs detected — checked ~/.openclaw, ~/.hermes, ~/.cursor, ~/.claude, ~/.gemini, ~/.goose, ~/.opencode, ~/.codex, ~/.trae, ~/.factory]',
      )}`,
    );
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`  ${pc.dim('detected agentskills.io platforms:')}`);
  for (const agent of result.agentsDetected) {
    lines.push(
      `    ${pc.green('✓')} ${agent.id.padEnd(15)} ${pc.dim(agent.rootPath)}`,
    );
  }

  lines.push('');
  lines.push(
    `  ${pc.dim(
      `[scanned ${result.filesScanned} files in ${result.durationMs}ms]`,
    )}`,
  );

  if (result.findings.length === 0) {
    lines.push('');
    lines.push(
      `  ${pc.green(pc.bold('✓ no findings.'))} ${pc.dim('your skills look clean.')}`,
    );
    lines.push('');
    return lines.join('\n');
  }

  // Sort findings: high → medium → low → info, then by file
  const sorted = [...result.findings].sort((a, b) => {
    const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.file.localeCompare(b.file) || a.line - b.line;
  });

  lines.push('');
  lines.push(pc.dim('─'.repeat(60)));
  lines.push('');
  for (const f of sorted) {
    lines.push(
      `${SEVERITY_LABEL[f.severity]}  ${pc.bold(f.ruleId)}  ${pc.dim(`(${f.line}:${f.column})`)}`,
    );
    lines.push(`         ${pc.dim(f.file)}`);
    lines.push(`         ${f.message}`);
    if (f.snippet) {
      lines.push(`         ${pc.dim('snippet:')} ${pc.dim(f.snippet)}`);
    }
    if (f.fixHint) {
      lines.push(`         ${pc.green('→')} ${f.fixHint}`);
    }
    lines.push('');
  }

  const sev = summarize(result.findings);
  lines.push(pc.dim('─'.repeat(60)));
  const counts = (
    [
      ['HIGH', sev.high, pc.red],
      ['MED', sev.medium, pc.yellow],
      ['LOW', sev.low, pc.cyan],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([label, n, paint]) => paint(`${n} ${label}`))
    .join('  ·  ');
  lines.push(
    `  ${pc.bold(`${result.findings.length} findings`)}   ${counts}`,
  );
  lines.push('');

  return lines.join('\n');
}

export function renderAgentJson(
  result: AgentScanResult,
  vhVersion: string,
): string {
  return (
    JSON.stringify(
      {
        version: vhVersion,
        scanned_at: new Date().toISOString(),
        agents_detected: result.agentsDetected.map((a) => a.id),
        files_scanned: result.filesScanned,
        duration_ms: result.durationMs,
        findings: result.findings,
        summary: summarize(result.findings),
      },
      null,
      2,
    ) + '\n'
  );
}
