import type { ScanReport } from '../core/scan.js';

export interface JsonReport {
  version: string;
  createdAt: string;
  filesScanned: number;
  durationMs: number;
  platform: ScanReport['platform'];
  summary: ScanReport['summary'];
  findings: ScanReport['findings'];
}

export function renderJson(report: ScanReport, version: string): string {
  const payload: JsonReport = {
    version,
    createdAt: new Date().toISOString(),
    filesScanned: report.filesScanned,
    durationMs: report.durationMs,
    platform: report.platform,
    summary: report.summary,
    findings: report.findings,
  };
  return JSON.stringify(payload, null, 2);
}
