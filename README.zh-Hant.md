# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> 給 AI 生成程式碼用的一鍵資安掃描 CLI。

**語言**：[English](./README.md) · **繁體中文** · [简体中文](./README.zh-Hans.md) · [한국어](./README.ko.md) · [日本語](./README.ja.md)

[![npm](https://img.shields.io/npm/v/vibe-hardening?label=npm&color=blue)](https://www.npmjs.com/package/vibe-hardening)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-vibe--hardening-blue?logo=github)](https://github.com/marketplace/actions/vibe-hardening)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

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

48 條規則、9 大類別。針對 **v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** 這些工具生出來的 repo 調校。

| 類別 | 例子 |
|------|------|
| **Secret 洩漏** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWS 金鑰、Supabase `service_role` JWT、DB 連線字串、Slack token、SendGrid `SG.`、Notion `secret_`/`ntn_`、Twilio Account SID + Auth Token、**Google / Gemini `AIzaSy...`**、JWT 簽章金鑰 |
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

# 只掃 git diff 變動的檔案（CI / pre-commit 用，大 repo 快 10 倍）
# 不加 ref 跟 HEAD 比；加 ref 走 3-dot diff（PR 模式）
npx vibe-hardening scan --changed-only
npx vibe-hardening scan --changed-only=main

# 獨立 HTML 報告 — 可分享、存檔後離線也能看
npx vibe-hardening scan --format html -o report.html

# Markdown 報告 — 直接貼 PR comment / Slack / Issue
npx vibe-hardening scan --format markdown -o report.md

# 跟 baseline 比 — PR 模式，只顯示這個 PR 新增的 finding
npx vibe-hardening scan --format json -o baseline.json   # 先在 main 跑
npx vibe-hardening scan --compare baseline.json          # 切到 PR 跑

# 產生顯示目前分數跟等級的 SVG badge，可貼進 README
npx vibe-hardening badge -o .github/vibe-hardening.svg

# --roast 模式：用毒舌 brutalist 一句話取代中性訊息。
# 只影響 console — JSON / HTML 輸出維持專業給 CI 用。
npx vibe-hardening scan --roast

# --suggest-fix：對可修的 secret findings，印出可直接複製貼上的 diff
# (字面量 → process.env.X)。絕對不會改你的檔案。
npx vibe-hardening scan --suggest-fix

# 查任何 rule ID 的詳細說明 — 嚴重度、抓什麼、為什麼重要、怎麼修
npx vibe-hardening explain vh-secret-openai
```

### `--verify` 即時金鑰驗證

對有 verifier 的金鑰（OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion、Gemini），`--verify --own` 會對每個找到的金鑰打一次 provider 最輕量的讀取 API（list models、auth test 等，**絕不**破壞性），分類成：

- **LIVE KEY** — 立刻輪換
- **revoked** — 安全，有空再清
- **unverified** — 被限流、離線，或該 kind 沒 verifier

`--own` 是故意加的安全帶，CLI 拒絕去探測你沒聲明擁有的金鑰。沒加 `--own` 時，`--verify` 會丟 stderr 警告並退回只偵測模式。

### `--suggest-fix` 複製貼上 diff

對修法明確的 secret findings（「字面量 → 環境變數」），`--suggest-fix` 印出可直接複製的 unified-diff 風格區塊：

```
▲ SUGGESTED FIXES  (2)

app.ts
  (1)  vh-secret-openai
    - const k = "sk-proj-Tc8aNm3LKuWqVJ0HbDpZ4r6Y2fGsXh1nE5oI7yBkQv9MaCwSdRtPlNgUeFxOiHjZkLmNbCdEf";
    + const k = process.env.OPENAI_API_KEY;

Add to .env.example:
    + OPENAI_API_KEY=
```

支援 12 家 provider（OpenAI、Anthropic、Stripe、GitHub、Slack、SendGrid、Notion、Twilio、Google、AWS、JWT、通用 DB URL）。換 env-var 解不掉的 finding（SQL injection、缺驗證等）會跳過 — 模板建議套上去只會把 code 搞壞。

**絕對不會改你的檔案。** 輸出是給你看完手動套用的文字。只影響 console — JSON / HTML 輸出不受影響。配 `--changed-only` 用就是最快的 pre-commit 檢查。

### `--roast` 模式

把中性 rule 訊息換成毒舌 brutalist 一句話，分數列也加一段吐槽：

```
 CRITICAL  vh-secret-openai  (2:12)
           OpenAI key in source. Your token bill just rang. It's scared.
           snippet: sk-pro…opqr

score      42 / 100  [F]   This is a hostage note to yourself.
```

每一條 shipped rule 都有手寫台詞（48 條，涵蓋 secrets / injection / auth / network / Python / 供應鏈）。依賴 CVE 用 prefix roast。未知 rule 會 fallback 到原本的中性訊息。

**只影響 console** — JSON 跟 HTML reporter 完全不碰，CI artifact / 合規報告 / 任何機器解析用的都保持專業。跟其他 flag 可以自由組合：

```bash
npx vibe-hardening scan --roast
npx vibe-hardening scan --verify --own --roast
```

### HTML 報告

```bash
npx vibe-hardening scan --format html -o report.html
# macOS:   open report.html
# Linux:   xdg-open report.html
# Windows: start report.html
```

單檔自包含（只有 Google Fonts 是外部資源），可以放心 email、丟 Slack、或當 CI artifact 上傳。就算 100 個以上 findings 通常也 < 50 KB。

**包含**：hero 區塊（等級、分數）、嚴重度統計、依檔案分組的 findings（rule ID / 行號 / snippet / 修法）、`--verify` 結果徽章（▲ LIVE KEY / ✓ REVOKED / ? UNVERIFIED）、可重用的 inline SVG 分數 badge。

**不包含**：原始金鑰值（reporter 產出前就 strip 掉）、絕對路徑（只留相對路徑）、環境變數。reporter 永遠不碰 `process.env`，分享 HTML 很安全。

### CI 整合（GitHub Actions）

直接用發布的 action — `uses: vibe-hardening/cli@v1`：

```yaml
name: vibe-hardening
on: [pull_request, push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # --changed-only PR 模式必要
      - uses: vibe-hardening/cli@v1
        with:
          severity: high
          format: html
          output: vh-report.html
          changed-only: origin/${{ github.base_ref }}  # PR 模式快 10×
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vibe-hardening-report
          path: vh-report.html
```

可用 inputs：`cwd` · `severity` · `format` · `output` · `changed-only` · `verify` · `roast` · `version`。有任何 critical 或 high 時 exit 1，CI 立刻失敗。

Output：`exit-code`（搭配 `continue-on-error: true` 可以 gate 部署但不讓 action 失敗）。

大部分團隊**不在 CI 跑** `verify: true` — 對 provider 打 live API 在 CI 容易撞 rate limit，本地跑就好。

### README badge

```bash
npx vibe-hardening badge -o .github/vibe-hardening.svg
```

然後在 README 裡引用：

```markdown
![vibe-hardening](./.github/vibe-hardening.svg)
```

main branch merge 後重跑一次保持最新。SVG 約 500 bytes，無 runtime，GitHub 直接原生 render。

## 平台指紋偵測

掃描開始時會先認出 repo 是哪家 AI 產的：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

支援：`v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`。

## 現況

預覽版 —— Phase 1 MVP 目標 **2026-05-13** 上 Product Hunt。

目前覆蓋（`v0.0.13-preview.0`）：
- 支援語言：JavaScript / TypeScript / Python（Django、Flask、FastAPI）
- 6 個引擎：RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM 幻覺
- 48 條規則、267 個測試、一般 repo 5 秒內掃完
- 8 家 provider 即時金鑰驗證（OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion、Gemini）
- 每個 LIVE KEY 旁邊顯示預估濫用成本（9 家 provider，含 Twilio）
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
