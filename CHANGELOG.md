# Changelog

All notable changes to **vibe-hardening** are documented here. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/) but
keeps each entry tight enough to read in one breath.

The PH launch is targeted for **2026-05-13 14:00 UTC**.

## [0.1.0] — 2026-05-02

First non-preview release. Drops the `-preview.0` suffix that the
previous 0.0.x line carried. No code changes vs 0.0.20-preview.0 —
this is a label-only bump signalling "the surface area is stable
enough to commit to". `npx vibe-hardening` now resolves to this
version by default; older 0.0.13-preview.0 was anchoring the
`latest` dist-tag, which meant no organic traffic actually got to
try the features shipped in 0.0.14 → 0.0.20.

Cumulative state at 0.1.0:
- 3 commands: `scan` / `explain` / `badge`
- 12 scan flags incl. `--suggest-fix`, `--changed-only`,
  `--verify --own`, `--roast`, `--compare <baseline>`
- 4 output formats: console / json / html / markdown
- 51 rules across 9 categories
- 9 live-key verifiers (OpenAI / Anthropic / Stripe / GitHub PAT /
  Slack / SendGrid / Twilio / Notion / Google)
- `vh explain` enriched with live osv.dev advisory metadata for
  CVE rules
- 309 unit tests
- GitHub Marketplace listing (`vibe-hardening/cli@v1`)

## [0.0.20-preview.0] — 2026-05-02

### Fixed (post-review)
- `fingerprint()` switched from `::`-joined string to
  `JSON.stringify` of the field tuple, eliminating a HIGH-severity
  collision class where snippets containing `::` (common in TS
  generic types) could match findings with different field
  boundaries. Test added.
- `--compare` mode now writes `report.compare` metadata
  (`baselinePath`, `added`, `removed`, `unchanged`) to JSON output
  so CI consumers can detect delta-mode without parsing console
  output. Markdown reporter also emits a `Δ vs baseline` marker at
  the top of the report. Previously `summary.critical = 0` next to
  a non-zero `score` looked contradictory in JSON without context.
- `--compare` validates baseline shape — drops malformed Finding
  objects that lack `ruleId` / `file` / `line` / `column` /
  `snippet`, with a stderr warning. Prevents silent
  classify-everything-as-added when an old baseline file shape
  drifts from the current Finding schema.

## [0.0.19-preview.0] — 2026-05-02

### Added
- **`vh explain` lives off osv.dev** for `vh-dep-cve-*` rules. When
  online, the explain block now includes an `ADVISORY DETAILS`
  section with the OSV summary (or details, single-line truncated
  to 200 chars), severity label, and top 2 advisory / fix
  references. Falls back silently to the static block when offline,
  on 404, or after a 5s timeout. New `--offline` flag on `explain`
  forces local-only mode.
- **`scan --compare <baseline.json>`** — point at a previous scan's
  JSON output; the report is filtered to ONLY findings that are new
  since that baseline. Console output appends a delta line
  (`Δ vs baseline: +5 new · -2 fixed · 22 unchanged`). JSON / HTML /
  markdown output respects the same filter so CI artifacts and PR
  comments stay focused on what changed. Score remains computed on
  the absolute state (the point of `--compare` is to surface
  regressions, not pretend known issues don't exist).
- 16 new tests (`compare.test.ts` + new explain advisory tests).

### Fixed
- `runExplainCommand` no longer triggers a Windows libuv assertion
  on exit when the OSV fetch socket is still cleaning up. Switched
  from `process.exit()` to `process.exitCode` so Node drains
  pending I/O naturally.

## [0.0.18-preview.0] — 2026-04-28

### Added
- Branded help screen on `--help`. Top: red ▲ + name + version +
  tagline + landing URL. Bottom: Examples block with the 6 most
  common invocations + Docs / Marketplace links. picocolors auto-
  disables colors in non-TTY contexts so CI logs stay plain. Bare
  `vibe-hardening` (no args) still runs `scan .` — zero-config UX
  preserved.

## [0.0.17-preview.0] — 2026-04-28

### Fixed
- `vh-auth-bcrypt-low-rounds` no longer misses `bcrypt.genSalt(4, cb)`.
  The rule was originally written for the `bcrypt.hash(data, rounds)`
  signature where rounds is the second argument; for `genSalt` /
  `genSaltSync`, rounds is the **first** argument. Split into two
  patterns so both shapes are caught.
- Markdown reporter now correctly handles backticks, `<`, `>`, and
  `&` in rule IDs / messages. Previously `inlineCode()` only handled
  the rare double-backtick case and silently produced malformed
  table rows when a snippet contained a single backtick. Fallback
  now uses an HTML `<code>` element with entities escaped — safe
  inside GFM tables.

## [0.0.16-preview.0] — 2026-04-28

### Added
- **`--format markdown`** — pasteable into PR comments, Slack, GitHub
  Issues. Same severity-ordered findings as the console reporter, but
  with no ANSI escapes and proper Markdown structure (heading, summary
  table, per-file finding tables, remediation list).
- 3 new rules (49 → 51):
  - `vh-inj-eval-user-input` (CRITICAL): `eval(req.body.X)` /
    `(new) Function(...req.body.X)` — arbitrary code execution.
  - `vh-auth-token-in-localstorage` (MEDIUM): JWT / auth tokens
    persisted to localStorage / sessionStorage — XSS-readable.
  - `vh-auth-bcrypt-low-rounds` (HIGH): `bcrypt.hash(p, 4)` /
    `bcrypt.genSalt(4, cb)` — rounds < 10 are GPU-brute-forceable.
    (See 0.0.17 for the genSalt signature follow-up fix.)
- `vh explain vh-dep-cve-<ID>` now appends an OSV.dev advisory link.
  Works for both CVE and GHSA prefixes.
- `CHANGELOG.md` lands in the repo root (this file). Marketplace
  listing renders it inline.

### Fixed
- `--changed-only` now also includes untracked files (via
  `git ls-files --others --exclude-standard`). Previously a vibe coder
  could write a brand-new file with a hardcoded key, run `vh scan
  --changed-only` before staging, and see a clean report — the secret
  was silently missed because plain `git diff HEAD` skips untracked
  paths. Local mode is now `union(diff, untracked)`; PR-mode
  (`--changed-only origin/main`) is unchanged so a CI runner's
  working-tree garbage cannot bleed into PR diffs.

## [0.0.15-preview.0] — 2026-04-28

### Added
- **`vh explain <rule-id>`** — print detailed docs for any rule:
  severity, what it detects, why it matters (with order-of-magnitude
  abuse cost when applicable), how to fix, and whether a live verifier
  exists. Covers all 49 rule IDs including AST-emitted
  (`vh-auth-missing-middleware`) and dynamic ones (`vh-dep-cve-*` via
  wildcard collapse).
- GitHub Marketplace listing — `vibe-hardening/cli@v1` action is
  discoverable at https://github.com/marketplace/actions/vibe-hardening
- Landing page commands grid — all 7 commands documented inline at
  vibe-hardening.io, EN + 繁中.
- Landing waitlist form gained an optional `message` textarea so early
  signups can leave thoughts about what they want the scanner to catch.

## [0.0.14-preview.0] — 2026-04-28

### Added
- **`--suggest-fix`** — prints copy-paste-able diffs that swap inline
  secret literals for `process.env.X`, plus a deduplicated
  `.env.example` stub. 12 providers covered. Console-only by design;
  JSON / HTML output is unaffected. Stderr-warns when combined with
  non-console formats. **Never modifies your files.**

### Security
- Strip ANSI / OSC / control sequences from suggestion output —
  malicious source files in a scanned repo can no longer hijack the
  user's terminal via embedded escape codes.

## [0.0.13-preview.0] — 2026-04-26

### Added
- **`--changed-only [ref]`** — scan only files in `git diff`. Without
  a ref: vs HEAD (uncommitted + staged). With a ref like `main` or
  `origin/main`: 3-dot diff (PR-mode for CI). 10× faster on large
  repos. (Note: 0.0.15 unreleased patch fixes untracked-file gap.)

## [0.0.12-preview.2] — 2026-04-22

### Added
- Live brutalist terminal animation during scan (TTY-only, suppressed
  when stdout is redirected so machine-parseable output stays clean).

### Fixed
- 4 issues from holistic review.
- Prelude timestamp overflow on long scans.
- `RULE_COUNT_LINE` doc sync.

## [0.0.11-preview.0] — 2026-04-19

### Added
- Google / Gemini API key detection (47 rules → 48) with live
  verification.

## [0.0.10-preview.0] — 2026-04-18

### Added
- **Estimated abuse cost** displayed next to every LIVE KEY result.
  Marked `est.` to make order-of-magnitude nature explicit.

### Fixed
- CVE roast regex no longer mangles `@scope/name` package output.
- Honest source citations on every abuse-cost entry — no fabricated
  publication names.
- Notion dollar range sourced from documented incident bands.

## [0.0.9 and earlier]

Foundational releases: 48 rules across 9 categories, 8 → 9 live secret
verifiers, AST-based missing-auth detection, OSV.dev CVE scan, npm
hallucination check, Supabase RLS / service-role rules, console / JSON
/ HTML reporters, `--roast` brutalist mode, SVG score badge, platform
fingerprint, --include-tests / --include-docs / --no-gitignore flags,
.gitignore-aware walker.
