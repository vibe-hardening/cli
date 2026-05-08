import { ImageResponse } from 'next/og';

/**
 * Dynamic OG image — auto-mounted by Next.js App Router convention.
 * Generated on every social-share unfurl (Twitter / FB / LinkedIn /
 * Threads / Slack / Discord / HN). The output is cached by Vercel's
 * edge so each unique image generates once and is then served from
 * CDN.
 *
 * Why dynamic instead of static `/og.png`: when we bump rule counts,
 * platforms supported, or version, the OG image stays in sync with
 * the source of truth (this file). No more "social share unfurl
 * shows 51 rules from three releases ago" drift.
 *
 * Brutalist look mirroring the landing page:
 *   - black bg, red ▲ accent, mono font
 *   - massive "VIBE CODED. / VIBE HARDENED." display
 *   - tagline mentions code AND agent skill files (positioning C)
 *   - footer strip = real product spec numbers
 *
 * Satori (the engine behind ImageResponse) has limited CSS — every
 * container with multiple children needs explicit `display: 'flex'`,
 * and only flex layouts work (no grid, no float). Inline styles only.
 */

export const runtime = 'edge';
export const alt =
  'vibe-hardening — security scanner for code and AI agent skill files';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const RED = '#ff3333';
const BG = '#0a0a0a';
const FG = '#f5f5f5';
const DIM = '#888';
const LINE = '#222';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: BG,
          color: FG,
          padding: '56px 64px',
          fontFamily: 'monospace',
        }}
      >
        {/* CLASSIFICATION BAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '15px',
            letterSpacing: '0.18em',
            color: DIM,
            borderBottom: `1px solid ${LINE}`,
            paddingBottom: '20px',
          }}
        >
          <span style={{ color: RED, display: 'flex' }}>▲ VH-001</span>
          <span style={{ display: 'flex' }}>
            REV 0.4.0 · FOR THE VIBE CODER
          </span>
          <span style={{ display: 'flex' }}>▲ LAUNCH 2026-05-13 ▲</span>
        </div>

        {/* HERO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: '48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '128px',
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: '-0.045em',
            }}
          >
            VIBE CODED.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              fontSize: '128px',
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: '-0.045em',
              marginTop: '4px',
            }}
          >
            VIBE HARDENED.
            <span
              style={{
                display: 'flex',
                color: RED,
                fontSize: '36px',
                marginLeft: '12px',
                marginTop: '8px',
              }}
            >
              ®
            </span>
          </div>
        </div>

        {/* TAGLINE */}
        <div
          style={{
            display: 'flex',
            fontSize: '26px',
            lineHeight: 1.45,
            color: '#bbb',
            marginTop: '36px',
            maxWidth: '980px',
          }}
        >
          One command. Scans code AND AI agent skill files for Cursor,
          Claude Code, OpenClaw, Hermes, and other agent platforms.
        </div>

        {/* STATS STRIP */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: '24px',
            borderTop: `1px solid ${LINE}`,
            fontSize: '17px',
            color: DIM,
            letterSpacing: '0.06em',
          }}
        >
          {[
            ['74', 'CODE RULES'],
            ['65', 'AGENT RULES'],
            ['4', 'LANGUAGES'],
            ['10', 'AGENT PLATFORMS'],
            ['$0', 'LLM TOKEN COST'],
          ].map(([num, label]) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}
            >
              <span style={{ color: FG, fontSize: '24px', fontWeight: 700 }}>
                {num}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
