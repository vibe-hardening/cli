# Changelog

All notable changes to **vibe-hardening** are documented here. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/) but
keeps each entry tight enough to read in one breath. The CLI is
pre-1.0; everything is currently shipped under the npm `preview` tag.

The PH launch is targeted for **2026-05-13 14:00 UTC**.

## [Unreleased]

### Fixed
- `--changed-only` now also includes untracked files (via
  `git ls-files --others --exclude-standard`). Previously a vibe coder
  could write a brand-new file with a hardcoded key, run `vh scan
  --changed-only` before staging, and see a clean report — the secret
  was silently missed because plain `git diff HEAD` skips untracked
  paths. Local mode is now union(diff, untracked); PR-mode (`--changed-only origin/main`) is unchanged so CI runner working-tree
  garbage cannot bleed into PR diffs.

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
