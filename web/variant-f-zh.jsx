/* VARIANT F · zh-Hant — body copy translated; brand tagline stays English */
const LiveTerminalFzh = () => {
  const lines = React.useMemo(() => [
    { t: 'cmd',  s: '$ npx vibe-hardening scan --deep ./' },
    { t: 'dim',  s: '[00:00.002] 索引 412 個檔案 · 3 個 pkg.json · 1 個 env' },
    { t: 'dim',  s: '[00:00.041] 平台指紋 → nextjs@15 / supabase / drizzle' },
    { t: 'dim',  s: '[00:00.064] 載入 87 條規則 · 12 個領域' },
    { t: 'dim',  s: '' },
    { t: 'crit', s: '[CRITICAL] SEC-01  openai 密鑰外洩 · sk-proj-……' },
    { t: 'info', s: '           app/api/chat/route.ts:12' },
    { t: 'info', s: '           此密鑰 LIVE · 過去 24h 被使用 2,412 次' },
    { t: 'crit', s: '[CRITICAL] AUT-04  supabase RLS 未啟用 public.users' },
    { t: 'info', s: '           supabase/migrations/0001_init.sql:5' },
    { t: 'high', s: '[HIGH]     KEY-02  NEXT_PUBLIC_STRIPE_SECRET' },
    { t: 'info', s: '           .env.local:3' },
    { t: 'high', s: '[HIGH]     NET-07  /api/* CORS 萬用字元' },
    { t: 'info', s: '           middleware.ts:41' },
    { t: 'dim',  s: '' },
    { t: 'dim',  s: '掃描完成 · 耗時 4.82s' },
    { t: 'score', s: 'SCORE   42 / 100    ▓▓▓▓▓▓░░░░░░░░  F' },
  ], []);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i < lines.length) { setN(i + 1); i += 1; setTimeout(tick, 180); }
      else setTimeout(() => { i = 0; setN(0); tick(); }, 4200);
    };
    const start = setTimeout(tick, 400);
    return () => clearTimeout(start);
  }, []);
  return (
    <pre className="term-body" style={{ minHeight: 380 }}>
      {lines.slice(0, n).map((l, i) => (
        <div key={i} className={
          l.t === 'crit' ? 'crit' : l.t === 'high' ? 'high' :
          l.t === 'cmd' ? 'cmd' : l.t === 'score' ? 'score-f' :
          l.t === 'dim' ? 'dim' : 'info'
        }>{l.s || '\u00a0'}</div>
      ))}
      {n < lines.length && <div className="cursor" />}
    </pre>
  );
};

const VariantFzh = () => (
  <main className="vf">
    <div className="vb-classbar">
      <span>▲ VH-001 · 獻給 VIBE CODER ·</span>
      <span>REV 0.0.1 · CHAN 04</span>
      <span>LAT 25.03°N · LNG 121.56°E</span>
      <span>▲ 2026-04-19 ▲</span>
    </div>

    <nav style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '-0.02em' }}>VIBE-HARDENING</span>
          <span style={{ color: 'var(--red)', fontSize: 9 }}>®</span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 12, color: 'var(--dim)', alignItems: 'center' }}>
          <a href="#" className="hot">原始碼 ↗</a>
          <a href="#" className="hot">文件</a>
          <a href="#" className="hot">候補名單</a>
          <a href="#" style={{ border: '1px solid var(--line)', padding: '4px 8px', fontSize: 11 }} className="hot">EN</a>
        </div>
      </div>
    </nav>

    {/* HERO — tagline 保留英文當 brand */}
    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '72px 40px 88px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.25em', color: 'var(--red)', marginBottom: 22 }}>
            ▲ 五秒資安威脅評估
          </div>
          <h1 style={{ fontSize: 'clamp(3rem, 13vw, 13rem)', lineHeight: 0.82, letterSpacing: '-0.05em' }}>
            VIBE CODED.<br/>
            VIBE HARDENED.<span style={{ color: 'var(--red)', fontSize: '0.2em', verticalAlign: 'top', marginLeft: 6 }}>®</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'rgba(234,234,234,0.78)', lineHeight: 1.7, marginTop: 28, maxWidth: '40ch', letterSpacing: '0.02em' }}>
            一個指令，零設定。這是一套懂 v0、Lovable、Bolt、Cursor、Claude Code、Replit Agent、Windsurf 的資安掃描工具，知道它們各自最常漏掉什麼。
          </p>
          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr auto', border: '1px solid var(--line)', maxWidth: 640 }}>
            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
              <span style={{ color: 'var(--green)' }}>$</span>
              <code>npx vibe-hardening scan</code>
              <span className="cursor" />
            </div>
            <div style={{ padding: '10px 16px', borderLeft: '1px solid var(--line)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--dim)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div>執行</div>
              <div style={{ color: 'var(--green)' }}>▶ READY</div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 10, letterSpacing: '0.15em', color: 'var(--dim)' }}>
            可供一般民用 · 不建議用於正式環境
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '1px solid var(--line)', padding: 16, display: 'flex', gap: 18, alignItems: 'center' }}>
            <div className="vb-radar" />
            <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--dim)', lineHeight: 2 }}>
              過去 24H<br/>
              <span style={{ color: 'var(--red)' }}>● 41 新增 CRIT</span><br/>
              <span style={{ color: '#E9A23B' }}>● 128 新增 HIGH</span><br/>
              <span style={{ color: 'var(--green)' }}>● 214 已修復</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="vb-datum"><div className="k">掃描數</div><div className="v">14,822</div></div>
            <div className="vb-datum"><div className="k">活躍密鑰</div><div className="v red">1,214</div></div>
            <div className="vb-datum"><div className="k">中位耗時</div><div className="v">4.8s</div></div>
            <div className="vb-datum"><div className="k">不及格率</div><div className="v red">64%</div></div>
          </div>
          <div style={{ border: '1px solid var(--line)', padding: 14, fontSize: 10, letterSpacing: '0.12em', color: 'var(--dim)', lineHeight: 1.8 }}>
            <div>支援的平台指紋</div>
            <div style={{ color: 'var(--fg)', marginTop: 6, fontSize: 11 }}>
              NEXT.JS · SUPABASE · TRPC · PRISMA<br/>
              DRIZZLE · CONVEX · VERCEL · NETLIFY
            </div>
          </div>
        </div>
      </div>
    </section>

    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="section-tag wrap" style={{ padding: '10px 40px' }}>
        <span className="l">[ LIVE FEED ]</span><span>每 6 秒重跑 · 範例專案</span>
      </div>
      <div className="wrap" style={{ padding: '56px 40px', display: 'grid', gridTemplateColumns: '100px 1fr 140px', gap: 16, alignItems: 'stretch' }}>
        <div style={{ borderRight: '1px solid var(--line)', padding: '12px', fontSize: 9, letterSpacing: '0.2em', color: 'var(--dim)', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>0000</div><div>0100</div><div>0200</div><div>0300</div><div>0400</div><div>0500</div>
        </div>
        <div className="term">
          <div className="term-head"><span>/DEV/TTY/VH-001 · DEMO</span>
            <span style={{ display: 'flex', gap: 14 }}>
              <span><span className="rec">●</span> REC</span>
              <span style={{ color: 'var(--green)' }}>▶ LIVE</span>
            </span>
          </div>
          <LiveTerminalFzh />
        </div>
        <div style={{ borderLeft: '1px solid var(--line)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 10, letterSpacing: '0.12em', color: 'var(--dim)' }}>
          <div>判決</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--red)', letterSpacing: '-0.04em', lineHeight: 1 }}>F</div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>42 / 100</div>
          <div>4 CRIT · 3 HIGH</div>
          <div>可上線？ <span style={{ color: 'var(--red)' }}>▲ 不行</span></div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, color: 'var(--fg)', fontSize: 11, lineHeight: 1.6 }}>你的 repo<br/><span style={{ color: 'var(--dim)', fontSize: 10 }}>很可能也長這樣。</span></div>
        </div>
      </div>
    </section>

    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '96px 40px' }}>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 56, letterSpacing: '0.04em' }}>
          我們檢查什麼 — <span style={{ color: 'var(--fg)' }}>12 領域共 87 條規則。</span>
        </div>
        {[
          { n: 'SEC-01', t: 'AI 專屬規則庫', body: '基於 4,200 個已上線的 vibe-coded 專案訓練。知道 v0 匯出、Cursor 循環、Lovable scaffold 各自最常漏掉什麼，也不會挑它們做對的事。' },
          { n: 'AUT-02', t: '平台指紋辨識', body: '偵測 Next.js、Supabase、tRPC、Prisma、Drizzle、Convex、Vercel、Netlify，只跑適用於你堆疊的規則，一般專案可在 5 秒內掃完。' },
          { n: 'KEY-03', t: '密鑰即時驗證', body: '在 git 歷史裡找出候選密鑰，打去上游 provider 驗證，告訴你哪些還活著。不是 grep — 是一通電話。' },
        ].map(f => (
          <div key={f.n} className="feat">
            <div>
              <div className="n" style={{ marginBottom: 10, color: 'var(--red)' }}>{f.n}</div>
              <h3 style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.1rem)', textTransform: 'none', letterSpacing: 0 }}>{f.t}</h3>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.8, color: 'rgba(234,234,234,0.78)', letterSpacing: '0.02em' }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>

    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '96px 40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
        {[
          { q: '「在 Cursor 寫完客戶專案後跑了一次。六個 CRITICAL。demo 前全修完。」', a: '獨立開發者，柏林' },
          { q: '「唯一一套真的把 NEXT_PUBLIC_* 當成風險而不是功能的掃描器。」', a: '資安工程師，舊金山' },
          { q: '「它抓出 agent 幫我裝的幻覺套件。我以前不知道這種分類存在。」', a: '創辦人，台北' },
        ].map((s, i) => (
          <div key={i}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.85, color: 'rgba(234,234,234,0.85)', marginBottom: 14 }}>{s.q}</p>
            <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '0.12em' }}>— {s.a}</div>
          </div>
        ))}
      </div>
    </section>

    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '96px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div style={{ border: '1px solid var(--line)', padding: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '0.14em', marginBottom: 12 }}>CLI · MIT</div>
          <h3 style={{ fontSize: '2rem', textTransform: 'none', letterSpacing: 0, marginBottom: 10 }}>永久免費。</h3>
          <p style={{ fontSize: 13, color: 'rgba(234,234,234,0.72)', lineHeight: 1.8, marginBottom: 24 }}>任何 repo 都可掃，不限次數，全程在本機執行，資料不外流。</p>
          <code style={{ background: '#141414', border: '1px solid var(--line)', padding: '12px 16px', fontSize: 13, display: 'inline-block' }}>
            npx vibe-hardening scan
          </code>
        </div>
        <div style={{ border: '1px solid var(--fg)', padding: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--red)', letterSpacing: '0.14em', marginBottom: 12 }}>PRO · 團隊版</div>
          <h3 style={{ fontSize: '2rem', textTransform: 'none', letterSpacing: 0, marginBottom: 10 }}>每次 commit，每次 deploy。</h3>
          <p style={{ fontSize: 13, color: 'rgba(234,234,234,0.72)', lineHeight: 1.8, marginBottom: 24 }}>儀表板、GitHub checks、Slack 新增 CRIT 通知、排程重掃。$29 / 專案 / 月。</p>
          <a href="#waitlist" className="btn btn-primary" style={{ letterSpacing: '0.06em' }}>加入候補 →</a>
        </div>
      </div>
    </section>

    <section id="waitlist" style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '120px 40px', maxWidth: 760 }}>
        <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.05em' }}>SHIP HARDENED.</h2>
        <p style={{ fontSize: 15, color: 'var(--dim)', marginTop: 24, lineHeight: 1.8 }}>
          上線當天寄一封信，<span style={{ color: 'var(--fg)' }}>2026-05-13，14:00 UTC</span>。沒有行銷。
        </p>
        <form onSubmit={e => e.preventDefault()} style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="email" placeholder="you@domain.com" style={{ flex: 1, minWidth: 280, background: 'transparent', border: '1px solid var(--line)', padding: '14px 18px', outline: 'none', fontSize: 14, letterSpacing: '0.04em' }} />
          <button className="btn btn-primary" type="submit" style={{ letterSpacing: '0.06em' }}>訂閱 →</button>
        </form>
      </div>
    </section>

    <footer>
      <div className="wrap" style={{ padding: '48px 40px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, fontSize: 11, letterSpacing: '0.12em', color: 'var(--dim)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)', fontSize: 14, letterSpacing: '-0.02em', marginBottom: 12 }}>VIBE-HARDENING<span style={{ color: 'var(--red)', marginLeft: 4 }}>®</span></div>
          © 2026 · MIT · REV 0.0.1
        </div>
        <div><div style={{ color: 'var(--fg)', marginBottom: 10 }}>產品</div><div>CLI</div><div>儀表板（即將推出）</div><div>GitHub App（即將推出）</div></div>
        <div><div style={{ color: 'var(--fg)', marginBottom: 10 }}>原始碼</div><div><a href="#" className="hot">GitHub ↗</a></div><div><a href="#" className="hot">npm ↗</a></div><div><a href="#" className="hot">RSS ↗</a></div></div>
        <div style={{ textAlign: 'right' }}><div style={{ color: 'var(--fg)', marginBottom: 10 }}>狀態</div>實驗性<br/>EN · 中文<br/>VIBE-HARDENING.IO</div>
      </div>
      <div className="wrap" style={{ padding: '0 40px 40px' }}>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 40, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 5rem)', lineHeight: 1.05, color: 'rgba(234,234,234,0.78)', letterSpacing: '-0.01em' }}>
          "Vibe coded. Vibe hardened."
        </div>
      </div>
    </footer>
  </main>
);

window.VariantFzh = VariantFzh;
