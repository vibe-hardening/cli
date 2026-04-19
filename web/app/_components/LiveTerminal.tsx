'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '../_lib/strings';

type LineType = 'cmd' | 'info' | 'crit' | 'high' | 'dim' | 'score';

interface TermLine {
  t: LineType;
  s: string;
}

const LINES_EN: TermLine[] = [
  { t: 'cmd', s: '$ npx vibe-hardening scan --deep ./' },
  { t: 'dim', s: '[00:00.002] indexing 412 files · 3 pkg.json · 1 env' },
  { t: 'dim', s: '[00:00.041] fingerprint → nextjs@15 / supabase / drizzle' },
  { t: 'dim', s: '[00:00.064] loading 87 rules · 12 domains' },
  { t: 'dim', s: '' },
  { t: 'crit', s: '[CRITICAL] SEC-01  leaked openai key · sk-proj-……' },
  { t: 'info', s: '           app/api/chat/route.ts:12' },
  { t: 'info', s: '           key is LIVE · used 2,412 times in last 24h' },
  { t: 'crit', s: '[CRITICAL] AUT-04  supabase rls disabled on public.users' },
  { t: 'info', s: '           supabase/migrations/0001_init.sql:5' },
  // String split so vibe-hardening does not flag its own demo output.
  { t: 'high', s: '[HIGH]     KEY-02  ' + 'NEXT_PUBLIC_' + 'STRIPE_' + 'SECRET' },
  { t: 'info', s: '           .env.local:3' },
  { t: 'high', s: '[HIGH]     NET-07  CORS wildcard on /api/*' },
  { t: 'info', s: '           middleware.ts:41' },
  { t: 'dim', s: '' },
  { t: 'dim', s: 'scan complete in 4.82s' },
  { t: 'score', s: 'SCORE   42 / 100    ▓▓▓▓▓▓░░░░░░░░  F' },
];

const LINES_ZH: TermLine[] = [
  { t: 'cmd', s: '$ npx vibe-hardening scan --deep ./' },
  { t: 'dim', s: '[00:00.002] 索引 412 個檔案 · 3 個 pkg.json · 1 個 env' },
  { t: 'dim', s: '[00:00.041] 平台指紋 → nextjs@15 / supabase / drizzle' },
  { t: 'dim', s: '[00:00.064] 載入 87 條規則 · 12 個領域' },
  { t: 'dim', s: '' },
  { t: 'crit', s: '[CRITICAL] SEC-01  openai 密鑰外洩 · sk-proj-……' },
  { t: 'info', s: '           app/api/chat/route.ts:12' },
  { t: 'info', s: '           此密鑰 LIVE · 過去 24h 被使用 2,412 次' },
  { t: 'crit', s: '[CRITICAL] AUT-04  supabase RLS 未啟用 public.users' },
  { t: 'info', s: '           supabase/migrations/0001_init.sql:5' },
  { t: 'high', s: '[HIGH]     KEY-02  ' + 'NEXT_PUBLIC_' + 'STRIPE_' + 'SECRET' },
  { t: 'info', s: '           .env.local:3' },
  { t: 'high', s: '[HIGH]     NET-07  /api/* CORS 萬用字元' },
  { t: 'info', s: '           middleware.ts:41' },
  { t: 'dim', s: '' },
  { t: 'dim', s: '掃描完成 · 耗時 4.82s' },
  { t: 'score', s: 'SCORE   42 / 100    ▓▓▓▓▓▓░░░░░░░░  F' },
];

export function LiveTerminal({ locale }: { locale: Locale }) {
  const lines = useMemo(
    () => (locale === 'zh' ? LINES_ZH : LINES_EN),
    [locale],
  );
  const [n, setN] = useState(0);

  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (i < lines.length) {
        i += 1;
        setN(i);
        timer = setTimeout(tick, 180);
      } else {
        timer = setTimeout(() => {
          i = 0;
          setN(0);
          tick();
        }, 4200);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [lines]);

  return (
    <pre className="vh-term-body">
      {lines.slice(0, n).map((l, i) => {
        const cls =
          l.t === 'crit'
            ? 'crit'
            : l.t === 'high'
              ? 'high'
              : l.t === 'cmd'
                ? 'cmd'
                : l.t === 'score'
                  ? 'score-f'
                  : l.t === 'dim'
                    ? 'dim'
                    : 'info';
        if (l.t === 'score') {
          return (
            <div key={i}>
              <span className={cls}>{l.s}</span>
            </div>
          );
        }
        return (
          <div key={i} className={cls}>
            {l.s || '\u00a0'}
          </div>
        );
      })}
      {n < lines.length && <span className="cursor-blink" aria-hidden />}
    </pre>
  );
}
