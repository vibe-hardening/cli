# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> 給 AI 生成程式碼用的一鍵資安掃描 CLI。

**語言**：[English](./README.md) · **繁體中文** · [简体中文](./README.zh-Hans.md) · [한국어](./README.ko.md) · [日本語](./README.ja.md)

```bash
npx vibe-hardening scan
```

網站：[vibe-hardening.io](https://vibe-hardening.io)

## 快速上手（5 秒）

```bash
# 1. 打開 terminal
# 2. cd 到任何一個你用 AI 寫過的 JS / TS 專案
cd ~/projects/my-app

# 3. 跑掃描
npx vibe-hardening scan
```

第一次 npx 會問 `Ok to proceed?`，按 `Enter` 即可。

**需求**：Node.js 18.17+（你有用過 `npm` / `next` / `vite` 就代表已裝）。

**常見卡點**：
- 在 `Desktop/` 直接跑 → 會掃整個桌面一團亂。先 `cd` 進去具體專案。
- 跑在 `vibe-hardening` repo 自己裡面 → 你會掃到工具本體，不是你的 app。
- 沒裝 Node：到 [nodejs.org](https://nodejs.org) 下載。出現 `'npx' 無法辨識` 就是這個原因。

## 能抓到什麼

**支援語言**：JavaScript / TypeScript / **Python**（Django / Flask / FastAPI）。

47 條規則、9 大類別。針對 **v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** 這些工具生出來的 repo 調校。

| 類別 | 例子 |
|------|------|
| **Secret 洩漏** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWS 金鑰、Supabase `service_role` JWT、DB 連線字串、Slack token、SendGrid `SG.`、Notion `secret_`/`ntn_`、Twilio Account SID + Auth Token、JWT 簽章金鑰 |
| **注入攻擊** | SQL template literal、NoSQL `req.body`、`child_process.exec` 字串拼接、path traversal、`dangerouslySetInnerHTML` 未清洗 |
| **網路層** | CORS `*` + credentials、CORS 反射 origin、SSRF `fetch(req.body.url)`、open redirect |
| **Auth** | Next.js API route 沒 auth（AST 分析）、JWT `alg: none`、`\|\| true` bypass、`// TODO: add auth`、弱 cookie |
| **資料庫** | Supabase table 沒開 RLS、policy 用 `(true)`、`'use client'` 檔案出現 service_role |
| **環境變數誤用** | `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` 會被打包進 client bundle |
| **供應鏈（需網路）** | OSV.dev 依賴 CVE 查詢、LLM 幻覺套件偵測（對比 npm registry） |
| **平台指紋** | 偵測你用哪家 AI 生的 code、調整規則權重 |
| **Python（Django/Flask/FastAPI）** | `DEBUG = True`、寫死的 `SECRET_KEY`、`ALLOWED_HOSTS = ['*']`、`@csrf_exempt`、`yaml.load`、`pickle.loads(user_input)`、SQL f-string 注入、`subprocess(shell=True)`、`eval(request.*)`、FastAPI 沒 `Depends(get_current_user)`、`jwt.decode(algorithms=['none'])` |

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

# 即時驗證找到的金鑰在 provider 上是否還活著（需 --own）
npx vibe-hardening scan --verify --own
```

### `--verify` 即時金鑰驗證

對有 verifier 的金鑰（OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion），`--verify --own` 會對每個找到的金鑰打一次 provider 最輕量的讀取 API（list models、auth test 等，**絕不**破壞性），分類成：

- **LIVE KEY** — 立刻輪換
- **revoked** — 安全，有空再清
- **unverified** — 被限流、離線，或該 kind 沒 verifier

`--own` 是故意加的安全帶，CLI 拒絕去探測你沒聲明擁有的金鑰。沒加 `--own` 時，`--verify` 會丟 stderr 警告並退回只偵測模式。

## 平台指紋偵測

掃描開始時會先認出 repo 是哪家 AI 產的：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

支援：`v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`。

## 現況

預覽版 —— Phase 1 MVP 目標 **2026-05-13** 上 Product Hunt。

目前覆蓋（`v0.0.8-preview.3`）：
- 支援語言：JavaScript / TypeScript / Python（Django、Flask、FastAPI）
- 6 個引擎：RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM 幻覺
- 47 條規則、217 個測試、一般 repo 5 秒內掃完
- 7 家 provider 即時金鑰驗證（OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion）
- 輸出格式：彩色終端機、CI 用 JSON、獨立 HTML 報告
- 0-100 資安分數 + A-F 等級 + SVG README badge
- 行內抑制：`// vibe-hardening-disable-next-line vh-rule-id`
- 8 家 AI 平台指紋偵測

路線圖：
- Go / Rust 支援（Phase 3）
- Markdown reporter
- GitHub Action + PR 留言機器人
- Pro dashboard、Slack 通知（上線後）

## 回報漏洞

請 email `angletech2026@gmail.com`，**不要開 public issue**。詳見 [SECURITY.md](./SECURITY.md)。

## License

MIT © 2026 vibe-hardening contributors.
