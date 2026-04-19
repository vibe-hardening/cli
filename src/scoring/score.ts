import type { Finding, Severity } from '../core/types.js';

const PER_SEVERITY: Record<Severity, number> = {
  critical: 25,
  high: 12,
  medium: 5,
  low: 2,
  info: 0,
};

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreBreakdown {
  score: number;
  grade: Grade;
  base: 100;
  deductions: {
    severity: Severity;
    count: number;
    perItem: number;
    deducted: number;
  }[];
  capped: boolean;
}

export function computeScore(findings: Finding[]): ScoreBreakdown {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity]++;

  let score = 100;
  const deductions: ScoreBreakdown['deductions'] = [];
  (Object.keys(counts) as Severity[]).forEach((sev) => {
    const n = counts[sev];
    if (n === 0) return;
    const perItem = PER_SEVERITY[sev];
    // log2 curve keeps per-finding pain marginal but never drops to 0
    const deducted = perItem * Math.log2(n + 1);
    score -= deducted;
    deductions.push({ severity: sev, count: n, perItem, deducted });
  });

  const capped = score < 0;
  score = Math.max(0, Math.round(score));

  // Any critical caps the grade at C. No critical + no high → can hit A.
  let grade: Grade;
  if (counts.critical > 0) {
    grade = score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  } else if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return { score, grade, base: 100, deductions, capped };
}
