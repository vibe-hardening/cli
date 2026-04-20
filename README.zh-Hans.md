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

47 条规则、9 大类别。针对 **v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** 生成的仓库做了专门调优。

| 类别 | 示例 |
|------|------|
| **密钥泄露** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWS 密钥、Supabase `service_role` JWT、数据库连接字符串、Slack token、JWT 签名密钥 |
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
```

## 平台指纹检测

扫描开始时会先识别仓库由哪家 AI 生成：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

支持：`v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`。

## 当前状态

预览版 —— Phase 1 MVP 目标 **2026-05-13** 上 Product Hunt。

当前覆盖（`v0.0.8-preview.3`）：
- 支持语言：JavaScript / TypeScript / Python（Django、Flask、FastAPI）
- 6 个引擎：RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM 幻觉
- 47 条规则、217 个测试、一般仓库 5 秒内扫描完毕
- 输出格式：彩色终端、CI 用 JSON、独立 HTML 报告
- 0-100 安全分数 + A-F 等级 + SVG README badge
- 行内抑制：`// vibe-hardening-disable-next-line vh-rule-id`
- 8 家 AI 平台指纹检测

路线图：
- 实时密钥验证（`--verify` 调用 provider API 确认泄露密钥是否仍然有效）
- Markdown reporter
- Pro 控制台、GitHub App、Slack 通知（上线后）

## 漏洞报告

请邮件联系 `angletech2026@gmail.com`，**不要开 public issue**。详见 [SECURITY.md](./SECURITY.md)。

## License

MIT © 2026 vibe-hardening contributors.
