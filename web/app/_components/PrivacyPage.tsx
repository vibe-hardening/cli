import type { Locale } from '../_lib/strings';
import { strings } from '../_lib/strings';
import { ThemeToggle } from './ThemeToggle';

const COPY = {
  en: {
    title: 'Privacy',
    subtitle: 'What we collect, what we don\'t, how to turn it off.',
    lastUpdated: 'Last updated 2026-05-03',
    sections: [
      {
        h: 'TL;DR',
        body: [
          'vibe-hardening runs on your machine. Your code, your secrets, your file paths, your repository names — none of those ever leave your laptop.',
          'If — and only if — you say yes to the first-run prompt, the CLI sends a small anonymous event after each scan: which rule IDs fired, how long the scan took, the AI platform fingerprint it detected, your CLI version, and a randomly-generated UUID. That\'s it.',
          'You can turn it off any time. Setting `DO_NOT_TRACK=1`, `CI=1`, or running inside any CI environment also disables it automatically.',
        ],
      },
      {
        h: 'What the CLI sends if you opt in',
        body: [
          'Every scan ships exactly these fields and nothing else:',
        ],
        list: [
          '`anonymous_id` — a random UUID v4 generated on first run. Stored locally; lets us de-duplicate the same machine without identifying you.',
          '`consent_version` — schema version of the consent you gave. Currently `1`. If we ever widen what we collect, we bump this and re-prompt.',
          '`vh_version` — your CLI version (e.g. `0.3.0`).',
          '`platform_fingerprint` — the AI tool we detected, e.g. `cursor`, `lovable`, `claude-code`. Public labels only — we never send the file paths the detector matched against.',
          '`files_scanned` — integer count of files the scanner looked at.',
          '`duration_ms` — how long the scan took, in milliseconds.',
          '`score` / `grade` — the 0–100 score and A–F letter the report computed.',
          '`rules_fired` — a map of `ruleId → trigger count`, e.g. `{"vh-secret-openai": 2}`. Rule IDs are public identifiers from our open-source rules — they reveal nothing about your code beyond which rules matched.',
          '`os` — `darwin` / `linux` / `win32`.',
          '`node_version` — your Node version (e.g. `v20.10.0`).',
        ],
      },
      {
        h: 'What we never send',
        body: [
          'The wire payload is a fixed schema. The CLI does not have code paths that send any of the following — and a regression test in the public repo asserts none of these strings can ever reach the wire:',
        ],
        list: [
          'Source code, snippets, or any string from your files.',
          'Secrets, API keys, tokens, or anything detected by the secret-scanner.',
          'File names, file paths, or directory names.',
          'Repository names, git remote URLs, branch names.',
          'Commit messages, author names, git config.',
          'Your IP address (we use Cloudflare which does see the IP at the network layer, but we do not store, log, or correlate it with the event).',
          'Email, name, GitHub username, or any account identifier.',
          'Any environment variable beyond the opt-out controls listed below.',
        ],
      },
      {
        h: 'How to turn it off',
        body: [
          'Three ways, ranked by reach:',
        ],
        list: [
          '`vibe-hardening config set telemetry off` — persists across runs.',
          '`VH_TELEMETRY=off` env var — one-shot override; useful for `VH_TELEMETRY=off npx vibe-hardening scan`.',
          '`DO_NOT_TRACK=1` or `CI=1` — universal opt-outs respected by many tools (yarn, pnpm, Gatsby). vibe-hardening honours either, even if your local config says telemetry is on.',
        ],
      },
      {
        h: 'How it\'s stored',
        body: [
          'Events are POSTed to a Cloudflare Worker which writes them to a managed database (Supabase or D1). We\'re a one-person indie team — no Mixpanel, no Segment, no Amplitude, no Google Analytics, no marketing pixels.',
          'We don\'t sell, share, or licence the data. The only people who look at it are us, when we\'re deciding which rules need work.',
          'Retention: 12 months. Aggregate rule-fire counts may be kept longer for trend analysis, but rows that contain `anonymous_id` are dropped after 12 months.',
        ],
      },
      {
        h: 'Why we do this',
        body: [
          'vibe-hardening is a free MIT CLI shipped via npm. We don\'t see who installs it. We don\'t see customer support tickets. We don\'t do sales calls.',
          'Without a small amount of telemetry, the first 1,500 installs after launch are a black box. We can\'t tell which rules fire most (so we should deepen them) versus which ones never fire (so we should rebuild or remove them). We can\'t tell which AI platform users care about most. We can\'t tell whether scans take 3 seconds or 30.',
          'Telemetry is the difference between "shipped a thing, hope it works" and "shipped a thing, learned what to fix in week two."',
        ],
      },
      {
        h: 'Source-code receipts',
        body: [
          'Every claim above maps to code you can read:',
        ],
        list: [
          'Whitelist of fields: `src/core/telemetry.ts` → `buildEvent` (around line 290).',
          'PII guard test: `test/telemetry.test.ts` → "NEVER includes PII" (asserts no file paths, snippets, secrets, or platform-detector signal sources reach the wire).',
          'Opt-out env var enforcement: `src/core/telemetry.ts` → `isUniversallyOptedOut`.',
          'SSRF protection on self-hosted endpoint override: `src/core/telemetry.ts` → `getEndpoint`.',
        ],
      },
      {
        h: 'Questions',
        body: [
          'GitHub issue at the repo, or open the CLI source and read it. The whole telemetry surface is ~350 lines of TypeScript with comments.',
        ],
      },
    ],
  },
  zh: {
    title: '隱私政策',
    subtitle: '我們收什麼、不收什麼、怎麼關掉。',
    lastUpdated: '最後更新 2026-05-03',
    sections: [
      {
        h: '一句話',
        body: [
          'vibe-hardening 在你的機器上跑。你的程式碼、密鑰、檔案路徑、repo 名稱 — 通通不會離開你的筆電。',
          '只有在你對首次執行的 prompt 明確說 yes 之後，CLI 才會在每次 scan 結束時送一個小小的匿名事件：哪些 rule ID 觸發了、scan 跑多久、偵測到的 AI 平台指紋、CLI 版本、一個隨機產生的 UUID。就這些。',
          '隨時可以關。設 `DO_NOT_TRACK=1`、`CI=1`，或在任何 CI 環境執行，都會自動停用。',
        ],
      },
      {
        h: '同意 opt-in 後 CLI 會送什麼',
        body: ['每次 scan 就傳這幾個欄位、不會多：'],
        list: [
          '`anonymous_id` — 第一次執行時隨機產生的 UUID v4。存在你本機；讓我們可以去重複而不識別你。',
          '`consent_version` — 你同意的 schema 版本，目前是 `1`。未來如果擴大收集範圍會 bump 這個版本、重新詢問你。',
          '`vh_version` — 你的 CLI 版本（例如 `0.3.0`）。',
          '`platform_fingerprint` — 偵測到的 AI 工具，例如 `cursor`、`lovable`、`claude-code`。只送公開標籤、絕不送偵測時匹配到的檔案路徑。',
          '`files_scanned` — 掃描器看過的檔案數量（整數）。',
          '`duration_ms` — scan 跑多久，毫秒。',
          '`score` / `grade` — 0–100 分數跟 A–F 等級。',
          '`rules_fired` — `ruleId → 觸發次數` 的 map，例如 `{"vh-secret-openai": 2}`。Rule ID 都是 open source 規則的公開識別碼，除了「哪些規則匹配」之外不會洩漏任何程式碼資訊。',
          '`os` — `darwin` / `linux` / `win32`。',
          '`node_version` — 你的 Node 版本（例如 `v20.10.0`）。',
        ],
      },
      {
        h: '我們絕對不送什麼',
        body: [
          '送出的 payload 是固定 schema。CLI 沒有任何 code path 會送以下任何一樣 — 而且 public repo 裡有一條 regression test 鎖死，這些字串無論如何都不會出現在 wire payload：',
        ],
        list: [
          '原始程式碼、snippet、檔案內容裡的任何字串。',
          '密鑰、API key、token、secret-scanner 找到的任何敏感資訊。',
          '檔案名稱、路徑、目錄名稱。',
          'Repo 名稱、git remote URL、branch 名稱。',
          'Commit message、作者名、git config。',
          '你的 IP 位址（Cloudflare 在網路層會看到 IP，但我們不存、不 log、不跟事件做關聯）。',
          'Email、姓名、GitHub username 或任何帳號識別碼。',
          '除了下面列出的 opt-out 變數以外的任何環境變數。',
        ],
      },
      {
        h: '怎麼關掉',
        body: ['三種，由廣到窄：'],
        list: [
          '`vibe-hardening config set telemetry off` — 持久關閉、跨次執行有效。',
          '`VH_TELEMETRY=off` env 變數 — 單次覆寫；適合 `VH_TELEMETRY=off npx vibe-hardening scan`。',
          '`DO_NOT_TRACK=1` 或 `CI=1` — 通用 opt-out（yarn、pnpm、Gatsby 都認）。即使你 local config 寫 telemetry on，這兩個變數也會強制關閉。',
        ],
      },
      {
        h: '存在哪',
        body: [
          '事件 POST 到一個 Cloudflare Worker、寫進我們管理的資料庫（Supabase 或 D1）。我們是一人 indie 團隊 — 沒接 Mixpanel、Segment、Amplitude、Google Analytics、行銷追蹤像素，通通沒有。',
          '我們不賣、不分享、不授權這份資料。只有我們會看，而且只在決定哪條規則需要強化時才會看。',
          '保存期間：12 個月。彙總的規則觸發數可能保留更久做趨勢分析，但任何含 `anonymous_id` 的列 12 個月後會刪除。',
        ],
      },
      {
        h: '為什麼要做這個',
        body: [
          'vibe-hardening 是 MIT、免費、用 npm 發佈的 CLI。我們看不到誰裝了、看不到客服 ticket、不打 sales call。',
          '沒有一點 telemetry，launch 後前 1,500 個安裝就是黑箱。我們無法知道哪些規則觸發最多（要深化）、哪些 0× 觸發（要重做或移除）、用戶最在意哪個 AI 平台、scan 是 3 秒還是 30 秒。',
          'Telemetry 就是「ship 出去、希望有人用」跟「ship 出去、第二週看數字決定怎麼改」的差別。',
        ],
      },
      {
        h: '原始碼可驗',
        body: ['上面每一條主張都對應到 public 程式碼：'],
        list: [
          '送出欄位白名單：`src/core/telemetry.ts` → `buildEvent`（約 290 行）。',
          'PII 防護測試：`test/telemetry.test.ts` → "NEVER includes PII"（鎖死沒有檔案路徑、snippet、密鑰、平台偵測 signal 路徑會出現在 wire）。',
          'Opt-out env 變數強制：`src/core/telemetry.ts` → `isUniversallyOptedOut`。',
          '自架 endpoint SSRF 防護：`src/core/telemetry.ts` → `getEndpoint`。',
        ],
      },
      {
        h: '有問題',
        body: [
          'GitHub repo 開 issue，或直接打開 CLI 原始碼自己讀 — 整個 telemetry 表面才 ~350 行 TypeScript、有完整註解。',
        ],
      },
    ],
  },
} as const;

export function PrivacyPage({ locale }: { locale: Locale }) {
  const t = strings[locale];
  const c = COPY[locale];
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
          <a
            href={locale === 'zh' ? '/zh' : '/'}
            className="flex items-baseline gap-2 vh-hot"
          >
            <span className="font-[family-name:var(--font-display)] text-[17px] tracking-[-0.02em]">
              VIBE-HARDENING
            </span>
            <span className="text-[color:var(--color-red)] text-[9px]">®</span>
          </a>
          <div className="flex items-center gap-5 md:gap-7 text-[12px] text-[color:var(--color-dim)]">
            <a
              href="https://github.com/vibe-hardening/cli"
              className="vh-hot"
            >
              {t.nav.source}
            </a>
            <a
              href={locale === 'zh' ? '/privacy' : '/zh/privacy'}
              className="vh-hot border border-[color:var(--color-line)] px-2 py-1 text-[11px] tracking-[0.1em]"
            >
              {locale === 'zh' ? 'EN' : '中文'}
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <section className="border-b border-[color:var(--color-line)]">
        <div className="wrap px-6 py-16 md:px-10 md:py-24 max-w-[820px]">
          <div className="text-[10px] tracking-[0.25em] text-[color:var(--color-red)] mb-5">
            ▲ POLICY · {c.lastUpdated.toUpperCase()}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(3rem,8vw,5.5rem)] leading-[0.85] tracking-[-0.04em]">
            {c.title}
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[14px] leading-[1.7] mt-6 max-w-[60ch] tracking-[0.02em] text-[color:var(--color-fg-soft)]">
            {c.subtitle}
          </p>

          <div className="mt-12 space-y-12">
            {c.sections.map((s, i) => (
              <article key={i} className="space-y-4">
                <h2 className="font-[family-name:var(--font-display)] text-[20px] tracking-[-0.02em] text-[color:var(--color-red)]">
                  {String(i + 1).padStart(2, '0')} · {s.h}
                </h2>
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="font-[family-name:var(--font-mono)] text-[13.5px] leading-[1.75] tracking-[0.01em] text-[color:var(--color-fg-soft)] max-w-[68ch]"
                  >
                    {renderInlineCode(p)}
                  </p>
                ))}
                {'list' in s && s.list && (
                  <ul className="space-y-2 max-w-[68ch] mt-3 ml-4 list-disc text-[color:var(--color-fg-soft)]">
                    {s.list.map((li, k) => (
                      <li
                        key={k}
                        className="font-[family-name:var(--font-mono)] text-[13.5px] leading-[1.7] tracking-[0.01em]"
                      >
                        {renderInlineCode(li)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[color:var(--color-line)] py-8">
        <div className="wrap px-6 md:px-10 flex flex-wrap justify-between gap-4 text-[11px] text-[color:var(--color-dim)]">
          <span>{t.footer.brandCopy}</span>
          <a href={locale === 'zh' ? '/zh' : '/'} className="vh-hot">
            {locale === 'zh' ? '← 回首頁' : '← Back to home'}
          </a>
        </div>
      </footer>
    </main>
  );
}

/**
 * Inline-code renderer — turns `\`code\`` segments into `<code>` JSX
 * elements. Returns a ReactNode array so it can be rendered as
 * children of a `<p>` / `<li>`. Avoiding `dangerouslySetInnerHTML`
 * here is deliberate: vibe-hardening's whole pitch is "don't ship
 * dangerous APIs in AI-generated code" — the Privacy page can't be
 * the place we eat it ourselves. React handles all escaping when the
 * content is rendered as children.
 */
function renderInlineCode(s: string): React.ReactNode {
  // String.split with a capture group keeps the matched delimiters in
  // the output array. Even indices = plain text, odd = code-fenced.
  const parts = s.split(/`([^`]+)`/g);
  return parts.map((part, i) =>
    i % 2 === 0 ? (
      part
    ) : (
      <code
        key={i}
        className="font-[family-name:var(--font-mono)] text-[color:var(--color-fg)] bg-[color:var(--color-line)] px-1.5 py-0.5 text-[12px]"
      >
        {part}
      </code>
    ),
  );
}
