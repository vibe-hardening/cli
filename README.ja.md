# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> AI生成コードのためのワンコマンドセキュリティスキャナー。

**言語**: [English](./README.md) · [繁體中文](./README.zh-Hant.md) · [简体中文](./README.zh-Hans.md) · [한국어](./README.ko.md) · **日本語**

[![npm](https://img.shields.io/npm/v/vibe-hardening?label=npm&color=blue)](https://www.npmjs.com/package/vibe-hardening)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-vibe--hardening-blue?logo=github)](https://github.com/marketplace/actions/vibe-hardening)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

```bash
npx vibe-hardening scan
```

ウェブサイト: [vibe-hardening.io](https://vibe-hardening.io)

## クイックスタート (5 秒)

```bash
# 1. ターミナルを開きます
# 2. AI ツールで書いた任意の JS / TS プロジェクトに cd
cd ~/projects/my-app

# 3. スキャナーを実行
npx vibe-hardening scan
```

初回のみ npx が `Ok to proceed?` と確認するので `Enter` を押してください。

**要件**: Node.js 18.17+ (`npm` / `next` / `vite` を使ったことがあれば、すでにインストール済み)。

**よくある間違い**:
- `cd` せずに `~/Desktop` で実行 → デスクトップ全体がスキャンされます。まずプロジェクトに移動してください。
- `vibe-hardening` リポジトリの中で実行 → あなたのアプリではなくツール自体をスキャンしてしまいます。
- Node がない: `npx` が認識されない場合は [nodejs.org](https://nodejs.org) からインストール。

## 何を検出するか

**対応言語**: JavaScript / TypeScript / **Python** (Django / Flask / FastAPI) / **Go** / **Rust**.

74のルール、4言語、9カテゴリー。**v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** が生成したリポジトリ向けに調整されています。

| カテゴリー | 例 |
|-----------|-----|
| **シークレット漏洩** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWSキー、Supabase `service_role` JWT、DB接続文字列、Slackトークン、SendGrid `SG.`、Notion `secret_`/`ntn_`、Twilio Account SID + Auth Token、**Google / Gemini `AIzaSy...`**、JWT署名キー |
| **インジェクション攻撃** | SQLテンプレートリテラル、NoSQL `req.body`、文字列補間による `child_process.exec`、パストラバーサル、サニタイザーなしの `dangerouslySetInnerHTML` |
| **ネットワーク** | CORS `*` + credentials、CORSオリジン反射、SSRF `fetch(req.body.url)`、オープンリダイレクト |
| **認証** | Next.js API routeの認証チェック欠落 (AST解析)、JWT `alg: none`、`\|\| true` バイパス、`// TODO: add auth`、弱いクッキー |
| **データベース** | RLSが無効なSupabaseテーブル、`(true)` ポリシー、`'use client'` ファイル内の service_role 参照 |
| **環境変数の誤用** | クライアントバンドルに漏れる `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` 変数 |
| **サプライチェーン（要ネットワーク）** | OSV.dev依存関係CVE検索、LLM幻覚パッケージ検出 (npm registry対照) |
| **プラットフォーム指紋** | どのAIツールがコードを生成したかを特定し、ルールの重み付けを調整 |
| **Python (Django/Flask/FastAPI)** | `DEBUG = True`、ハードコードされた `SECRET_KEY`、`ALLOWED_HOSTS = ['*']`、`@csrf_exempt`、`yaml.load`、`pickle.loads(user_input)`、SQL f-string インジェクション、`subprocess(shell=True)`、`eval(request.*)`、FastAPI の `Depends(get_current_user)` 不足、`jwt.decode(algorithms=['none'])` |

## 使い方

```bash
# カレントディレクトリをスキャン
npx vibe-hardening scan

# 特定のフォルダをスキャン
npx vibe-hardening scan ./my-project

# CI用（critical/highがあれば exit 1）
npx vibe-hardening scan --format json --output report.json

# high以上のみ表示
npx vibe-hardening scan --severity high

# ネットワークチェックをスキップ (OSV、npm registry)
npx vibe-hardening scan --offline

# 漏洩した鍵がプロバイダーでまだ有効かをライブ検証 (--own が必要)
npx vibe-hardening scan --verify --own

# git diff の変更ファイルだけスキャン（CI / pre-commit 用、大規模 repo で 10 倍速）
# ref なし: HEAD と比較; ref 付き: 3-dot diff (PR モード)
npx vibe-hardening scan --changed-only
npx vibe-hardening scan --changed-only=main

# スタンドアロン HTML レポート — 共有可能、保存後はオフラインでも閲覧可
npx vibe-hardening scan --format html -o report.html

# Markdown レポート — PR コメント / Slack / Issue にそのまま貼り付け
npx vibe-hardening scan --format markdown -o report.md

# baseline と比較 — PR モード、この PR で新しく出た finding だけ表示
npx vibe-hardening scan --format json -o baseline.json   # main で先に実行
npx vibe-hardening scan --compare baseline.json          # PR で実行

# 現在のスコアとグレードを表示する SVG バッジ、README に埋め込める
npx vibe-hardening badge -o .github/vibe-hardening.svg

# --roast モード：中性メッセージを辛辣な brutalist ワンライナーに置換。
# コンソール専用 — JSON / HTML は CI 用にプロフェッショナルなまま。
npx vibe-hardening scan --roast

# --suggest-fix: 修正可能なシークレット検出に対してコピペ可能な diff を出力
# (リテラル → process.env.X)。ファイルは絶対に変更しません。
npx vibe-hardening scan --suggest-fix

# 任意の rule ID の詳細を表示 — 重大度、検出内容、影響、修正方法
npx vibe-hardening explain vh-secret-openai
```

### `--verify` ライブキー検証

verifier がある鍵 (OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion、Gemini) について、`--verify --own` は検出した鍵ごとにプロバイダーの最小限の読み取り API (list models、auth test など — **絶対に**破壊的ではない) を1回呼び出し、以下に分類します：

- **LIVE KEY** — 即座にローテーション
- **revoked** — 安全、後で整理
- **unverified** — レート制限、オフライン、または verifier がない

`--own` は意図的な安全装置で、CLI は所有を宣言していない鍵の調査を拒否します。`--own` なしで `--verify` を実行すると stderr に警告が出て検出のみのモードに戻ります。

### `--suggest-fix` コピペ用 diff

修正方針が明確なシークレット検出（「リテラル → 環境変数」）について、`--suggest-fix` はそのままコピーできる unified-diff スタイルのブロックを出力します:

```
▲ SUGGESTED FIXES  (2)

app.ts
  (1)  vh-secret-openai
    - const k = "sk-proj-Tc8aNm3LKuWqVJ0HbDpZ4yourkeyhere5oI7yBkQv9MaCwSdRtPlNgUeFxOiHjZkLmNbCdEf";
    + const k = process.env.OPENAI_API_KEY;

Add to .env.example:
    + OPENAI_API_KEY=
```

12 プロバイダー対応 (OpenAI、Anthropic、Stripe、GitHub、Slack、SendGrid、Notion、Twilio、Google、AWS、JWT、汎用 DB URL)。env-var への置き換えで済まない検出（SQL インジェクション、認証欠落など）はスキップします — テンプレ的な提案では破壊的になるためです。

**ファイルは絶対に変更しません。** 出力はレビューして手動適用するためのテキストです。コンソール専用 — JSON / HTML には影響なし。`--changed-only` と組み合わせると最速の pre-commit チェックになります。

### `--roast` モード

中性なルールメッセージを辛辣な brutalist ワンライナーに置き換え、スコア行にもグレード別の一言を追加します:

```
 CRITICAL  vh-secret-openai  (2:12)
           OpenAI key in source. Your token bill just rang. It's scared.
           snippet: sk-pro…opqr

score      42 / 100  [F]   This is a hostage note to yourself.
```

シップ済みの全ルールに手書きの台詞 (48 件 — secrets / injection / auth / network / Python / サプライチェーン) があります。依存 CVE はプレフィックスベースの roast。未知のルール ID は中性メッセージにフォールバック。

**コンソール専用** — JSON と HTML レポーターには一切触れないため、CI アーティファクト、コンプライアンスレポート、機械パース用の出力はプロフェッショナルなまま。他のフラグと自由に組み合わせ可能:

```bash
npx vibe-hardening scan --roast
npx vibe-hardening scan --verify --own --roast
```

### HTML レポート

```bash
npx vibe-hardening scan --format html -o report.html
# macOS:   open report.html
# Linux:   xdg-open report.html
# Windows: start report.html
```

単一自己完結ファイル (外部依存は Google Fonts のみ) — メール添付、Slack 送信、CI アーティファクトのアップロードに安全。100 件以上の findings でも通常 50 KB 未満。

**含まれるもの**: hero ブロック (グレード、スコア)、重大度集計、ファイルごとにグループ化された findings (rule ID / 行:列 / snippet / 修正方法)、`--verify` 結果バッジ (▲ LIVE KEY / ✓ REVOKED / ? UNVERIFIED)、再利用可能なインライン SVG スコアバッジ。

**含まれないもの**: 生の秘密鍵値 (reporter 実行前に strip 済み)、絶対パス (相対のみ)、環境変数。reporter は `process.env` に一切触れないため、HTML を共有しても安全です。

### CI 統合 (GitHub Actions)

公開 action を直接使用 — `uses: vibe-hardening/cli@v1`:

```yaml
name: vibe-hardening
on: [pull_request, push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # --changed-only PR モードに必須
      - uses: vibe-hardening/cli@v1
        with:
          severity: high
          format: html
          output: vh-report.html
          changed-only: origin/${{ github.base_ref }}  # PR モード 10× 高速化
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vibe-hardening-report
          path: vh-report.html
```

利用可能な inputs: `cwd` · `severity` · `format` · `output` · `changed-only` · `verify` · `roast` · `version`。critical または high の finding があると exit 1 で終了します。

Output: `exit-code`(`continue-on-error: true` と組み合わせれば、action を失敗させずにデプロイをゲート可能)。

ほとんどのチームは CI では `verify: true` を**実行しません** — CI でプロバイダーに live API コールを投げるのはレート制限に引っかかりやすく、ローカル実行のみで十分です。

### README バッジ

```bash
npx vibe-hardening badge -o .github/vibe-hardening.svg
```

トップレベル README で参照:

```markdown
![vibe-hardening](./.github/vibe-hardening.svg)
```

main ブランチマージ後に再生成して最新状態を保ちます。SVG は約 500 バイト、ランタイム不要、GitHub でネイティブ描画されます。

## Agent Scan（0.4.0 新規）

`vibe-hardening` は**ローカルの AI agent skill ファイル**もスキャンできるようになりました。Skill は markdown + scripts で、agent プラットフォームがランタイムで context にロードします — これは新しい攻撃面です：

```bash
npx vibe-hardening agent scan
```

**Cursor / Claude Code / OpenClaw / Hermes / Gemini CLI / Goose / OpenCode / Codex / Trae / Factory** の skill インストールを自動検出します。

**65 ルール / 5 パック**：A ハードコード秘密（27 ルール再利用 + `.env`）、B プロンプトインジェクション（11）、C 危険シェル（14）、D skill スキーマ（5）、G MCP 設定（6）。

**なぜ今か** —— agent プラットフォームへのサプライチェーン攻撃は不可避。これは早期警戒です。

## テレメトリ（opt-in）

vibe-hardening はあなたのマシン上で動作します。コード、シークレット、ファイルパスはノートPCから出ません。最初の対話的スキャン後、CLI が**一度だけ**匿名統計の共有を尋ねます。これによりどのルールに改善が必要かを判断できます：

```
▲ vibe-hardening · first run — help us harden the rules

  We collect: rule IDs that fired, AI platform fingerprint,
              CLI version, scan duration, file count, score, anon UUID.
  We never  : your code, secrets, file names, paths, IP, email.

  Opt in later:    vibe-hardening config set telemetry on
  Privacy:         https://vibe-hardening.io/privacy

  Share anonymous scan stats? [y/N]
```

デフォルトは **No** —— 明示的に `y` / `yes` を入力した場合のみ opt-in されます。いつでも変更可能：

```bash
vibe-hardening config show              # 現在の設定と保存場所
vibe-hardening config set telemetry on  # opt-in（永続化）
vibe-hardening config set telemetry off # opt-out（永続化）
```

**ユニバーサル opt-out が常に優先**（local 設定が on でも）：`DO_NOT_TRACK=1`、`CI=1`、`VH_TELEMETRY_DISABLED=1`、`VH_TELEMETRY=off`。

完全なスキーマ、保持期間、ソースコードの根拠：<https://vibe-hardening.io/privacy>。

## プラットフォーム指紋検出

スキャン開始時にリポジトリがどのAIで生成されたかを識別します：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

対応: `v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`

## 現在のステータス

プレビューリリース — Phase 1 MVPは **2026-05-13** にProduct Huntでのローンチを目標としています。

現在のカバレッジ (`v0.4.0`):
- 対応言語: JavaScript / TypeScript / Python (Django、Flask、FastAPI) / **Go** / **Rust**
- 6つのエンジン: RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM幻覚
- **74 コードルール + 65 agent-scan ルール + 406 テスト**、一般的なリポジトリを5秒以内にスキャン
- **Agent skill scanner**（0.4.0 新規）—— Cursor / Claude Code / OpenClaw / Hermes / Gemini CLI / Goose / OpenCode / Codex / Trae / Factory
- **opt-in 匿名テレメトリ**（デフォルト無効、環境変数で永久無効化可能）
- 8 プロバイダーのライブキー検証 (OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion、Gemini)
- LIVE KEY ごとに推定被害額を併記 (9 プロバイダー、Twilio 含む)
- 出力形式: カラーターミナル、CI用JSON、スタンドアロンHTMLレポート
- 0-100セキュリティスコア + A-F グレード + SVG README バッジ
- インライン抑制: `// vibe-hardening-disable-next-line vh-rule-id`
- 8つのAIプラットフォームの指紋検出

ロードマップ:
- Go / Rust サポート (Phase 3)
- GitHub Action + PR コメントボット
- Markdown reporter
- Pro ダッシュボード、GitHub App、Slack通知（ローンチ後）

## 脆弱性の報告

`angletech2026@gmail.com` までメールをお送りください。**公開 issue には投稿しないでください。** 詳細は [SECURITY.md](./SECURITY.md) を参照。

## License

MIT © 2026 vibe-hardening contributors.
