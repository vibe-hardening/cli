#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`
${BOLD}${GREEN}vibe-hardening${RESET} ${DIM}v${pkg.version}${RESET}
${DIM}Vibe coded. Vibe hardened.${RESET}

${BOLD}Status:${RESET} early preview — full scanner shipping 2026-05-13.

Right now this is a placeholder that reserves the npm name. The real
Phase 1 MVP lands on GitHub first:

  ${CYAN}https://github.com/vibe-hardening/cli${RESET}

What will ship (Phase 1, 3-week roadmap):
  - Secret scanning (OpenAI / Anthropic / Stripe / Supabase)
  - Supabase RLS diff (already implemented, passing 13 tests)
  - AST-based auth-check detection for Next.js API routes
  - AI platform fingerprint (v0 / Lovable / Bolt / Cursor / ...)
  - LLM-hallucinated npm package detection
  - 0-100 security score + README badge
  - HTML / JSON / Markdown reports

${DIM}Watch / star the repo to get notified when 0.1.0 ships.${RESET}
`);
