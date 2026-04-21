# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> 面向 AI 生成代码的一键安全扫描 CLI。

**语言**：[English](./README.md) · [繁體中文](./README.zh-Hant.md) · **简体中文** · [한국어](./README.ko.md) · [日本語](./README.ja.md)

```bash
npx vibe-hardening scan
```

网站：[vibe-hardening.io](https://vibe-hardening.io)

## 快速上手（5 秒）

```bash
# 1. 打开 terminal
# 2. cd 到任意一个你用 AI 写过的 JS / TS 项目
cd ~/projects/my-app

# 3. 运行扫描
npx vibe-hardening scan
```

首次运行 npx 会询问 `Ok to proceed?`，按 `Enter` 即可。

**要求**：Node.js 18.17+（用过 `npm` / `next` / `vite` 就已经装好了）。

**常见卡点**：
- 在 `Desktop/` 直接运行 → 会扫整个桌面。请先 `cd` 到具体项目。
- 在 `vibe-hardening` repo 内部运行 → 扫的是工具本身，不是你的 app。
- 未装 Node：去 [nodejs.org](https://nodejs.org) 下载。出现 `'npx' 不是内部命令` 就是这个原因。

## 能检测什么

**支持语言**：JavaScript / TypeScript / **Python**（Django / Flask / FastAPI）。

48 条规则、9 大类别。针对 **v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** 生成的仓库做了专门调优。

| 类别 | 示例 |
|------|------|
| **密钥泄露** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWS 密钥、Supabase `service_role` JWT、数据库连接字符串、Slack token、SendGrid `SG.`、Notion `secret_`/`ntn_`、Twilio Account SID + Auth Token、**Google / Gemini `AIzaSy...`**、JWT 签名密钥 |
| **注入攻击** | SQL 模板字符串、NoSQL `req.body`、`child_process.exec` 字符串拼接、路径穿越、未清洗的 `dangerouslySetInnerHTML` |
| **网络层** | CORS `*` + credentials、CORS 反射 origin、SSRF `fetch(req.body.url)`、开放重定向 |
| **认证** | Next.js API 路由缺失认证检查（AST 分析）、JWT `alg: none`、`\|\| true` 绕过、`// TODO: add auth`、弱 cookie |
| **数据库** | Supabase table 未启用 RLS、policy 使用 `(true)`、`'use client'` 文件中出现 service_role |
| **环境变量误用** | `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` 会被打包进客户端 bundle |
| **供应链（需联网）** | OSV.dev 依赖 CVE 查询、LLM 幻觉包检测（对比 npm registry） |
| **平台指纹** | 识别代码由哪家 AI 生成、据此调整规则权重 |
| **Python（Django/Flask/FastAPI）** | `DEBUG = True`、硬编码 `SECRET_KEY`、`ALLOWED_HOSTS = ['*']`、`@csrf_exempt`、`yaml.load`、`pickle.loads(user_input)`、SQL f-string 注入、`subprocess(shell=True)`、`eval(request.*)`、FastAPI 缺 `Depends(get_current_user)`、`jwt.decode(algorithms=['none'])` |

## 使用方法

```bash
# 扫描当前目录
npx vibe-hardening scan

# 扫描指定文件夹
npx vibe-hardening scan ./my-project

# CI 用（存在 critical/high 时 exit 1）
npx vibe-hardening scan --format json --output report.json

# 仅显示 high 及以上
npx vibe-hardening scan --severity high

# 跳过网络检查（OSV、npm registry）
npx vibe-hardening scan --offline

# 实时验证找到的密钥在 provider 上是否还有效（需要 --own）
npx vibe-hardening scan --verify --own

# 独立 HTML 报告 — 可分享、存档后离线也能看
npx vibe-hardening scan --format html -o report.html

# 生成显示当前分数和等级的 SVG badge，可贴进 README
npx vibe-hardening badge -o .github/vibe-hardening.svg

# --roast 模式：用毒舌 brutalist 一句话替换中性消息。
# 只影响 console — JSON / HTML 输出保持专业供 CI 使用。
npx vibe-hardening scan --roast
```

### `--verify` 实时密钥验证

对有 verifier 的密钥（OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion、Gemini），`--verify --own` 会对每个发现的密钥打一次 provider 最轻量的读取 API（list models、auth test 等，**绝不**破坏性），分类成：

- **LIVE KEY** — 立即轮换
- **revoked** — 安全，有空再清理
- **unverified** — 被限流、离线，或该 kind 没 verifier

`--own` 是故意加的安全带，CLI 会拒绝探测你没声明拥有的密钥。没加 `--own` 时，`--verify` 会输出 stderr 警告并退回只检测模式。

### `--roast` 模式

把中性 rule 消息替换成毒舌 brutalist 一句话，分数行也加一段吐槽：

```
 CRITICAL  vh-secret-openai  (2:12)
           OpenAI key in source. Your token bill just rang. It's scared.
           snippet: sk-pro…opqr

score      42 / 100  [F]   This is a hostage note to yourself.
```

每一条 shipped rule 都有手写台词（48 条，覆盖 secrets / injection / auth / network / Python / 供应链）。依赖 CVE 用 prefix roast。未知 rule 会 fallback 到原本的中性消息。

**只影响 console** — JSON 和 HTML reporter 完全不碰，CI artifact / 合规报告 / 任何机器解析用的都保持专业。和其他 flag 可以自由组合：

```bash
npx vibe-hardening scan --roast
npx vibe-hardening scan --verify --own --roast
```

### HTML 报告

```bash
npx vibe-hardening scan --format html -o report.html
# macOS:   open report.html
# Linux:   xdg-open report.html
# Windows: start report.html
```

单文件自包含（只有 Google Fonts 是外部资源），可以放心 email、丢 Slack、或当 CI artifact 上传。即使 100 个以上 findings 通常也 < 50 KB。

**包含**：hero 区块（等级、分数）、严重度统计、按文件分组的 findings（rule ID / 行号 / snippet / 修复建议）、`--verify` 结果徽章（▲ LIVE KEY / ✓ REVOKED / ? UNVERIFIED）、可重用的 inline SVG 分数 badge。

**不包含**：原始密钥值（reporter 产出前已 strip）、绝对路径（只留相对路径）、环境变量。reporter 永远不碰 `process.env`，分享 HTML 很安全。

### CI 集成（GitHub Actions）

```yaml
name: vibe-hardening
on: [pull_request, push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx -y vibe-hardening scan --format html -o vh-report.html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vibe-hardening-report
          path: vh-report.html
```

遇到任何 critical 或 high 时 `scan` 返回 exit 1，CI 立即失败。`upload-artifact` 会在 PR 页面生成下载链接供 reviewer 点开 HTML 报告。

大多数团队**不在 CI 跑** `--verify --own` — 对 provider 打 live API 在 CI 里不是理想时机（容易撞 rate limit），本地手动跑即可。

### README badge

```bash
npx vibe-hardening badge -o .github/vibe-hardening.svg
```

然后在 README 引用：

```markdown
![vibe-hardening](./.github/vibe-hardening.svg)
```

main 分支 merge 后重跑一次保持最新。SVG 约 500 bytes，无 runtime，GitHub 直接原生渲染。

## 平台指纹检测

扫描开始时会先识别仓库由哪家 AI 生成：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

支持：`v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`。

## 当前状态

预览版 —— Phase 1 MVP 目标 **2026-05-13** 上 Product Hunt。

当前覆盖（`v0.0.12-preview.2`）：
- 支持语言：JavaScript / TypeScript / Python（Django、Flask、FastAPI）
- 6 个引擎：RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM 幻觉
- 48 条规则、260 个测试、一般仓库 5 秒内扫描完毕
- 8 家 provider 实时密钥验证（OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion、Gemini）
- 每个 LIVE KEY 旁边显示预估滥用成本（9 家 provider，含 Twilio）
- 输出格式：彩色终端、CI 用 JSON、独立 HTML 报告
- 0-100 安全分数 + A-F 等级 + SVG README badge
- 行内抑制：`// vibe-hardening-disable-next-line vh-rule-id`
- 8 家 AI 平台指纹检测

路线图：
- Go / Rust 支持（Phase 3）
- GitHub Action + PR 评论机器人
- Markdown reporter
- Pro 控制台、GitHub App、Slack 通知（上线后）

## 漏洞报告

请邮件联系 `angletech2026@gmail.com`，**不要开 public issue**。详见 [SECURITY.md](./SECURITY.md)。

## License

MIT © 2026 vibe-hardening contributors.
