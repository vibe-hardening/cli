import type { ScanReport } from '../core/scan.js';
import type { Finding, Severity } from '../core/types.js';
import { renderBadge } from '../scoring/badge.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function severityClass(s: Severity): string {
  return `vh-sev-${s}`;
}

function groupByFile(findings: Finding[]): Map<string, Finding[]> {
  const m = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = m.get(f.file);
    if (arr) arr.push(f);
    else m.set(f.file, [f]);
  }
  return m;
}

function renderFindingHtml(f: Finding): string {
  return `<div class="vh-finding ${severityClass(f.severity)}">
  <div class="vh-finding-head">
    <span class="vh-badge vh-badge-${f.severity}">${f.severity.toUpperCase()}</span>
    <code class="vh-rule-id">${escapeHtml(f.ruleId)}</code>
    <span class="vh-loc">${f.line}:${f.column}</span>
  </div>
  <div class="vh-msg">${escapeHtml(f.message)}</div>
  ${
    f.snippet
      ? `<div class="vh-snippet"><span class="vh-label">snippet:</span> <code>${escapeHtml(f.snippet)}</code></div>`
      : ''
  }
  ${
    f.remediation
      ? `<div class="vh-fix"><span class="vh-label">fix:</span> ${escapeHtml(f.remediation)}</div>`
      : ''
  }
</div>`;
}

export function renderHtml(report: ScanReport, version: string): string {
  const { score, grade } = report.score;
  const badge = renderBadge(score, grade);
  const byFile = groupByFile(report.findings);
  const totalFindings = report.findings.length;
  const generatedAt = new Date().toISOString();

  const gradeColour =
    grade === 'A' || grade === 'B'
      ? '#4af626'
      : grade === 'C'
        ? '#e9a23b'
        : '#ff2a2a';

  let body = '';
  if (totalFindings === 0) {
    body = `<section class="vh-empty"><div class="vh-empty-check">✓</div><h2>No findings.</h2><p>Ship with confidence.</p></section>`;
  } else {
    body = [...byFile]
      .map(
        ([file, findings]) => `<section class="vh-file">
  <h3 class="vh-file-path">${escapeHtml(file)}</h3>
  ${findings.map(renderFindingHtml).join('\n')}
</section>`,
      )
      .join('\n');
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>vibe-hardening · scan report · ${grade} ${score}/100</title>
<style>
  *, *::before, *::after { box-sizing: border-box; border-radius: 0; margin: 0; padding: 0; }
  html, body {
    background: #0a0a0a; color: #eaeaea;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px; line-height: 1.5; letter-spacing: 0.04em;
    -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
  }
  body::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 200;
    background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.022) 2px 3px);
    mix-blend-mode: overlay;
  }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
  .vh-top {
    background: #ff2a2a; color: #0a0a0a;
    font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;
    padding: 4px 32px; display: flex; justify-content: space-between; align-items: center;
  }
  header.vh-head { border-bottom: 1px solid #2a2a2a; padding: 48px 0; }
  header h1 {
    font-family: 'Archivo Black', ui-sans-serif, system-ui, sans-serif;
    font-size: clamp(3rem, 10vw, 8rem); line-height: 0.85; letter-spacing: -0.05em;
    text-transform: uppercase; margin-bottom: 16px;
  }
  .vh-meta { display: flex; gap: 32px; margin-top: 32px; flex-wrap: wrap; font-size: 11px; color: #6a6a6a; }
  .vh-meta div span { color: #eaeaea; display: block; margin-top: 4px; font-size: 13px; }
  .vh-score-block {
    display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center;
    padding: 24px 0; border-top: 1px solid #2a2a2a; border-bottom: 1px solid #2a2a2a; margin-top: 24px;
  }
  .vh-grade {
    font-family: 'Archivo Black', sans-serif;
    font-size: clamp(4rem, 10vw, 7rem); letter-spacing: -0.04em; line-height: 1;
    color: ${gradeColour}; min-width: 120px; text-align: center;
  }
  .vh-score-detail { font-size: 13px; line-height: 1.7; }
  .vh-score-detail strong { color: #eaeaea; }
  section.vh-summary {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px;
    margin: 32px 0; background: #2a2a2a; border: 1px solid #2a2a2a;
  }
  section.vh-summary > div { background: #0a0a0a; padding: 20px; }
  section.vh-summary .vh-count {
    font-family: 'Archivo Black', sans-serif; font-size: 2rem; letter-spacing: -0.02em;
  }
  section.vh-summary .vh-count.zero { color: #6a6a6a; }
  section.vh-summary .vh-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6a6a6a; margin-bottom: 8px; }
  .vh-sev-critical .vh-count { color: #ff2a2a; }
  .vh-sev-high .vh-count { color: #ff2a2a; opacity: 0.8; }
  .vh-sev-medium .vh-count { color: #e9a23b; }
  .vh-sev-low .vh-count { color: #4af626; opacity: 0.8; }
  .vh-sev-info .vh-count { color: #6a6a6a; }
  section.vh-file { margin: 48px 0; }
  h3.vh-file-path {
    font-family: 'Archivo Black', sans-serif; font-size: 1.25rem; letter-spacing: -0.02em;
    color: #4af626; margin-bottom: 16px; word-break: break-all;
  }
  .vh-finding {
    border: 1px solid #2a2a2a; padding: 20px; margin-bottom: 12px;
  }
  .vh-finding-head { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
  .vh-badge {
    font-family: 'Archivo Black', sans-serif; font-size: 10px; letter-spacing: 0.15em;
    padding: 4px 10px; color: #0a0a0a;
  }
  .vh-badge-critical { background: #ff2a2a; color: #fff; }
  .vh-badge-high { background: #ff2a2a; color: #fff; opacity: 0.85; }
  .vh-badge-medium { background: #e9a23b; color: #0a0a0a; }
  .vh-badge-low { background: #4af626; color: #0a0a0a; }
  .vh-badge-info { background: #6a6a6a; color: #0a0a0a; }
  .vh-rule-id { color: #eaeaea; font-size: 12px; }
  .vh-loc { color: #6a6a6a; font-size: 11px; }
  .vh-msg { margin-bottom: 10px; color: #eaeaea; }
  .vh-snippet, .vh-fix { font-size: 12px; color: #aaa; margin-top: 6px; white-space: pre-wrap; }
  .vh-label { color: #6a6a6a; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; }
  .vh-snippet code { color: #eaeaea; background: #141414; padding: 2px 6px; }
  footer {
    border-top: 1px solid #2a2a2a; padding: 32px; margin-top: 64px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #6a6a6a;
  }
  footer a { color: inherit; text-decoration: none; }
  footer a:hover { color: #eaeaea; }
  .vh-badge-embed { margin: 16px 0 0; }
  .vh-empty {
    padding: 96px 0; text-align: center; border: 1px solid #2a2a2a; margin: 48px 0;
  }
  .vh-empty h2 {
    font-family: 'Archivo Black', sans-serif; font-size: 3rem; color: #4af626;
    margin: 16px 0 8px; text-transform: uppercase; letter-spacing: -0.03em;
  }
  .vh-empty p { color: #6a6a6a; font-size: 13px; letter-spacing: 0.08em; }
  .vh-empty-check {
    font-size: 5rem; color: #4af626; line-height: 1;
  }
</style>
</head>
<body>
  <div class="vh-top">
    <span>▲ VH-001 · VIBE-HARDENING REPORT</span>
    <span>GENERATED ${escapeHtml(generatedAt)}</span>
  </div>

  <div class="wrap">
    <header class="vh-head">
      <h1>VIBE CODED.<br>VIBE HARDENED.</h1>
      <div class="vh-meta">
        <div>SCANNED<span>${report.filesScanned} files</span></div>
        <div>DURATION<span>${report.durationMs}ms</span></div>
        <div>PLATFORM<span>${escapeHtml(report.platform.platform)}${
          report.platform.platform !== 'unknown'
            ? ` (${Math.round(report.platform.confidence * 100)}%)`
            : ''
        }</span></div>
        <div>TOOL<span>vibe-hardening v${escapeHtml(version)}</span></div>
      </div>

      <div class="vh-score-block">
        <div class="vh-grade">${grade}</div>
        <div class="vh-score-detail">
          <strong>${score} / 100</strong><br>
          ${totalFindings} findings across ${byFile.size} file${byFile.size === 1 ? '' : 's'}.<br>
          <div class="vh-badge-embed">${badge}</div>
        </div>
      </div>

      <section class="vh-summary">
        <div class="vh-sev-critical"><div class="vh-label">CRITICAL</div><div class="vh-count ${report.summary.critical === 0 ? 'zero' : ''}">${report.summary.critical}</div></div>
        <div class="vh-sev-high"><div class="vh-label">HIGH</div><div class="vh-count ${report.summary.high === 0 ? 'zero' : ''}">${report.summary.high}</div></div>
        <div class="vh-sev-medium"><div class="vh-label">MEDIUM</div><div class="vh-count ${report.summary.medium === 0 ? 'zero' : ''}">${report.summary.medium}</div></div>
        <div class="vh-sev-low"><div class="vh-label">LOW</div><div class="vh-count ${report.summary.low === 0 ? 'zero' : ''}">${report.summary.low}</div></div>
        <div class="vh-sev-info"><div class="vh-label">INFO</div><div class="vh-count ${report.summary.info === 0 ? 'zero' : ''}">${report.summary.info}</div></div>
      </section>
    </header>

    ${body}
  </div>

  <footer>
    <span>© 2026 VIBE-HARDENING ·  MIT</span>
    <span><a href="https://vibe-hardening.io">VIBE-HARDENING.IO</a></span>
  </footer>
</body>
</html>`;
}
