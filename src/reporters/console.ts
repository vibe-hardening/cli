import pc from 'picocolors';
import type { Finding, Severity } from '../core/types.js';
import type { ScanReport } from '../core/scan.js';

function severityBadge(sev: Severity): string {
  switch (sev) {
    case 'critical':
      return pc.bgRed(pc.black(pc.bold(' CRITICAL ')));
    case 'high':
      return pc.red(pc.bold('[ HIGH ]'));
    case 'medium':
      return pc.yellow(pc.bold('[ MED  ]'));
    case 'low':
      return pc.blue('[ LOW  ]');
    case 'info':
    default:
      return pc.dim('[ INFO ]');
  }
}

function groupByFile(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = map.get(f.file);
    if (arr) arr.push(f);
    else map.set(f.file, [f]);
  }
  return map;
}

export function renderConsole(report: ScanReport): string {
  const lines: string[] = [];
  const banner = pc.bold(pc.cyan('vibe-hardening'));
  lines.push('');
  lines.push(
    `${banner} ${pc.dim('scan complete')}  ${pc.dim(`·  ${report.filesScanned} files  ·  ${report.durationMs}ms`)}`,
  );
  lines.push('');

  if (report.findings.length === 0) {
    lines.push(pc.green(pc.bold('  ✓ no findings. ship with confidence.')));
    lines.push('');
    return lines.join('\n');
  }

  const byFile = groupByFile(report.findings);
  for (const [file, fileFindings] of byFile) {
    lines.push(pc.underline(pc.cyan(file)));
    for (const f of fileFindings) {
      lines.push(
        `  ${severityBadge(f.severity)}  ${pc.bold(f.ruleId)}  ${pc.dim(`(${f.line}:${f.column})`)}`,
      );
      lines.push(`         ${f.message}`);
      if (f.snippet) {
        lines.push(`         ${pc.dim('snippet:')} ${pc.dim(f.snippet)}`);
      }
      if (f.remediation) {
        lines.push(`         ${pc.green('→')} ${f.remediation}`);
      }
      lines.push('');
    }
  }

  const s = report.summary;
  const total = s.critical + s.high + s.medium + s.low + s.info;
  const parts: string[] = [];
  if (s.critical) parts.push(pc.red(pc.bold(`${s.critical} critical`)));
  if (s.high) parts.push(pc.red(`${s.high} high`));
  if (s.medium) parts.push(pc.yellow(`${s.medium} medium`));
  if (s.low) parts.push(pc.blue(`${s.low} low`));
  if (s.info) parts.push(pc.dim(`${s.info} info`));
  lines.push(pc.dim('─'.repeat(60)));
  lines.push(
    `  ${pc.bold(`${total} findings`)}   ${parts.join('  ·  ')}`,
  );
  lines.push('');
  return lines.join('\n');
}
