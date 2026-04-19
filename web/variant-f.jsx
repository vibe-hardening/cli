/* VARIANT F — FUSION (B + C)
   Hero & terminal from B (teeth, telemetry, animated scan, verdict frame)
   Features, quotes, pricing, waitlist from C (restraint, readable)
   Footer tagline from A (serif pull-quote writ large)
*/

const LiveTerminalF = () => {
  const lines = React.useMemo(() => [
    { t: 'cmd',  s: '$ npx vibe-hardening scan --deep ./' },
    { t: 'dim',  s: '[00:00.002] indexing 412 files · 3 pkg.json · 1 env' },
    { t: 'dim',  s: '[00:00.041] fingerprint → nextjs@15 / supabase / drizzle' },
    { t: 'dim',  s: '[00:00.064] loading 87 rules · 12 domains' },
    { t: 'dim',  s: '' },
    { t: 'crit', s: '[CRITICAL] SEC-01  leaked openai key · sk-proj-……' },
    { t: 'info', s: '           app/api/chat/route.ts:12' },
    { t: 'info', s: '           key is LIVE · used 2,412 times in last 24h' },
    { t: 'crit', s: '[CRITICAL] AUT-04  supabase rls disabled on public.users' },
    { t: 'info', s: '           supabase/migrations/0001_init.sql:5' },
    { t: 'high', s: '[HIGH]     KEY-02  NEXT_PUBLIC_STRIPE_SECRET' },
    { t: 'info', s: '           .env.local:3' },
    { t: 'high', s: '[HIGH]     NET-07  CORS wildcard on /api/*' },
    { t: 'info', s: '           middleware.ts:41' },
    { t: 'dim',  s: '' },
    { t: 'dim',  s: 'scan complete in 4.82s' },
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

const VariantF = () => (
  <main className="vf">
    {/* CLASSIFICATION BAR — kept from B, single instance */}
    <div className="vb-classbar">
      <span>▲ VH-001 · FOR THE VIBE CODER ·</span>
      <span>REV 0.0.1 · CHAN 04</span>
      <span>LAT 25.03°N · LNG 121.56°E</span>
      <span>▲ 2026-04-19 ▲</span>
    </div>

    {/* NAV — C-style clean, one accent */}
    <nav style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '-0.02em' }}>VIBE-HARDENING</span>
          <span style={{ color: 'var(--red)', fontSize: 9 }}>®</span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 12, color: 'var(--dim)', alignItems: 'center' }}>
          <a href="#" className="hot">Source ↗</a>
          <a href="#" className="hot">Docs</a>
          <a href="#" className="hot">Waitlist</a>
          <a href="#" style={{ border: '1px solid var(--line)', padding: '4px 8px', fontSize: 11, letterSpacing: '0.1em' }} className="hot">中文</a>
        </div>
      </div>
    </nav>

    {/* HERO — B's teeth: giant type + radar + datum panel */}
    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '72px 40px 88px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.25em', color: 'var(--red)', marginBottom: 22 }}>
            ▲ FIVE-SECOND THREAT ASSESSMENT
          </div>
          <h1 style={{ fontSize: 'clamp(3rem, 13vw, 13rem)', lineHeight: 0.82, letterSpacing: '-0.05em' }}>
            VIBE CODED.<br/>
            VIBE HARDENED.<span style={{ color: 'var(--red)', fontSize: '0.2em', verticalAlign: 'top', marginLeft: 6 }}>®</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'rgba(234,234,234,0.78)', lineHeight: 1.55, marginTop: 28, maxWidth: '44ch', letterSpacing: '0.02em' }}>
            One command. No config. A security scanner that understands v0, Lovable, Bolt, Cursor, Claude Code, Replit Agent, Windsurf — and what each of them tends to get wrong.
          </p>
          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr auto', border: '1px solid var(--line)', maxWidth: 640 }}>
            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
              <span style={{ color: 'var(--green)' }}>$</span>
              <code>npx vibe-hardening scan</code>
              <span className="cursor" />
            </div>
            <div style={{ padding: '10px 16px', borderLeft: '1px solid var(--line)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--dim)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div>EXECUTE</div>
              <div style={{ color: 'var(--green)' }}>▶ READY</div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 10, letterSpacing: '0.2em', color: 'var(--dim)' }}>
            APPROVED FOR CIVILIAN USE · NOT RATED FOR PRODUCTION
          </div>
        </div>

        {/* Right: HUD panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '1px solid var(--line)', padding: 16, display: 'flex', gap: 18, alignItems: 'center' }}>
            <div className="vb-radar" />
            <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--dim)', lineHeight: 2 }}>
              LAST 24H<br/>
              <span style={{ color: 'var(--red)' }}>● 41 NEW CRIT</span><br/>
              <span style={{ color: '#E9A23B' }}>● 128 NEW HIGH</span><br/>
              <span style={{ color: 'var(--green)' }}>● 214 FIXED</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="vb-datum"><div className="k">REPOS SCANNED</div><div className="v">14,822</div></div>
            <div className="vb-datum"><div className="k">KEYS LIVE</div><div className="v red">1,214</div></div>
            <div className="vb-datum"><div className="k">MEDIAN SCAN</div><div className="v">4.8s</div></div>
            <div className="vb-datum"><div className="k">FAIL RATE</div><div className="v red">64%</div></div>
          </div>
          <div style={{ border: '1px solid var(--line)', padding: 14, fontSize: 10, letterSpacing: '0.18em', color: 'var(--dim)', lineHeight: 1.8 }}>
            <div>FINGERPRINT SUPPORT</div>
            <div style={{ color: 'var(--fg)', marginTop: 6, fontSize: 11 }}>
              NEXT.JS · SUPABASE · TRPC · PRISMA<br/>
              DRIZZLE · CONVEX · VERCEL · NETLIFY
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* TERMINAL — B's coordinate frame + verdict card */}
    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="section-tag wrap" style={{ padding: '10px 40px' }}>
        <span className="l">[ LIVE FEED ]</span><span>RE-RUNS EVERY 6s · DEMO REPO</span>
      </div>
      <div className="wrap" style={{ padding: '56px 40px', display: 'grid', gridTemplateColumns: '100px 1fr 140px', gap: 16, alignItems: 'stretch' }}>
        <div style={{ borderRight: '1px solid var(--line)', padding: '12px', fontSize: 9, letterSpacing: '0.2em', color: 'var(--dim)', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>0000</div><div>0100</div><div>0200</div><div>0300</div><div>0400</div><div>0500</div>
        </div>
        <div className="term">
          <div className="term-head">
            <span>/DEV/TTY/VH-001 · DEMO</span>
            <span style={{ display: 'flex', gap: 14 }}>
              <span><span className="rec">●</span> REC</span>
              <span style={{ color: 'var(--green)' }}>▶ LIVE</span>
            </span>
          </div>
          <LiveTerminalF />
        </div>
        <div style={{ borderLeft: '1px solid var(--line)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 10, letterSpacing: '0.18em', color: 'var(--dim)' }}>
          <div>VERDICT</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--red)', letterSpacing: '-0.04em', lineHeight: 1 }}>F</div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>42 / 100</div>
          <div>4 CRIT · 3 HIGH</div>
          <div>SHIP? <span style={{ color: 'var(--red)' }}>▲ NO</span></div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, color: 'var(--fg)', fontSize: 11, lineHeight: 1.6 }}>
            Your repo<br/><span style={{ color: 'var(--dim)', fontSize: 10 }}>might look the same.</span>
          </div>
        </div>
      </div>
    </section>

    {/* FEATURES — C's restraint, two-column rhythm */}
    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '96px 40px' }}>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 56, letterSpacing: '0.04em' }}>
          What it checks — <span style={{ color: 'var(--fg)' }}>87 rules across 12 domains.</span>
        </div>
        {[
          { n: 'SEC-01', t: 'AI-aware rules', body: 'Trained on 4,200 shipped vibe-coded apps. Knows what a v0 export, a Cursor loop, a Lovable scaffold each tend to miss — and won\'t complain about what they get right.' },
          { n: 'AUT-02', t: 'Platform fingerprint', body: 'Detects Next.js, Supabase, tRPC, Prisma, Drizzle, Convex, Vercel, Netlify. Runs only the rules that apply to your stack, so scans stay under 5 seconds on average repos.' },
          { n: 'KEY-03', t: 'Live secret verification', body: 'Finds candidate keys in your git history, probes their provider endpoints, and tells you which ones are still live. Not a grep — a phone call.' },
        ].map(f => (
          <div key={f.n} className="feat">
            <div>
              <div className="n" style={{ marginBottom: 10, color: 'var(--red)' }}>{f.n}</div>
              <h3 style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.1rem)', textTransform: 'none' }}>{f.t}</h3>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.65, color: 'rgba(234,234,234,0.78)', letterSpacing: '0.02em' }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>

    {/* QUOTES — C */}
    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '96px 40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
        {[
          { q: '"Ran it on a client project after a Cursor session. Six criticals. Fixed before the demo call."', a: 'indie dev, berlin' },
          { q: '"The only scanner that understands NEXT_PUBLIC_* is a liability, not a feature."', a: 'security eng, sf' },
          { q: '"It flagged a hallucinated package my agent installed. I did not know that was a category."', a: 'founder, taipei' },
        ].map((s, i) => (
          <div key={i}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.65, color: 'rgba(234,234,234,0.85)', marginBottom: 14 }}>{s.q}</p>
            <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '0.12em' }}>— {s.a}</div>
          </div>
        ))}
      </div>
    </section>

    {/* PRICING — C */}
    <section style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '96px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div style={{ border: '1px solid var(--line)', padding: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '0.14em', marginBottom: 12 }}>CLI · MIT</div>
          <h3 style={{ fontSize: '2rem', textTransform: 'none', marginBottom: 10 }}>Free, forever.</h3>
          <p style={{ fontSize: 13, color: 'rgba(234,234,234,0.72)', lineHeight: 1.6, marginBottom: 24 }}>Scan any repo. Unlimited runs. Runs locally, data never leaves your machine.</p>
          <code style={{ background: '#141414', border: '1px solid var(--line)', padding: '12px 16px', fontSize: 13, display: 'inline-block' }}>
            npx vibe-hardening scan
          </code>
        </div>
        <div style={{ border: '1px solid var(--fg)', padding: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--red)', letterSpacing: '0.14em', marginBottom: 12 }}>PRO · TEAM SAAS</div>
          <h3 style={{ fontSize: '2rem', textTransform: 'none', marginBottom: 10 }}>Per-commit, per-deploy.</h3>
          <p style={{ fontSize: 13, color: 'rgba(234,234,234,0.72)', lineHeight: 1.6, marginBottom: 24 }}>Dashboard, GitHub checks, Slack alerts on new criticals, scheduled rescans. $29 / project / mo.</p>
          <a href="#waitlist" className="btn btn-primary" style={{ letterSpacing: '0.06em' }}>Join waitlist →</a>
        </div>
      </div>
    </section>

    {/* WAITLIST — C, calm */}
    <section id="waitlist" style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '120px 40px', maxWidth: 760 }}>
        <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.05em' }}>SHIP HARDENED.</h2>
        <p style={{ fontSize: 15, color: 'var(--dim)', marginTop: 24, lineHeight: 1.55 }}>
          One email on launch day, <span style={{ color: 'var(--fg)' }}>2026-05-13, 14:00 UTC</span>. No marketing.
        </p>
        <form onSubmit={e => e.preventDefault()} style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="email" placeholder="you@domain.com" style={{ flex: 1, minWidth: 280, background: 'transparent', border: '1px solid var(--line)', padding: '14px 18px', outline: 'none', fontSize: 14, letterSpacing: '0.04em' }} />
          <button className="btn btn-primary" type="submit" style={{ letterSpacing: '0.06em' }}>SUBSCRIBE →</button>
        </form>
      </div>
    </section>

    {/* FOOTER — A's serif tagline, writ large */}
    <footer>
      <div className="wrap" style={{ padding: '48px 40px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)', fontSize: 14, letterSpacing: '-0.02em', marginBottom: 12 }}>VIBE-HARDENING<span style={{ color: 'var(--red)', marginLeft: 4 }}>®</span></div>
          © 2026 · MIT · REV 0.0.1
        </div>
        <div><div style={{ color: 'var(--fg)', marginBottom: 10 }}>PRODUCT</div><div>CLI</div><div>Dashboard (soon)</div><div>GitHub App (soon)</div></div>
        <div><div style={{ color: 'var(--fg)', marginBottom: 10 }}>SOURCE</div><div><a href="#" className="hot">GitHub ↗</a></div><div><a href="#" className="hot">npm ↗</a></div><div><a href="#" className="hot">RSS ↗</a></div></div>
        <div style={{ textAlign: 'right' }}><div style={{ color: 'var(--fg)', marginBottom: 10 }}>STATUS</div>EXPERIMENTAL<br/>EN · 中文<br/>VIBE-HARDENING.IO</div>
      </div>
      <div className="wrap" style={{ padding: '0 40px 40px' }}>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 40, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 5rem)', lineHeight: 1.05, color: 'rgba(234,234,234,0.78)', letterSpacing: '-0.01em' }}>
          "Vibe coded. Vibe hardened."
        </div>
      </div>
    </footer>
  </main>
);

window.VariantF = VariantF;
