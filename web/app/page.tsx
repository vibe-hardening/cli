import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'vibe-hardening / one-command security scanner for AI-generated code',
};

/* ─────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    unit: '001',
    title: 'AI-AWARE\nRULES',
    body: '28+ PATTERNS TUNED FOR CODE EMITTED BY CURSOR, V0, LOVABLE, BOLT, CLAUDE CODE AND REPLIT AGENT. NOT A GENERIC SAST.',
    meta: 'RULES / DB-01',
  },
  {
    unit: '002',
    title: 'PLATFORM\nFINGERPRINT',
    body: 'MULTI-SIGNAL VOTING DETECTS WHICH AI TOOL GENERATED YOUR REPO AND WEIGHTS RULES PER PLATFORM.',
    meta: 'DETECT / FN-09',
  },
  {
    unit: '003',
    title: 'LIVE SECRET\nVERIFY',
    body: 'OPTIONAL --VERIFY PINGS OPENAI / STRIPE / GITHUB / SUPABASE TO CONFIRM IF A LEAKED KEY IS STILL ACTIVE.',
    meta: 'NETWORK / VR-04',
  },
];

const TERMINAL_LINES: { type: 'cmd' | 'info' | 'crit' | 'high' | 'ok'; text: string }[] = [
  { type: 'cmd', text: '$ npx vibe-hardening scan' },
  { type: 'info', text: 'SCANNING ./my-app  (147 FILES)' },
  { type: 'info', text: 'PLATFORM  v0.dev   CONFIDENCE 0.87' },
  { type: 'info', text: '──────────────────────────────────────────────────────────' },
  { type: 'crit', text: '[CRITICAL]  vh-secret-openai' },
  { type: 'info', text: '            app/api/chat/route.ts:12' },
  { type: 'info', text: '            sk-proj-AbCd****************************Xyz_' },
  { type: 'info', text: '            → move to process.env, revoke on platform.openai.com' },
  { type: 'info', text: '' },
  { type: 'crit', text: '[CRITICAL]  vh-supabase-rls-disabled' },
  { type: 'info', text: '            supabase/migrations/0001_init.sql:5' },
  { type: 'info', text: '            table public.users created without rls enabled' },
  { type: 'info', text: '            → alter table public.users enable row level security;' },
  { type: 'info', text: '' },
  { type: 'high', text: '[HIGH]      vh-auth-missing-middleware' },
  { type: 'info', text: '            app/api/users/route.ts:3' },
  { type: 'info', text: '            handler exports GET but no auth() call detected' },
  { type: 'info', text: '' },
  { type: 'info', text: '──────────────────────────────────────────────────────────' },
  { type: 'crit', text: 'SCORE  42 / 100   GRADE F' },
  { type: 'info', text: '       2 CRITICAL · 1 HIGH · 0 MEDIUM · 147 FILES / 0.41s' },
  { type: 'ok', text: '       report → ./vibe-hardening-report.html' },
];

/* ─────────────────────────────────────────────────────────────
   SMALL PRIMITIVES
   ───────────────────────────────────────────────────────────── */

function Bracketed({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span className={muted ? 'text-[color:var(--color-dim)]' : ''}>
      <span className="text-[color:var(--color-dim)]">[ </span>
      {children}
      <span className="text-[color:var(--color-dim)]"> ]</span>
    </span>
  );
}

function Divider() {
  return <hr className="border-[color:var(--color-line)]" />;
}

function SectionTag({ label, id }: { label: string; id?: string }) {
  return (
    <div className="flex justify-between items-center py-3 px-6 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
      <span>
        <Bracketed>{label}</Bracketed>
      </span>
      {id && <span>{id}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */

export default function Page() {
  return (
    <main className="relative">
      {/* ============ TOP STRIP ============ */}
      <div className="border-b border-[color:var(--color-line)]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-12 text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)]">
          <div className="col-span-3 px-6 py-3 border-r border-[color:var(--color-line)]">
            UNIT / VH-001
          </div>
          <div className="col-span-3 px-6 py-3 border-r border-[color:var(--color-line)]">
            REV 0.0.1 — PREVIEW
          </div>
          <div className="col-span-3 px-6 py-3 border-r border-[color:var(--color-line)]">
            STATUS <span className="text-[color:var(--color-green)] tick">● ONLINE</span>
          </div>
          <div className="col-span-3 px-6 py-3 text-right">
            BUILD 2026.04.18 / MIT
          </div>
        </div>
      </div>

      {/* ============ NAV ============ */}
      <nav className="border-b border-[color:var(--color-line)]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-[family-name:var(--font-display)] text-xl tracking-[-0.03em]">
              VIBE-HARDENING
            </span>
            <span className="text-[color:var(--color-red)] text-xs">®</span>
          </div>
          <div className="flex gap-6 text-[11px] uppercase tracking-[0.12em]">
            <a href="#features" className="hover:text-[color:var(--color-red)]">
              SYSTEMS
            </a>
            <a href="#terminal" className="hover:text-[color:var(--color-red)]">
              TELEMETRY
            </a>
            <a href="#waitlist" className="hover:text-[color:var(--color-red)]">
              DEPLOY
            </a>
            <a
              href="https://github.com/vibe-hardening/cli"
              className="hover:text-[color:var(--color-red)]"
            >
              SOURCE ↗
            </a>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="border-b border-[color:var(--color-line)]">
        <SectionTag label="H-01 / CORE DIRECTIVE" id="LAT 47.606N  LON 122.332W" />
        <Divider />

        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-12 md:col-span-8">
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,12vw,13rem)] leading-[0.82] tracking-[-0.05em]">
                VIBE CODED.
                <br />
                VIBE HARDENED.
                <span className="text-[color:var(--color-red)] align-top text-[0.25em] ml-1">
                  ®
                </span>
              </h1>
            </div>
            <div className="col-span-12 md:col-span-4 md:pt-4">
              <div className="barcode mb-6" aria-hidden />
              <p className="text-sm uppercase tracking-[0.1em] leading-relaxed text-[color:var(--color-fg)]">
                ONE-COMMAND SECURITY SCANNER FOR CODE WRITTEN BY AI.
              </p>
              <p className="text-sm uppercase tracking-[0.1em] leading-relaxed text-[color:var(--color-dim)] mt-3">
                DETECTS LEAKED KEYS, BROKEN AUTH, MISSING RLS, HALLUCINATED
                PACKAGES AND 24+ OTHER FAILURE MODES IN CODE EMITTED BY
                V0 / LOVABLE / BOLT / CURSOR / CLAUDE CODE.
              </p>
            </div>
          </div>

          {/* CTA command box */}
          <div className="mt-12 border border-[color:var(--color-line)]">
            <div className="flex justify-between items-center px-4 py-2 bg-[color:var(--color-line)]/30 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
              <span>&gt;&gt;&gt; EXECUTE</span>
              <span>ZSH / BASH / POWERSHELL</span>
            </div>
            <div className="px-6 py-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-lg md:text-2xl">
              <span className="text-[color:var(--color-green)]">$</span>
              <code className="font-[family-name:var(--font-mono)] tracking-[0.02em]">
                npx vibe-hardening scan
              </code>
              <span className="cursor-blink" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="border-b border-[color:var(--color-line)]">
        <SectionTag label="S-02 / DELIVERY SYSTEMS" id="3 OF 3" />
        <Divider />
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 border-t border-[color:var(--color-line)]">
          {FEATURES.map((f, i) => (
            <div
              key={f.unit}
              className={[
                'p-8 md:p-10 min-h-[360px] flex flex-col justify-between',
                i < 2 ? 'md:border-r border-[color:var(--color-line)]' : '',
                'border-b md:border-b-0 border-[color:var(--color-line)]',
              ].join(' ')}
            >
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)] mb-8">
                  <span>[ {f.unit} ]</span>
                  <span>{f.meta}</span>
                </div>
                <h2 className="text-[clamp(2rem,3.5vw,3rem)] whitespace-pre-line">
                  {f.title}
                </h2>
              </div>
              <p className="mt-10 text-xs uppercase tracking-[0.08em] leading-relaxed text-[color:var(--color-fg)]/90">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ TERMINAL ============ */}
      <section id="terminal" className="border-b border-[color:var(--color-line)]">
        <SectionTag label="T-03 / LIVE TELEMETRY" id="SAMPLE OUTPUT" />
        <Divider />
        <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-16 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <h2 className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.85]">
              WHAT<br />YOU<br />SEE.
            </h2>
            <p className="mt-8 text-xs uppercase tracking-[0.08em] leading-relaxed text-[color:var(--color-dim)]">
              EVERY FINDING IS SEVERITY-TAGGED, FILE-ANCHORED AND ACTIONABLE.
              EVERY SCAN PRODUCES A 0–100 SCORE AND AN EMBEDDABLE README BADGE.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.12em]">
              <div className="border border-[color:var(--color-line)] p-3">
                <div className="text-[color:var(--color-dim)]">OUTPUT</div>
                <div className="text-base mt-1">CLI · HTML · JSON · MD</div>
              </div>
              <div className="border border-[color:var(--color-line)] p-3">
                <div className="text-[color:var(--color-dim)]">LATENCY</div>
                <div className="text-base mt-1">&lt; 5 SEC / 100K LOC</div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-8">
            <div className="border border-[color:var(--color-line)] bg-black/40">
              <div className="flex justify-between items-center px-4 py-2 border-b border-[color:var(--color-line)] text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                <span>/DEV/TTY/VH-001</span>
                <span>
                  <span className="text-[color:var(--color-red)]">●</span> REC
                </span>
              </div>
              <pre className="p-6 text-[12px] md:text-[13px] leading-[1.65] overflow-x-auto font-[family-name:var(--font-mono)]">
                {TERMINAL_LINES.map((l, i) => {
                  const color =
                    l.type === 'crit'
                      ? 'text-[color:var(--color-red)]'
                      : l.type === 'high'
                        ? 'text-[color:var(--color-red)]/80'
                        : l.type === 'ok'
                          ? 'text-[color:var(--color-green)]'
                          : l.type === 'cmd'
                            ? 'text-[color:var(--color-fg)]'
                            : 'text-[color:var(--color-fg)]/80';
                  return (
                    <div key={i} className={color}>
                      {l.text || '\u00a0'}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MANIFEST / DATA BAR ============ */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 text-[10px] uppercase tracking-[0.12em]">
          {[
            ['RULES', '28+'],
            ['PLATFORMS', '9 AI TOOLS'],
            ['LICENSE', 'MIT / OSS'],
            ['LAUNCH', '2026.05.13'],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`p-6 ${i < 3 ? 'border-r border-[color:var(--color-line)]' : ''}`}
            >
              <div className="text-[color:var(--color-dim)]">{k}</div>
              <div className="font-[family-name:var(--font-display)] text-xl tracking-[-0.03em] mt-2">
                {v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ WAITLIST ============ */}
      <section id="waitlist" className="border-b border-[color:var(--color-line)]">
        <SectionTag label="D-04 / DEPLOYMENT REGISTRY" id="PRE-LAUNCH" />
        <Divider />
        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <h2 className="text-[clamp(2.5rem,7vw,6rem)] leading-[0.85]">
              SHIP<br />HARDENED.
            </h2>
            <p className="mt-6 text-xs uppercase tracking-[0.08em] text-[color:var(--color-dim)] max-w-md">
              PRE-REGISTER TO GET A PING WHEN V0.1.0 GOES LIVE. NO NEWSLETTER,
              NO MARKETING. ONE MESSAGE, ONE LAUNCH.
            </p>
          </div>
          {/* TODO: replace FORMSPREE_ENDPOINT when Formspree form is created at formspree.io/forms */}
          <form
            className="col-span-12 md:col-span-5 flex flex-col gap-3"
            action="https://formspree.io/f/FORMSPREE_ENDPOINT"
            method="POST"
          >
            <label className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)]">
              [ OPERATOR EMAIL ]
            </label>
            <div className="flex border border-[color:var(--color-fg)]">
              <input
                type="email"
                name="email"
                required
                placeholder="you@domain.com"
                className="flex-1 bg-transparent px-4 py-3 text-sm uppercase tracking-[0.08em] placeholder:text-[color:var(--color-dim)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-[color:var(--color-fg)] text-[color:var(--color-bg)] font-[family-name:var(--font-display)] text-sm tracking-[0.05em] hover:bg-[color:var(--color-red)] hover:text-[color:var(--color-fg)] transition-colors"
              >
                SUBSCRIBE →
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
              &gt;&gt;&gt; TRANSMISSION ENCRYPTED / NO THIRD PARTIES
            </p>
          </form>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-b border-[color:var(--color-line)]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-12 text-[10px] uppercase tracking-[0.12em]">
          <div className="col-span-12 md:col-span-3 p-6 border-r border-[color:var(--color-line)]">
            <div className="text-[color:var(--color-dim)]">CHANNELS</div>
            <div className="mt-3 flex flex-col gap-1">
              <a
                href="https://github.com/vibe-hardening/cli"
                className="hover:text-[color:var(--color-red)]"
              >
                GITHUB ↗
              </a>
              <a
                href="https://www.npmjs.com/package/vibe-hardening"
                className="hover:text-[color:var(--color-red)]"
              >
                NPM ↗
              </a>
              <a href="#" className="hover:text-[color:var(--color-red)]">
                TWITTER / X ↗
              </a>
            </div>
          </div>
          <div className="col-span-12 md:col-span-3 p-6 border-r border-[color:var(--color-line)]">
            <div className="text-[color:var(--color-dim)]">DOCS</div>
            <div className="mt-3 flex flex-col gap-1">
              <a href="#" className="hover:text-[color:var(--color-red)]">
                RULE INDEX
              </a>
              <a href="#" className="hover:text-[color:var(--color-red)]">
                CI INTEGRATION
              </a>
              <a href="#" className="hover:text-[color:var(--color-red)]">
                CHANGELOG
              </a>
            </div>
          </div>
          <div className="col-span-12 md:col-span-3 p-6 border-r border-[color:var(--color-line)]">
            <div className="text-[color:var(--color-dim)]">LEGAL</div>
            <div className="mt-3 flex flex-col gap-1">
              <span>MIT LICENSED</span>
              <span>© 2026 VIBE-HARDENING</span>
              <span>NO TELEMETRY</span>
            </div>
          </div>
          <div className="col-span-12 md:col-span-3 p-6">
            <div className="text-[color:var(--color-dim)]">COORDINATES</div>
            <div className="mt-3 flex flex-col gap-1">
              <span>VIBE-HARDENING.IO</span>
              <span>UNIT / VH-001</span>
              <span>
                <span className="text-[color:var(--color-green)] tick">●</span>{' '}
                ONLINE
              </span>
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <div
            className="font-[family-name:var(--font-display)] whitespace-nowrap overflow-hidden text-[clamp(3rem,14vw,13rem)] leading-[0.8] tracking-[-0.05em] select-none"
            style={{ color: 'rgba(234,234,234,0.08)' }}
            aria-hidden
          >
            VIBE-HARDENING™
          </div>
        </div>
      </footer>
    </main>
  );
}
