import type { ScanReport } from '../core/scan.js';

export interface JsonReport {
  version: string;
  createdAt: string;
  filesScanned: number;
  durationMs: number;
  platform: ScanReport['platform'];
  score: ScanReport['score'];
  summary: ScanReport['summary'];
  findings: ScanReport['findings'];
  /**
   * Present only when scan was run with `--compare <baseline>`.
   * `findings` and `summary` reflect ONLY the delta (new findings
   * since the baseline); `score` still reflects the absolute state.
   * CI consumers should branch on the presence of this field.
   */
  compare?: ScanReport['compare'];
}

export function renderJson(report: ScanReport, version: string): string {
  const payload: JsonReport = {
    version,
    createdAt: new Date().toISOString(),
    filesScanned: report.filesScanned,
    durationMs: report.durationMs,
    platform: report.platform,
    score: report.score,
    summary: report.summary,
    findings: report.findings,
    ...(report.compare ? { compare: report.compare } : {}),
  };
  return JSON.stringify(payload, null, 2);
}
