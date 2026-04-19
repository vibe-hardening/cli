import type { Locale } from '../_lib/strings';
import { strings } from '../_lib/strings';

const TERMINAL_LINES: {
  type: 'cmd' | 'info' | 'crit' | 'high' | 'ok';
  text: string;
}[] = [
  { type: 'cmd', text: '$ npx vibe-hardening scan' },
  { type: 'info', text: '' },
  { type: 'crit', text: '[CRITICAL]  vh-secret-openai' },
  { type: 'info', text: '            app/api/chat/route.ts:12' },
  { type: 'info', text: '' },
  { type: 'crit', text: '[CRITICAL]  vh-supabase-rls-disabled' },
  { type: 'info', text: '            supabase/migrations/0001_init.sql:5' },
  { type: 'info', text: '' },
  { type: 'high', text: '[HIGH]      vh-auth-missing-middleware' },
  { type: 'info', text: '            app/api/users/route.ts:3' },
  { type: 'info', text: '' },
  { type: 'crit', text: 'SCORE       42 / 100   F' },
];

function Divider() {
  return <hr className="border-[color:var(--color-line)]" />;
}

function SectionTag({ label, id }: { label: string; id?: string }) {
  return (
    <div className="flex justify-between items-center py-3 px-6 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
      <span>[ {label} ]</span>
      {id && <span>{id}</span>}
    </div>
  );
}

export function Landing({ locale }: { locale: Locale }) {
  const t = strings[locale];
  const isZh = locale === 'zh';
  const displayClass = isZh
    ? 'font-[family-name:var(--font-display-zh)]'
    : 'font-[family-name:var(--font-display)]';

  return (
    <main className="relative">
      {/* TOP STRIP */}
      <div className="border-b border-[color:var(--color-line)]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-4 text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)]">
          <div className="px-6 py-3 border-r border-[color:var(--color-line)]">
            VH-001
          </div>
          <div className="px-6 py-3 border-r border-[color:var(--color-line)]">
            REV 0.0.1
          </div>
          <div className="px-6 py-3 border-r border-[color:var(--color-line)]">
            <span className="text-[color:var(--color-green)] tick">●</span>{' '}
            {t.topStrip.online}
          </div>
          <div className="px-6 py-3 text-right">MIT</div>
        </div>
      </div>

      {/* NAV */}
      <nav className="border-b border-[color:var(--color-line)]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`${displayClass} text-xl tracking-[-0.03em]`}
            >
              VIBE-HARDENING
            </span>
            <span className="text-[color:var(--color-red)] text-xs">®</span>
          </div>
          <div className="flex gap-6 text-[11px] uppercase tracking-[0.12em] items-center">
            <a
              href="https://github.com/vibe-hardening/cli"
              className="hover:text-[color:var(--color-red)]"
            >
              {t.nav.source}
            </a>
            <a
              href="#waitlist"
              className="hover:text-[color:var(--color-red)]"
            >
              {t.nav.waitlist}
            </a>
            <a
              href={t.nav.langOtherHref}
              className="border border-[color:var(--color-line)] px-2 py-1 hover:border-[color:var(--color-red)] hover:text-[color:var(--color-red)]"
            >
              {t.nav.langOther}
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b border-[color:var(--color-line)]">
        <SectionTag label="H-01" id="CORE" />
        <Divider />

        <div className="max-w-[1400px] mx-auto px-6 py-20 md:py-28">
          <h1
            className={`${displayClass} text-[clamp(3.5rem,${isZh ? '11vw' : '14vw'},${isZh ? '12rem' : '15rem'})] leading-[0.82] tracking-[-0.05em]`}
          >
            {t.hero.line1}
            <br />
            {t.hero.line2}
            <span className="text-[color:var(--color-red)] align-top text-[0.22em] ml-1">
              ®
            </span>
          </h1>

          {/* CTA command box */}
          <div className="mt-14 border border-[color:var(--color-line)]">
            <div className="flex justify-between items-center px-4 py-2 bg-[color:var(--color-line)]/30 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
              <span>{t.hero.execLabel}</span>
              <span>{t.hero.execVersion}</span>
            </div>
            <div className="px-6 py-6 flex flex-wrap items-center gap-x-3 text-lg md:text-2xl">
              <span className="text-[color:var(--color-green)]">$</span>
              <code className="font-[family-name:var(--font-mono)] tracking-[0.02em]">
                {t.hero.cmd}
              </code>
              <span className="cursor-blink" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-b border-[color:var(--color-line)]">
        <SectionTag label="S-02" id="3 / 3" />
        <Divider />
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 border-t border-[color:var(--color-line)]">
          {t.features.map((f, i) => (
            <div
              key={f.unit}
              className={[
                'p-8 md:p-12 min-h-[260px] flex flex-col justify-between',
                i < 2 ? 'md:border-r border-[color:var(--color-line)]' : '',
                'border-b md:border-b-0 border-[color:var(--color-line)]',
              ].join(' ')}
            >
              <div className="flex justify-between text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)]">
                <span>{f.unit}</span>
                <span>{f.meta}</span>
              </div>
              <h2
                className={`${displayClass} text-[clamp(1.75rem,3vw,2.75rem)] whitespace-pre-line`}
              >
                {f.title}
              </h2>
            </div>
          ))}
        </div>
      </section>

      {/* TERMINAL */}
      <section id="terminal" className="border-b border-[color:var(--color-line)]">
        <SectionTag label="T-03" id="SAMPLE" />
        <Divider />
        <div className="max-w-[1400px] mx-auto px-6 py-16">
          <div className="border border-[color:var(--color-line)] bg-black/40">
            <div className="flex justify-between items-center px-4 py-2 border-b border-[color:var(--color-line)] text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
              <span>{t.terminal.label}</span>
              <span>
                <span className="text-[color:var(--color-red)]">●</span>{' '}
                {t.terminal.rec}
              </span>
            </div>
            <pre className="p-6 md:p-8 text-[12px] md:text-[13px] leading-[1.7] overflow-x-auto font-[family-name:var(--font-mono)]">
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
                          : 'text-[color:var(--color-fg)]/70';
                return (
                  <div key={i} className={color}>
                    {l.text || '\u00a0'}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="border-b border-[color:var(--color-line)]">
        <SectionTag label="D-04" id="REGISTRY" />
        <Divider />
        <div className="max-w-[1400px] mx-auto px-6 py-20 md:py-28 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <h2
              className={`${displayClass} text-[clamp(2.5rem,${isZh ? '6.5vw' : '8vw'},${isZh ? '6rem' : '7rem'})] leading-[0.85]`}
            >
              {t.waitlist.title1}
              <br />
              {t.waitlist.title2}
            </h2>
          </div>
          {/* TODO: replace FORMSPREE_ENDPOINT when Formspree form is created */}
          <form
            className="col-span-12 md:col-span-5 flex flex-col gap-3"
            action="https://formspree.io/f/FORMSPREE_ENDPOINT"
            method="POST"
          >
            <div className="flex border border-[color:var(--color-fg)]">
              <input
                type="email"
                name="email"
                required
                placeholder={t.waitlist.placeholder}
                className="flex-1 bg-transparent px-4 py-3 text-sm uppercase tracking-[0.08em] placeholder:text-[color:var(--color-dim)] focus:outline-none"
              />
              <button
                type="submit"
                className={`${displayClass} px-5 py-3 bg-[color:var(--color-fg)] text-[color:var(--color-bg)] text-sm tracking-[0.05em] hover:bg-[color:var(--color-red)] hover:text-[color:var(--color-fg)] transition-colors`}
              >
                {t.waitlist.submit}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex justify-between items-center text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)]">
          <span>{t.footer.copyright}</span>
          <div className="flex gap-6">
            <a
              href="https://github.com/vibe-hardening/cli"
              className="hover:text-[color:var(--color-red)]"
            >
              {t.footer.github}
            </a>
            <a
              href="https://www.npmjs.com/package/vibe-hardening"
              className="hover:text-[color:var(--color-red)]"
            >
              {t.footer.npm}
            </a>
            <a href="#" className="hover:text-[color:var(--color-red)]">
              {t.footer.twitter}
            </a>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 pb-4">
          <div
            className={`${displayClass} whitespace-nowrap overflow-hidden text-[clamp(3rem,14vw,13rem)] leading-[0.8] tracking-[-0.05em] select-none`}
            style={{ color: 'rgba(234,234,234,0.06)' }}
            aria-hidden
          >
            VIBE-HARDENING
          </div>
        </div>
      </footer>
    </main>
  );
}
