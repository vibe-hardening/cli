# Landing.tsx — 9 件事修單

針對你上傳的 Landing.tsx 逐行改動建議。全部對著原檔行號 / class name。

---

## 01 · HERO 尺度跳太大（HIGH）

**改動點**：加一個中階尺度，塞給 Waitlist 和 Feature titles 降一級。

```diff
// Landing.tsx:108
- className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,14vw,15rem)] leading-[0.82] tracking-[-0.05em]"
+ className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,14vw,13rem)] leading-[0.82] tracking-[-0.05em]"

// Landing.tsx:144  (feature title — 降一級)
- className={`${displayClass} text-[clamp(1.75rem,3vw,2.75rem)] whitespace-pre-line`}
+ className={`${displayClass} text-[clamp(1.5rem,2.4vw,2.25rem)] whitespace-pre-line`}

// Landing.tsx:199  (waitlist title — 套用新的中階)
- className={`${displayClass} text-[clamp(2.5rem,${isZh ? '6.5vw' : '8vw'},${isZh ? '6rem' : '7rem'})] leading-[0.85]`}
+ className={`${displayClass} text-[clamp(2.25rem,${isZh ? '5.5vw' : '6vw'},${isZh ? '5rem' : '5.5rem'})] leading-[0.88]`}
```

## 02 · FEATURES 太空（HIGH）

**改動點**：加一行技術 copy，cell min-h 降到 180。

```diff
// strings.ts — 在每個 feature 加 body
  features: [
-   { unit: '001', title: 'AI-AWARE\nRULES', meta: 'DB-01' },
+   { unit: '001', title: 'AI-AWARE\nRULES', meta: 'SEC-01',
+     body: 'Trained on v0 / Lovable / Bolt / Cursor outputs.' },
...
  ],

// Landing.tsx:138
- 'p-8 md:p-12 min-h-[260px] flex flex-col justify-between',
+ 'p-8 md:p-10 min-h-[180px] flex flex-col justify-between gap-6',

// Landing.tsx:148 之後加
+ <p className="font-[family-name:var(--font-mono)] text-[12px] leading-[1.6] text-[color:var(--color-fg)]/70 max-w-[38ch]">
+   {f.body}
+ </p>
```

## 03 · 紅色太氾濫（HIGH）

**改動點**：hover 改成 fg（不是 red），nav 和 footer 連結全砍紅 hover，保留 CTA hover red。

```diff
// Landing.tsx:76, 82  (nav links)
- className="hover:text-[color:var(--color-red)]"
+ className="hover:text-[color:var(--color-fg)] text-[color:var(--color-dim)] transition-colors"

// Landing.tsx:88  (lang switcher)
- className="border border-[color:var(--color-line)] px-2 py-1 hover:border-[color:var(--color-red)] hover:text-[color:var(--color-red)]"
+ className="border border-[color:var(--color-line)] px-2 py-1 hover:border-[color:var(--color-fg)] transition-colors"

// Landing.tsx:241, 246, 251  (footer links — 全部改 fg hover)
- className="hover:text-[color:var(--color-red)]"
+ className="hover:text-[color:var(--color-fg)] transition-colors"

// Landing.tsx:63  (nav brand ® — 拔掉，hero 留一個就好)
- <span className="text-[color:var(--color-red)] text-xs">®</span>
+ {/* ® reserved for hero tagline only */}
```

## 04 · Telemetry codes 不成系統（MED）

**改動點**：把 DB-01 / FN-09 / VR-04 換成 `SEC-01 / AUT-02 / KEY-03`，並在 footer 加 schema 說明。

```diff
// strings.ts — features meta
- { unit: '001', title: '...', meta: 'DB-01' },
- { unit: '002', title: '...', meta: 'FN-09' },
- { unit: '003', title: '...', meta: 'VR-04' },
+ { unit: '001', title: '...', meta: 'SEC-01' },
+ { unit: '002', title: '...', meta: 'AUT-02' },
+ { unit: '003', title: '...', meta: 'KEY-03' },

// Landing.tsx footer — 新增 schema legend
+ <div className="max-w-[1400px] mx-auto px-6 pt-2 pb-4 text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-dim)]">
+   RULE DOMAINS · SEC secrets · AUT auth · KEY liveness · NET network · SQL injection · DEP deps · LLM prompts · INF infra
+ </div>
```

## 05 · Terminal 太靜態（HIGH）

**改動點**：用 `useEffect` 逐行 reveal，每 6 秒 loop；最後一行 SCORE 改為反白。

參考 `variant-f.jsx` 的 `LiveTerminalF` — 直接把那 component 拿去 Landing.tsx 用。關鍵：

```tsx
const [n, setN] = React.useState(0);
useEffect(() => {
  let i = 0;
  const tick = () => {
    if (i < TERMINAL_LINES.length) { setN(i + 1); i += 1; setTimeout(tick, 180); }
    else setTimeout(() => { i = 0; setN(0); tick(); }, 4200);
  };
  setTimeout(tick, 400);
}, []);
```

SCORE 行反白：
```diff
- { type: 'crit', text: 'SCORE       42 / 100   F' },
+ { type: 'score-inverse', text: 'SCORE       42 / 100   F' },

// render
+ case 'score-inverse':
+   return <div className="bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-2 font-bold">
+     {l.text}
+   </div>
```

## 06 · Waitlist 手機壞（MED）

```diff
// Landing.tsx:194
- <section id="waitlist" className="border-b border-[color:var(--color-line)]">
+ <section id="waitlist" className="border-b border-[color:var(--color-line)]">

// Landing.tsx:201  (降 mobile 下限)
- className={`${displayClass} text-[clamp(2.5rem,...)]`}
+ className={`${displayClass} text-[clamp(2rem,...)]`}

// Landing.tsx:215  (form 改成欄位 + 按鈕在手機分兩行)
- <div className="flex border border-[color:var(--color-fg)]">
+ <div className="flex flex-col sm:flex-row border border-[color:var(--color-fg)]">

// Landing.tsx:225  (手機按鈕全寬)
- className={`${displayClass} px-5 py-3 ...`}
+ className={`${displayClass} px-5 py-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-[color:var(--color-fg)] ...`}
```

## 07 · /zh 細節（MED）

**改動點**：CJK 模式拔掉負 tracking 和 uppercase tracking。

```diff
// globals.css — 加 zh 專屬
+ :lang(zh) h1, :lang(zh) h2, :lang(zh) h3 {
+   letter-spacing: 0em;
+ }
+ :lang(zh) .mono-meta {
+   letter-spacing: 0.04em;  /* 不要 0.15em 把中文拉開 */
+ }

// Landing.tsx — 在 <main> 加 lang
- <main className="relative">
+ <main className="relative" lang={locale}>
```

## 08 · Playful vs. Military — commit to the bit（MED）

**改動點**：hero 下方加一行 deadpan footnote。

```diff
// Landing.tsx:117  (CTA 區塊之後)
+ <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-dim)]">
+   APPROVED FOR CIVILIAN USE · NOT RATED FOR PRODUCTION
+ </div>
```

## 09 · Footer watermark（LOW）

**改動點**：換成完整 tagline serif 體。

```diff
// Landing.tsx:253
- <div
-   className={`${displayClass} whitespace-nowrap overflow-hidden text-[clamp(3rem,14vw,13rem)] leading-[0.8] tracking-[-0.05em] select-none`}
-   style={{ color: 'rgba(234,234,234,0.06)' }}
-   aria-hidden
- >
-   VIBE-HARDENING
- </div>
+ <div
+   className="font-serif italic text-[clamp(2rem,6vw,5rem)] leading-[1.1] tracking-[-0.01em] select-none"
+   style={{ color: 'rgba(234,234,234,0.78)' }}
+ >
+   "Vibe coded. Vibe hardened."
+ </div>
```

其中 `font-serif` 記得在 `globals.css` 的 `@theme` 塊加：
```css
--font-serif: 'EB Garamond', Georgia, serif;
```

---

## 順序建議

先修 **03 · 紅色氾濫** 和 **05 · Terminal 動畫** — 這兩個最改變第一眼印象。接著 **02 · Features 加 body** 和 **01 · 尺度**。其餘修完可選。
