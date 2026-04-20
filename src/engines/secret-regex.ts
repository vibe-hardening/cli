import type { Category, FileContext, Finding, Severity } from '../core/types.js';
import { offsetToLineCol } from '../core/types.js';
import { shannonEntropy } from '../core/entropy.js';

export interface SecretPattern {
  name?: string;
  regex: RegExp;
  minEntropy?: number;
  disallowSubstrings?: string[];
  captureGroup?: number;
}

export interface SecretRule {
  id: string;
  severity: Severity;
  category: Category;
  message: string;
  remediation: string;
  patterns: SecretPattern[];
  excludeFilenamePatterns?: RegExp[];
  /**
   * Provider kind for --verify live check. When set, findings from
   * this rule expose `metadata._rawValue` and `metadata._verifyKind`
   * so the orchestrator can call the matching verifier. Both fields
   * are stripped by reporters before serialisation.
   */
  verify?: {
    kind:
      | 'openai'
      | 'anthropic'
      | 'stripe'
      | 'github-pat'
      | 'slack'
      | 'sendgrid'
      | 'twilio'
      | 'notion';
  };
  /**
   * When true, a finding is emitted only when *every* `patterns[i]` has at
   * least one match in the file. The finding uses the first match of the
   * first pattern for line/column reporting. Enables composite rules like
   * "file contains 'use client' AND references service_role" without
   * needing a greedy cross-match regex (ReDoS-prone).
   */
  requireAllPatterns?: boolean;
}

function redact(value: string): string {
  if (value.length <= 12) return `${value.slice(0, 2)}…${value.slice(-2)}`;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function isExcludedByFilename(file: string, patterns?: RegExp[]): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((re) => re.test(file));
}

function evalPattern(
  src: string,
  ctx: FileContext,
  rule: SecretRule,
  pattern: SecretPattern,
): Finding[] {
  const flags = pattern.regex.flags.includes('g')
    ? pattern.regex.flags
    : `${pattern.regex.flags}g`;
  const re = new RegExp(pattern.regex.source, flags);
  const findings: Finding[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    const capture =
      pattern.captureGroup !== undefined ? m[pattern.captureGroup] : m[0];
    const matched = capture ?? m[0];
    if (seen.has(matched)) continue;
    seen.add(matched);

    if (
      pattern.minEntropy !== undefined &&
      shannonEntropy(matched) < pattern.minEntropy
    ) {
      continue;
    }
    if (
      pattern.disallowSubstrings &&
      pattern.disallowSubstrings.some((s) =>
        matched.toLowerCase().includes(s.toLowerCase()),
      )
    ) {
      continue;
    }

    const { line, column } = offsetToLineCol(src, m.index);
    const metadata: Record<string, unknown> = {
      patternName: pattern.name,
      length: matched.length,
    };
    if (rule.verify) {
      // Kept internal for the verify pipeline. Reporters strip these
      // before JSON / HTML serialisation.
      metadata._rawValue = matched;
      metadata._verifyKind = rule.verify.kind;
    }
    findings.push({
      ruleId: rule.id,
      severity: rule.severity,
      category: rule.category,
      file: ctx.path,
      line,
      column,
      snippet: redact(matched),
      message: rule.message,
      remediation: rule.remediation,
      metadata,
    });
  }
  return findings;
}

export function scanSecrets(ctx: FileContext, rules: SecretRule[]): Finding[] {
  const out: Finding[] = [];
  for (const rule of rules) {
    if (isExcludedByFilename(ctx.path, rule.excludeFilenamePatterns)) continue;

    if (rule.requireAllPatterns) {
      const perPattern = rule.patterns.map((p) =>
        evalPattern(ctx.content, ctx, rule, p),
      );
      if (perPattern.every((arr) => arr.length > 0)) {
        // Report the *last* pattern's first match — the preceding
        // patterns tend to be structural anchors (e.g. "use client"
        // at line 1) while the last one is the actionable signal.
        const last = perPattern[perPattern.length - 1]?.[0];
        if (last) out.push(last);
      }
      continue;
    }

    for (const pattern of rule.patterns) {
      out.push(...evalPattern(ctx.content, ctx, rule, pattern));
    }
  }
  return out;
}
