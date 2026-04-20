# vibe-hardening

> **Vibe coded. Vibe hardened.**
>
> AI가 생성한 코드를 위한 원커맨드 보안 스캐너.

**언어**: [English](./README.md) · [繁體中文](./README.zh-Hant.md) · [简体中文](./README.zh-Hans.md) · **한국어** · [日本語](./README.ja.md)

```bash
npx vibe-hardening scan
```

웹사이트: [vibe-hardening.io](https://vibe-hardening.io)

## 빠른 시작 (5초)

```bash
# 1. 터미널을 엽니다
# 2. AI 도구로 작성한 JS / TS 프로젝트 디렉토리로 cd
cd ~/projects/my-app

# 3. 스캐너 실행
npx vibe-hardening scan
```

처음 실행 시 npx가 `Ok to proceed?`라고 묻습니다. `Enter`를 누르세요.

**요구사항**: Node.js 18.17+ (`npm` / `next` / `vite`를 사용해봤다면 이미 설치되어 있음).

**자주 발생하는 실수**:
- `cd` 없이 `~/Desktop`에서 실행 → 데스크톱 전체가 스캔됩니다. 먼저 프로젝트로 이동하세요.
- `vibe-hardening` 저장소 내부에서 실행 → 당신의 앱이 아니라 도구 자체를 스캔합니다.
- Node가 없음: `npx`가 인식되지 않으면 [nodejs.org](https://nodejs.org)에서 설치.

## 무엇을 탐지하나요

**지원 언어**: JavaScript / TypeScript / **Python** (Django / Flask / FastAPI).

47개 규칙, 9개 카테고리. **v0 / Lovable / Bolt / Cursor / Claude Code / Replit Agent / Windsurf / Devin** 로 생성된 저장소에 최적화되어 있습니다.

| 카테고리 | 예시 |
|---------|------|
| **시크릿 유출** | OpenAI `sk-proj-`、Anthropic `sk-ant-`、Stripe `sk_live_`、GitHub PAT、AWS 키、Supabase `service_role` JWT、DB 연결 문자열、Slack 토큰、SendGrid `SG.`、Notion `secret_`/`ntn_`、Twilio Account SID + Auth Token、JWT 서명 키 |
| **인젝션 공격** | SQL 템플릿 리터럴、NoSQL `req.body`、`child_process.exec` 문자열 조합、path traversal、새니타이저 없는 `dangerouslySetInnerHTML` |
| **네트워크** | CORS `*` + credentials、CORS origin 반사、SSRF `fetch(req.body.url)`、오픈 리다이렉트 |
| **인증** | Next.js API route 인증 누락 (AST 분석)、JWT `alg: none`、`\|\| true` 우회、`// TODO: add auth`、약한 쿠키 |
| **데이터베이스** | RLS가 활성화되지 않은 Supabase 테이블、`(true)` 정책、`'use client'` 파일 내 service_role 참조 |
| **환경 변수 오용** | 클라이언트 번들로 유출되는 `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` 변수 |
| **공급망 (네트워크 필요)** | OSV.dev 의존성 CVE 조회、LLM 환각 패키지 탐지 (npm registry 대조) |
| **플랫폼 지문** | 어떤 AI 도구가 코드를 생성했는지 식별하고 규칙 가중치 조정 |
| **Python (Django/Flask/FastAPI)** | `DEBUG = True`、하드코딩된 `SECRET_KEY`、`ALLOWED_HOSTS = ['*']`、`@csrf_exempt`、`yaml.load`、`pickle.loads(user_input)`、SQL f-string 인젝션、`subprocess(shell=True)`、`eval(request.*)`、FastAPI `Depends(get_current_user)` 누락、`jwt.decode(algorithms=['none'])` |

## 사용법

```bash
# 현재 디렉토리 스캔
npx vibe-hardening scan

# 특정 폴더 스캔
npx vibe-hardening scan ./my-project

# CI용 (critical/high 발견 시 exit 1)
npx vibe-hardening scan --format json --output report.json

# high 이상만 보기
npx vibe-hardening scan --severity high

# 네트워크 체크 건너뛰기 (OSV, npm registry)
npx vibe-hardening scan --offline

# 유출된 키가 provider에서 아직 유효한지 실시간 확인 (--own 필요)
npx vibe-hardening scan --verify --own
```

### `--verify` 실시간 키 확인

verifier가 있는 키 (OpenAI, Anthropic, Stripe, GitHub PAT, Slack, SendGrid, Notion)에 대해, `--verify --own`은 발견된 각 키마다 provider의 최소 읽기 API (list models, auth test 등 — **절대** 파괴적이지 않음)를 한 번 호출하여 다음으로 분류합니다:

- **LIVE KEY** — 즉시 교체
- **revoked** — 안전, 여유 있을 때 정리
- **unverified** — 속도 제한, 오프라인, 또는 해당 kind에 verifier 없음

`--own`은 의도적인 안전벨트로, CLI는 소유를 주장하지 않은 키의 조사를 거부합니다. `--own` 없이 `--verify`를 실행하면 stderr 경고가 출력되고 탐지 전용 모드로 돌아갑니다.

## 플랫폼 지문 탐지

스캔 시작 시 repo가 어떤 AI로 생성되었는지 식별합니다:

```
vibe-hardening scan complete  ·  147 files  ·  412ms
platform  v0  (74% confidence)
```

지원: `v0` / `lovable` / `bolt` / `cursor` / `claude-code` / `replit-agent` / `windsurf` / `devin`

## 현재 상태

프리뷰 릴리스 — Phase 1 MVP는 **2026-05-13** Product Hunt 출시가 목표입니다.

현재 커버리지 (`v0.0.8-preview.3`):
- 지원 언어: JavaScript / TypeScript / Python (Django, Flask, FastAPI)
- 6개 엔진: RLS diff、JWT payload、auth AST、pattern regex、OSV.dev、LLM 환각
- 47개 규칙、217개 테스트、일반적인 repo를 5초 이내에 스캔
- 7개 provider 실시간 키 확인 (OpenAI, Anthropic, Stripe, GitHub PAT, Slack, SendGrid, Notion)
- 출력 형식: 컬러 터미널、CI용 JSON、독립형 HTML 보고서
- 0-100 보안 점수 + A-F 등급 + SVG README 배지
- 인라인 억제: `// vibe-hardening-disable-next-line vh-rule-id`
- 8개 AI 플랫폼 지문 탐지

로드맵:
- Go / Rust 지원 (Phase 3)
- GitHub Action + PR 코멘트 봇
- Markdown reporter
- Pro 대시보드、GitHub App、Slack 알림 (출시 후)

## 취약점 신고

이메일 `angletech2026@gmail.com`으로 보내주세요. **공개 이슈로 올리지 마세요.** 자세한 내용은 [SECURITY.md](./SECURITY.md) 참조.

## License

MIT © 2026 vibe-hardening contributors.
