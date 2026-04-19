# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> AI生成コードのためのワンコマンドセキュリティスキャナー。

**言語**: [English](./README.md) · [繁體中文](./README.zh-Hant.md) · [简体中文](./README.zh-Hans.md) · [한국어](./README.ko.md) · **日本語**

```bash
npx vibe-hardening scan
```

ウェブサイト: [vibe-hardening.io](https://vibe-hardening.io)

## 何を検出するか

30以上のルール、8カテゴリー。**v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** が生成したリポジトリ向けに調整されています。

| カテゴリー | 例 |
|-----------|-----|
| **シークレット漏洩** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWSキー、Supabase `service_role` JWT、DB接続文字列、Slackトークン、JWT署名キー |
| **インジェクション攻撃** | SQLテンプレートリテラル、NoSQL `req.body`、文字列補間による `child_process.exec`、パストラバーサル、サニタイザーなしの `dangerouslySetInnerHTML` |
| **ネットワーク** | CORS `*` + credentials、CORSオリジン反射、SSRF `fetch(req.body.url)`、オープンリダイレクト |
| **認証** | Next.js API routeの認証チェック欠落 (AST解析)、JWT `alg: none`、`\|\| true` バイパス、`// TODO: add auth`、弱いクッキー |
| **データベース** | RLSが無効なSupabaseテーブル、`(true)` ポリシー、`'use client'` ファイル内の service_role 参照 |
| **環境変数の誤用** | クライアントバンドルに漏れる `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` 変数 |
| **サプライチェーン（要ネットワーク）** | OSV.dev依存関係CVE検索、LLM幻覚パッケージ検出 (npm registry対照) |
| **プラットフォーム指紋** | どのAIツールがコードを生成したかを特定し、ルールの重み付けを調整 |

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
```

## プラットフォーム指紋検出

スキャン開始時にリポジトリがどのAIで生成されたかを識別します：

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

対応: `v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`

## 現在のステータス

プレビューリリース — Phase 1 MVPは **2026-05-13** にProduct Huntでのローンチを目標としています。

現在のカバレッジ (`v0.0.3-preview.1`):
- 6つのエンジン: RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM幻覚
- 30以上のルール、120のテスト、一般的なリポジトリを5秒以内にスキャン
- 出力形式: カラーターミナル、CI用JSON
- 8つのAIプラットフォームの指紋検出

ロードマップ:
- ライブキー検証 (`--verify` でプロバイダーAPIに問い合わせ、漏洩したキーがまだ有効か確認)
- HTMLレポート
- 0-100セキュリティスコア + README バッジ
- Markdown reporter
- Pro ダッシュボード、GitHub App、Slack通知（ローンチ後）

## 脆弱性の報告

`angletech2026@gmail.com` までメールをお送りください。**公開 issue には投稿しないでください。** 詳細は [SECURITY.md](./SECURITY.md) を参照。

## License

MIT © 2026 vibe-hardening contributors.
