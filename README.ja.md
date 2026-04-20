# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> AI生成コードのためのワンコマンドセキュリティスキャナー。

**言語**: [English](./README.md) · [繁體中文](./README.zh-Hant.md) · [简体中文](./README.zh-Hans.md) · [한국어](./README.ko.md) · **日本語**

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

**対応言語**: JavaScript / TypeScript / **Python** (Django / Flask / FastAPI).

48のルール、9カテゴリー。**v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** が生成したリポジトリ向けに調整されています。

| カテゴリー | 例 |
|-----------|-----|
| **シークレット漏洩** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWSキー、Supabase `service_role` JWT、DB接続文字列、Slackトークン、SendGrid `SG.`、Notion `secret_`/`ntn_`、Twilio Account SID + Auth Token、JWT署名キー |
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

# スタンドアロン HTML レポート — 共有可能、保存後はオフラインでも閲覧可
npx vibe-hardening scan --format html -o report.html

# 現在のスコアとグレードを表示する SVG バッジ、README に埋め込める
npx vibe-hardening badge -o .github/vibe-hardening.svg

# --roast モード：中性メッセージを辛辣な brutalist ワンライナーに置換。
# コンソール専用 — JSON / HTML は CI 用にプロフェッショナルなまま。
npx vibe-hardening scan --roast
```

### `--verify` ライブキー検証

verifier がある鍵 (OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion) について、`--verify --own` は検出した鍵ごとにプロバイダーの最小限の読み取り API (list models、auth test など — **絶対に**破壊的ではない) を1回呼び出し、以下に分類します：

- **LIVE KEY** — 即座にローテーション
- **revoked** — 安全、後で整理
- **unverified** — レート制限、オフライン、または verifier がない

`--own` は意図的な安全装置で、CLI は所有を宣言していない鍵の調査を拒否します。`--own` なしで `--verify` を実行すると stderr に警告が出て検出のみのモードに戻ります。

### `--roast` モード

中性なルールメッセージを辛辣な brutalist ワンライナーに置き換え、スコア行にもグレード別の一言を追加します:

```
 CRITICAL  vh-secret-openai  (2:12)
           OpenAI key in source. Your token bill just rang. It's scared.
           snippet: sk-pro…opqr

score      42 / 100  [F]   This is a hostage note to yourself.
```

シップ済みの全ルールに手書きの台詞 (43 件 — secrets / injection / auth / network / Python / サプライチェーン) があります。依存 CVE はプレフィックスベースの roast。未知のルール ID は中性メッセージにフォールバック。

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

critical または high の finding があると `scan` は exit 1 で終了するため、CI は回帰を即座に失敗扱いにできます。`upload-artifact` で HTML が PR ページから直接ダウンロード可能になります。

ほとんどのチームは CI では `--verify --own` を**実行しません** — CI でプロバイダーに live API コールを投げるのはレート制限に引っかかりやすく、ローカル実行のみで十分です。

### README バッジ

```bash
npx vibe-hardening badge -o .github/vibe-hardening.svg
```

トップレベル README で参照:

```markdown
![vibe-hardening](./.github/vibe-hardening.svg)
```

main ブランチマージ後に再生成して最新状態を保ちます。SVG は約 500 バイト、ランタイム不要、GitHub でネイティブ描画されます。

## プラットフォーム指紋検出

スキャン開始時にリポジトリがどのAIで生成されたかを識別します：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

対応: `v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`

## 現在のステータス

プレビューリリース — Phase 1 MVPは **2026-05-13** にProduct Huntでのローンチを目標としています。

現在のカバレッジ (`v0.0.11-preview.0`):
- 対応言語: JavaScript / TypeScript / Python (Django、Flask、FastAPI)
- 6つのエンジン: RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM幻覚
- 48のルール、250のテスト、一般的なリポジトリを5秒以内にスキャン
- 7 プロバイダーのライブキー検証 (OpenAI、Anthropic、Stripe、GitHub PAT、Slack、SendGrid、Notion)
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
