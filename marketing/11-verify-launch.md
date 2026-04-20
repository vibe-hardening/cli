# 11 · Launch posts — simple version (2026-04-20)

專屬給 vibe coder 的一鍵資安掃描。重點：一句話講是誰用的、一個命令、
說出掃了什麼。

**Links**
- Landing: https://vibe-hardening.io
- Repo:    https://github.com/vibe-hardening/cli
- npm:     `npx vibe-hardening scan`

**Visual**
30-second terminal GIF of `npx vibe-hardening scan` against a
repo with mixed findings (leaked key, RLS disabled, unauth'd API route).

---

## Twitter / X

### EN
```
One-command security scan for vibe coders.

  npx vibe-hardening scan

Catches in one pass:
· leaked API keys (5 providers, live-check)
· Supabase RLS disabled
· unauth'd Next.js API routes
· SQL / command injection
· vulnerable deps
· hallucinated npm packages

→ vibe-hardening.io
```

### ZH-TW
```
給 vibe coder 的一鍵資安掃描。

  npx vibe-hardening scan

一次掃出:
· 外洩 API key（5 家 provider，可即時驗證）
· Supabase RLS 沒開
· API route 沒檢查登入
· SQL / command injection
· 套件已知漏洞
· AI 幻覺出來的假 npm 套件

→ vibe-hardening.io
```

---

## Threads

### EN
```
Built a one-command security scanner specifically for vibe coders.

  npx vibe-hardening scan

If your code was written by Cursor / v0 / Lovable / Bolt / Claude Code — run this before shipping.

One pass catches:

· Leaked API keys — OpenAI, Anthropic, Stripe, GitHub, Slack. Add --verify --own to live-check each one.
· Supabase tables with RLS disabled
· Next.js API routes missing auth guards
· SQL / command injection patterns
· Dependencies with known CVEs (OSV database)
· Hallucinated npm packages (AI's favourite mistake)
· NEXT_PUBLIC_ leaking server secrets to the browser

3 seconds. No install. Offline-capable.

→ vibe-hardening.io
```

### ZH-TW
```
做了一個專門給 vibe coder 的一鍵資安掃描。

  npx vibe-hardening scan

如果你的 code 是 Cursor / v0 / Lovable / Bolt / Claude Code 寫的 — 上線前跑這個。

一次掃出:

· 外洩 API key（OpenAI / Anthropic / Stripe / GitHub / Slack），加 --verify --own 可以即時驗證哪把還能用
· Supabase table 關掉 RLS
· Next.js API route 沒檢查登入
· SQL / command injection
· 套件有已知 CVE（OSV 資料庫）
· AI 幻覺出來的假 npm 套件
· NEXT_PUBLIC_ 不小心把 server secret 帶進瀏覽器

3 秒跑完，不用裝，支援離線。

→ vibe-hardening.io
```

---

## Facebook

### EN
```
Shipped vibe-hardening — a one-command security scanner made specifically for code you (or your AI) just vibed into existence.

  npx vibe-hardening scan

No install. Nothing to configure. Runs in 3 seconds.

Here's what it catches in one pass:

· Leaked API keys — OpenAI, Anthropic, Stripe, GitHub, Slack. Add --verify --own and it live-checks each one so you know which leaked keys are still working.
· Supabase tables with RLS disabled (the #1 Lovable / Bolt bug)
· Next.js API routes missing auth checks
· SQL / command injection patterns (JS + Python)
· Dependencies with known CVEs (OSV advisory database)
· Hallucinated npm packages — the AI-invented ones that don't exist (supply chain risk)
· NEXT_PUBLIC_ env vars that accidentally expose server secrets to the browser

Built for the "I vibe-coded a Lovable app in a weekend and now it's in production" crowd.

Product Hunt launch in ~3 weeks. Try it against your current project:

  npx vibe-hardening scan

→ vibe-hardening.io
→ github.com/vibe-hardening/cli
```

### ZH-TW
```
做了一個專門給 vibe coder 的一鍵資安掃描工具 — vibe-hardening。

  npx vibe-hardening scan

不用裝、不用設定，3 秒跑完。

一次掃這些:

· 外洩的 API key — OpenAI、Anthropic、Stripe、GitHub、Slack。加上 --verify --own，它還會去 provider API 即時驗證哪些 key 還能用。
· Supabase table 關掉 RLS（Lovable / Bolt 最常出包的地方）
· Next.js API route 沒加登入檢查
· SQL / command injection pattern（JS + Python 都掃）
· 用到已知漏洞的套件（查 OSV advisory database）
· AI 幻覺出來的假 npm 套件（供應鏈攻擊破口）
· NEXT_PUBLIC_ 不小心把 server secret 帶進瀏覽器

給所有「週末 vibe code 出一個 Lovable app 然後直接上 production」的朋友。

大約 3 週後會上 Product Hunt。先拿你手邊的專案試一下:

  npx vibe-hardening scan

→ vibe-hardening.io
→ github.com/vibe-hardening/cli
```

---

## 發文時機

| 平台 | 推薦時段（台北時間） | 理由 |
|------|------|------|
| Twitter / X | 22:00–01:00 | 歐美白天 |
| Threads | 12:00 / 20:00 | 中文圈午晚餐 |
| Facebook | 20:00–22:00 | 台灣滑 FB 高峰 |

## Hashtag

- **X**: `#vibecoding #indiehackers #buildinpublic #AIcoding`
- **Threads**: `#工程師日常 #AI寫程式 #資安`
- **Facebook**: 不加 hashtag，改用 tag 朋友 / 社團分享
