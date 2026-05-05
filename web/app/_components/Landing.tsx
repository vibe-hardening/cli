import type { Locale } from '../_lib/strings';
import { strings } from '../_lib/strings';
import { LiveTerminal } from './LiveTerminal';
import { ThemeToggle } from './ThemeToggle';

const TIME_TICKS = ['0000', '0100', '0200', '0300', '0400', '0500'];

export function Landing({ locale }: { locale: Locale }) {
  const t = strings[locale];

  return (
    <main className="relative" lang={locale === 'zh' ? 'zh-Hant' : 'en'}>
      {/* CLASSIFICATION BAR */}
      <div className="vh-classbar">
        <span>{t.classbar.unit}</span>
        <span>{t.classbar.rev}</span>
        <span>{t.classbar.geo}</span>
        <span>{t.classbar.date}</span>
      </div>

      {/* NAV */}
      <nav className="border-b border-[color:var(--color-line)]">
        <div className="wrap flex items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-[17px] tracking-[-0.02em]">
              VIBE-HARDENING
            </span>
            <span className="text-[color:var(--color-red)] text-[9px]">®</span>
          </div>
          <div className="flex items-center gap-5 md:gap-7 text-[12px] text-[color:var(--color-dim)]">
            <a
              href="https://github.com/vibe-hardening/cli"
              className="vh-hot"
            >
              {t.nav.source}
            </a>
            <a href="#" className="vh-hot hidden sm:inline">
              {t.nav.docs}
            </a>
            <a href="#waitlist" className="vh-hot">
              {t.nav.waitlist}
            </a>
            <a
              href={t.nav.langOtherHref}
              className="vh-hot border border-[color:var(--color-line)] px-2 py-1 text-[11px] tracking-[0.1em]"
            >
              {t.nav.langOther}
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="wrap px-6 py-16 md:px-10 md:py-24 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[color:var(--color-red)] mb-5">
              {t.hero.eyebrow}
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(3rem,13vw,13rem)] leading-[0.82] tracking-[-0.05em]">
              {t.hero.line1}
              <br />
              {t.hero.line2}
              <span className="text-[color:var(--color-red)] align-top text-[0.2em] ml-1.5">
                ®
              </span>
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-[14px] leading-[1.7] mt-7 max-w-[44ch] tracking-[0.02em] text-[color:var(--color-fg-soft)]">
              {t.hero.copy}
            </p>

            {/* CTA command box */}
            <div className="mt-8 grid grid-cols-[1fr_auto] border border-[color:var(--color-line)] max-w-[640px]">
              <div className="px-5 py-4 flex items-center gap-2.5 text-[18px]">
                <span className="text-[color:var(--color-green)]">$</span>
                <code className="font-[family-name:var(--font-mono)]">
                  {t.hero.cmd}
                </code>
                <span className="cursor-blink" aria-hidden />
              </div>
              <div className="px-4 py-2.5 border-l border-[color:var(--color-line)] text-[10px] tracking-[0.15em] text-[color:var(--color-dim)] flex flex-col justify-center">
                <div>{t.hero.execLabel}</div>
                <div className="text-[color:var(--color-green)]">
                  {t.hero.execReady}
                </div>
              </div>
            </div>

            <div className="mt-3.5 text-[10px] tracking-[0.2em] text-[color:var(--color-dim)]">
              {t.hero.footnote}
            </div>
          </div>

          {/* HUD PANEL */}
          <div className="flex flex-col gap-3.5">
            <div className="border border-[color:var(--color-line)] p-4 flex gap-5 items-center">
              <div className="vh-radar" aria-hidden />
              <div className="text-[9px] tracking-[0.22em] text-[color:var(--color-dim)] leading-[2]">
                {t.hud.last24h}
                <br />
                <span className="text-[color:var(--color-red)]">
                  {t.hud.newCrit}
                </span>
                <br />
                <span className="text-[color:var(--color-amber)]">
                  {t.hud.newHigh}
                </span>
                <br />
                <span className="text-[color:var(--color-green)]">
                  {t.hud.fixed}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="vh-datum">
                <div className="k">{t.hud.kRepos}</div>
                <div className="v">{t.hud.vRepos}</div>
              </div>
              <div className="vh-datum">
                <div className="k">{t.hud.kKeys}</div>
                <div className="v red">{t.hud.vKeys}</div>
              </div>
              <div className="vh-datum">
                <div className="k">{t.hud.kScan}</div>
                <div className="v">{t.hud.vScan}</div>
              </div>
              <div className="vh-datum">
                <div className="k">{t.hud.kFail}</div>
                <div className="v red">{t.hud.vFail}</div>
              </div>
            </div>
            <div className="border border-[color:var(--color-line)] p-3.5 text-[10px] tracking-[0.15em] text-[color:var(--color-dim)] leading-[1.8]">
              <div>{t.hud.fingerprintTitle}</div>
              <div className="text-[color:var(--color-fg)] mt-1.5 text-[11px]">
                NEXT.JS · SUPABASE · TRPC · PRISMA
                <br />
                DRIZZLE · CONVEX · VERCEL · NETLIFY
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TERMINAL */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="wrap flex justify-between items-center px-6 md:px-10 py-2.5 text-[10px] tracking-[0.18em] text-[color:var(--color-dim)] uppercase border-b border-[color:var(--color-line)]">
          <span className="text-[color:var(--color-fg)]">{t.terminal.liveFeed}</span>
          <span>{t.terminal.demo}</span>
        </div>
        <div className="wrap px-6 md:px-10 py-12 md:py-14 grid grid-cols-1 md:grid-cols-[80px_1fr_160px] gap-4 items-stretch">
          <div className="hidden md:flex flex-col gap-8 border-r border-[color:var(--color-line)] p-3 text-[9px] tracking-[0.2em] text-[color:var(--color-dim)]">
            {TIME_TICKS.map((tick) => (
              <div key={tick}>{tick}</div>
            ))}
          </div>
          <div className="vh-term">
            <div className="vh-term-head">
              <span>{t.terminal.headLabel}</span>
              <span className="flex gap-3.5">
                <span>
                  <span className="rec">●</span> REC
                </span>
                <span className="text-[color:var(--color-green)]">▶ LIVE</span>
              </span>
            </div>
            <LiveTerminal locale={locale} />
          </div>
          <div className="border-l border-[color:var(--color-line)] p-4 flex flex-col gap-3.5 text-[10px] tracking-[0.18em] text-[color:var(--color-dim)]">
            <div>{t.terminal.verdictLabel}</div>
            <div className="font-[family-name:var(--font-display)] text-[3rem] text-[color:var(--color-red)] tracking-[-0.04em] leading-none">
              F
            </div>
            <div className="border-t border-[color:var(--color-line)] pt-2.5">
              42 / 100
            </div>
            <div>4 CRIT · 3 HIGH</div>
            <div>
              {t.terminal.shipQ}{' '}
              <span className="text-[color:var(--color-red)]">
                {t.terminal.shipA}
              </span>
            </div>
            <div className="border-t border-[color:var(--color-line)] pt-2.5 text-[color:var(--color-fg)] text-[11px] leading-[1.6] tracking-normal">
              {t.terminal.tagTop}
              <br />
              <span className="text-[color:var(--color-dim)] text-[10px]">
                {t.terminal.tagBottom}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* COMMANDS */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="wrap px-6 md:px-10 py-20 md:py-24">
          <div className="text-[13px] text-[color:var(--color-dim)] mb-14 tracking-[0.04em]">
            {t.commands.label1}{' '}
            <span className="text-[color:var(--color-fg)]">
              {t.commands.label2}
            </span>
          </div>
          {t.commands.items.map((c) => (
            <div key={c.cmd} className="vh-feat">
              <code className="font-[family-name:var(--font-mono)] text-[color:var(--color-green)] text-[15px] leading-[1.4] tracking-normal break-all">
                {c.cmd}
              </code>
              <p className="font-[family-name:var(--font-mono)] text-[14px] leading-[1.75] tracking-[0.02em] text-[color:var(--color-fg-soft)]">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="wrap px-6 md:px-10 py-20 md:py-24">
          <div className="text-[13px] text-[color:var(--color-dim)] mb-14 tracking-[0.04em]">
            {t.features.label1}{' '}
            <span className="text-[color:var(--color-fg)]">
              {t.features.label2}
            </span>
          </div>
          {t.features.items.map((f) => (
            <div key={f.code} className="vh-feat">
              <div>
                <div className="n mb-2.5">{f.code}</div>
                <h3 className="text-[clamp(1.5rem,2.4vw,2.1rem)] normal-case">
                  {f.title}
                </h3>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-[14px] leading-[1.75] tracking-[0.02em] text-[color:var(--color-fg-soft)]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="wrap px-6 md:px-10 py-20 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="border border-[color:var(--color-line)] p-8">
            <div className="text-[11px] text-[color:var(--color-dim)] tracking-[0.14em] mb-3">
              {t.pricing.freeTag}
            </div>
            <h3 className="text-[2rem] normal-case mb-2.5">
              {t.pricing.freeTitle}
            </h3>
            <p className="text-[13px] text-[color:var(--color-fg-soft)] leading-[1.7] mb-6 tracking-normal">
              {t.pricing.freeBody}
            </p>
            <code className="inline-block bg-[#141414] border border-[color:var(--color-line)] px-4 py-3 text-[13px] text-[color:var(--color-fg)] font-[family-name:var(--font-mono)]">
              npx vibe-hardening scan
            </code>
          </div>
          <div className="border border-[color:var(--color-fg)] p-8">
            <div className="text-[11px] text-[color:var(--color-red)] tracking-[0.14em] mb-3">
              {t.pricing.proTag}
            </div>
            <h3 className="text-[2rem] normal-case mb-2.5">
              {t.pricing.proTitle}
            </h3>
            <p className="text-[13px] text-[color:var(--color-fg-soft)] leading-[1.7] mb-6 tracking-normal">
              {t.pricing.proBody}
            </p>
            <a
              href="#waitlist"
              className="vh-btn vh-btn-primary tracking-[0.06em]"
            >
              {t.pricing.proCta}
            </a>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section
        id="waitlist"
        className="border-b border-[color:var(--color-line)]"
      >
        <div className="wrap px-6 md:px-10 py-24 md:py-28 max-w-[820px]">
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,5rem)] tracking-[-0.05em] leading-[0.88]">
            {t.waitlist.title1}
            <br />
            {t.waitlist.title2}
          </h2>
          <p className="text-[15px] text-[color:var(--color-dim)] mt-6 leading-[1.6] tracking-normal">
            {t.waitlist.subtitleA}
            <span className="text-[color:var(--color-fg)]">
              {t.waitlist.subtitleHighlight}
            </span>
            {t.waitlist.subtitleB}
          </p>
          <form
            action="https://formspree.io/f/mojywydj"
            method="POST"
            className="mt-9 flex flex-col gap-3"
          >
            {/* Honeypot: real users never see or fill this; bots
                submitting the form by replaying the POST will populate
                it, and Formspree drops any submission where `_gotcha`
                is non-empty. */}
            <input
              type="text"
              name="_gotcha"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                name="email"
                required
                placeholder={t.waitlist.placeholder}
                className="flex-1 min-w-[280px] bg-transparent border border-[color:var(--color-line)] px-4 py-3.5 text-[14px] tracking-[0.04em] placeholder:text-[color:var(--color-dim)] focus:outline-none focus:border-[color:var(--color-fg)] transition-colors"
              />
              <button
                type="submit"
                className="vh-btn vh-btn-primary tracking-[0.06em] w-full sm:w-auto justify-center"
              >
                {t.waitlist.submit}
              </button>
            </div>
            <textarea
              name="message"
              rows={3}
              placeholder={t.waitlist.thoughtsPlaceholder}
              maxLength={2000}
              className="bg-transparent border border-[color:var(--color-line)] px-4 py-3.5 text-[14px] leading-[1.6] tracking-[0.02em] placeholder:text-[color:var(--color-dim)] focus:outline-none focus:border-[color:var(--color-fg)] transition-colors resize-y font-[family-name:var(--font-mono)]"
            />
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap px-6 md:px-10 pt-12 pb-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px] tracking-[0.12em] uppercase text-[color:var(--color-dim)]">
          <div>
            <div className="font-[family-name:var(--font-display)] text-[color:var(--color-fg)] text-[14px] tracking-[-0.02em] mb-3">
              VIBE-HARDENING
              <span className="text-[color:var(--color-red)] ml-1">®</span>
            </div>
            {t.footer.brandCopy}
          </div>
          <div>
            <div className="text-[color:var(--color-fg)] mb-2.5">
              {t.footer.colProductTitle}
            </div>
            {t.footer.colProductItems.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
          <div>
            <div className="text-[color:var(--color-fg)] mb-2.5">
              {t.footer.colSourceTitle}
            </div>
            {t.footer.colSourceItems.map((item) => (
              <div key={item.label}>
                <a href={item.href} className="vh-hot">
                  {item.label}
                </a>
              </div>
            ))}
          </div>
          <div className="text-right">
            <div className="text-[color:var(--color-fg)] mb-2.5">
              {t.footer.colStatusTitle}
            </div>
            {t.footer.colStatusItems.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </div>
        <div className="wrap px-6 md:px-10 pb-4 pt-2 text-[10px] tracking-[0.15em] text-[color:var(--color-dim)] uppercase">
          {t.footer.ruleDomains}
        </div>
        <div className="wrap px-6 md:px-10 pb-10">
          <div
            className="border-t border-[color:var(--color-line)] pt-10 font-[family-name:var(--font-serif)] italic leading-[1.05] tracking-[-0.01em] select-none"
            style={{
              fontSize: 'clamp(2.2rem, 6vw, 5rem)',
              color: 'var(--color-fg-soft)',
            }}
          >
            {t.footer.tagline}
          </div>
        </div>
      </footer>
    </main>
  );
}
