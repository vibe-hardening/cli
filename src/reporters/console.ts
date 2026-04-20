import pc from 'picocolors';
import type { Finding, Severity } from '../core/types.js';
import type { ScanReport } from '../core/scan.js';
import type { Grade } from '../scoring/score.js';
import type { VerifyResult } from '../verifiers/index.js';
import {
  roastMessage,
  ROAST_GRADE_LINES,
  ROAST_EMPTY,
} from './roast-messages.js';
import { abuseCostFor } from './abuse-costs.js';

export interface ConsoleOptions {
  /**
   * Roast mode: replaces neutral rule messages with dry brutalist
   * one-liners, and swaps the grade line + empty-repo message for
   * personality. Console-only — JSON / HTML reporters are never
   * affected, so CI output + compliance artifacts stay professional.
   */
  roast?: boolean;
}

function gradeLine(score: number, grade: Grade, roast: boolean): string {
  const colour =
    grade === 'A'
      ? pc.green
      : grade === 'B'
        ? pc.green
        : grade === 'C'
          ? pc.yellow
          : grade === 'D'
            ? pc.red
            : pc.red;
  const base = `${pc.dim('score')}     ${colour(pc.bold(`${score} / 100`))}  ${colour(pc.bold(`[${grade}]`))}`;
  if (!roast) return base;
  return `${base}   ${pc.dim(ROAST_GRADE_LINES[grade])}`;
}

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

/**
 * CVE findings from OSV can produce several per package (hono@4.12 had
 * 8). Show them as one grouped block with a count instead of 8 near-
 * identical rows.
 */
function foldCveFindings(findings: Finding[]): Finding[] {
  const out: Finding[] = [];
  const cveGroups = new Map<string, Finding[]>();
  for (const f of findings) {
    if (f.category === 'dependency' && f.ruleId.startsWith('vh-dep-cve-')) {
      const pkg = `${f.metadata?.package}@${f.metadata?.version}`;
      const arr = cveGroups.get(pkg);
      if (arr) arr.push(f);
      else cveGroups.set(pkg, [f]);
    } else {
      out.push(f);
    }
  }
  for (const [pkg, group] of cveGroups) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }
    const worst = group.reduce((acc, f) =>
      severityRank(f.severity) > severityRank(acc.severity) ? f : acc,
    );
    const cveIds = group.map((f) => String(f.metadata?.cveId)).sort();
    const summaries = group
      .map((f) => `  · ${f.metadata?.cveId}: ${f.metadata?.summary ?? ''}`)
      .join('\n');
    out.push({
      ...worst,
      ruleId: `vh-dep-cve-${pkg}`,
      message: `${pkg} has ${group.length} known vulnerabilities — worst: ${worst.severity}`,
      remediation: `Upgrade ${pkg}. Affected advisories:\n${summaries}`,
      metadata: {
        ...worst.metadata,
        grouped: true,
        count: group.length,
        cveIds,
      },
    });
  }
  return out;
}

function severityRank(s: Severity): number {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[s];
}

// Strip ANSI escape and other control characters from strings that
// originate from a provider API response (Slack `error`, GitHub
// `login`, …). Without this, a crafted provider reply containing
// e.g. `\x1b[2J` could clear the terminal or inject fake prompt text
// when the console reporter writes to a TTY.
function sanitizeForTerminal(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function renderVerify(v: VerifyResult): string {
  const extras: string[] = [];
  if (v.info) {
    for (const [k, val] of Object.entries(v.info)) {
      if (val !== undefined && val !== '') {
        const safe =
          typeof val === 'string' ? sanitizeForTerminal(val) : String(val);
        extras.push(`${k}=${safe}`);
      }
    }
  }
  const extra = extras.length > 0 ? ` ${pc.dim(`(${extras.join(', ')})`)}` : '';
  if (v.status === 'live') {
    // Show an estimated abuse cost next to LIVE KEY — concrete dollar
    // figure is more visceral than "severe" for a vibe coder who just
    // ran `npx vibe-hardening` on a weekend project. Numbers come from
    // ABUSE_COSTS (see abuse-costs.ts for sources).
    const cost = abuseCostFor(v.kind);
    const costLine = cost
      ? ` ${pc.dim('~')} ${pc.bold(pc.red(cost.label))} ${pc.dim(`(${cost.vector})`)}`
      : '';
    return `${pc.bgRed(pc.white(pc.bold(' LIVE KEY ')))} ${pc.red(pc.bold(v.kind))}${extra}${costLine}`;
  }
  if (v.status === 'revoked') {
    return `${pc.green('✓ revoked')} ${pc.dim(v.kind)}${extra}`;
  }
  const reason = v.error ? ` — ${sanitizeForTerminal(v.error)}` : '';
  return `${pc.dim('? unverified')} ${pc.dim(v.kind + reason)}`;
}

export function renderConsole(
  report: ScanReport,
  opts: ConsoleOptions = {},
): string {
  const roast = opts.roast ?? false;
  const lines: string[] = [];
  const banner = pc.bold(pc.cyan('vibe-hardening'));
  lines.push('');
  lines.push(
    `${banner} ${pc.dim('scan complete')}  ${pc.dim(`·  ${report.filesScanned} files  ·  ${report.durationMs}ms`)}`,
  );

  if (report.platform.platform !== 'unknown') {
    const pct = Math.round(report.platform.confidence * 100);
    lines.push(
      `${pc.dim('platform')}  ${pc.bold(report.platform.platform)}  ${pc.dim(`(${pct}% confidence)`)}`,
    );
  }
  lines.push(gradeLine(report.score.score, report.score.grade, roast));
  lines.push('');

  if (report.findings.length === 0) {
    const empty = roast
      ? pc.dim(pc.italic(`  ${ROAST_EMPTY}`))
      : pc.green(pc.bold('  ✓ no findings. ship with confidence.'));
    lines.push(empty);
    lines.push('');
    return lines.join('\n');
  }

  const folded = foldCveFindings(report.findings);
  const byFile = groupByFile(folded);
  for (const [file, fileFindings] of byFile) {
    lines.push(pc.underline(pc.cyan(file)));
    for (const f of fileFindings) {
      lines.push(
        `  ${severityBadge(f.severity)}  ${pc.bold(f.ruleId)}  ${pc.dim(`(${f.line}:${f.column})`)}`,
      );
      const msg = roast ? roastMessage(f.ruleId, f.message) : f.message;
      lines.push(`         ${msg}`);
      if (f.snippet) {
        lines.push(`         ${pc.dim('snippet:')} ${pc.dim(f.snippet)}`);
      }
      const verify = f.metadata?.verify as VerifyResult | undefined;
      if (verify) {
        lines.push(`         ${pc.dim('verify: ')} ${renderVerify(verify)}`);
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
