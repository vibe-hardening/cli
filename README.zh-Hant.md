# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> 給 AI 生成程式碼用的一鍵資安掃描 CLI。

**語言**：[English](./README.md) · **繁體中文** · [简体中文](./README.zh-Hans.md) · [한국어](./README.ko.md) · [日本語](./README.ja.md)

```bash
npx vibe-hardening scan
```

網站：[vibe-hardening.io](https://vibe-hardening.io)

## 能抓到什麼

30+ 條規則、8 大類別。針對 **v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** 這些工具生出來的 repo 調校。

| 類別 | 例子 |
|------|------|
| **Secret 洩漏** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWS 金鑰、Supabase `service_role` JWT、DB 連線字串、Slack token、JWT 簽章金鑰 |
| **注入攻擊** | SQL template literal、NoSQL `req.body`、`child_process.exec` 字串拼接、path traversal、`dangerouslySetInnerHTML` 未清洗 |
| **網路層** | CORS `*` + credentials、CORS 反射 origin、SSRF `fetch(req.body.url)`、open redirect |
| **Auth** | Next.js API route 沒 auth（AST 分析）、JWT `alg: none`、`\|\| true` bypass、`// TODO: add auth`、弱 cookie |
| **資料庫** | Supabase table 沒開 RLS、policy 用 `(true)`、`'use client'` 檔案出現 service_role |
| **環境變數誤用** | `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` 會被打包進 client bundle |
| **供應鏈（需網路）** | OSV.dev 依賴 CVE 查詢、LLM 幻覺套件偵測（對比 npm registry） |
| **平台指紋** | 偵測你用哪家 AI 生的 code、調整規則權重 |

## 用法

```bash
# 掃當前目錄
npx vibe-hardening scan

# 掃指定資料夾
npx vibe-hardening scan ./my-project

# CI 用（有 critical/high 就 exit 1）
npx vibe-hardening scan --format json --output report.json

# 只看 high 以上
npx vibe-hardening scan --severity high

# 跳過網路檢查（OSV、npm registry）
npx vibe-hardening scan --offline
```

## 平台指紋偵測

掃描開始時會先認出 repo 是哪家 AI 產的：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

支援：`v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`。

## 現況

預覽版 —— Phase 1 MVP 目標 **2026-05-13** 上 Product Hunt。

目前覆蓋（`v0.0.3-preview.1`）：
- 6 個引擎：RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM 幻覺
- 30+ 條規則、120 個測試、一般 repo 5 秒內掃完
- 輸出格式：彩色終端機、CI 用 JSON
- 8 家 AI 平台指紋偵測

路線圖：
- 即時金鑰驗證（`--verify` 打 provider API 確認洩漏金鑰是否還有效）
- HTML 報告
- 0-100 資安分數 + README badge
- Markdown reporter
- Pro dashboard、GitHub App、Slack 通知（上線後）

## 回報漏洞

請 email `angletech2026@gmail.com`，**不要開 public issue**。詳見 [SECURITY.md](./SECURITY.md)。

## License

MIT © 2026 vibe-hardening contributors.
