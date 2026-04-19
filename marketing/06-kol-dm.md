# KOL Cold DM — 3 Angles

**Goal**: get them to try `npx vibe-hardening scan` once.
**Not the goal**: asking for a retweet, asking for a quote, asking for an intro.

Rules:
- 3-5 sentences max.
- Don't open with "Hey!".
- Have a specific reason you're messaging THEM (not mass outreach).
- Quit at no-reply. No follow-ups.

---

## Target 1 — @rauchg (Vercel CEO)

**Why him**: v0 is his product. He tweets about security + AI dev
tooling frequently. If he scans a v0 repo, the result helps ship his
product better.

```
Guillermo — built a scanner tuned specifically for v0 / Next.js
output (30+ rules, AST-based auth check on route handlers, 5-second
scan with a README badge). Ran it on ~20 public v0 exports and
found the same 3 patterns repeatedly: missing auth on /api/admin/*,
NEXT_PUBLIC_*SERVICE_ROLE leaks, CORS '*' with credentials.

    npx vibe-hardening scan

Would love if you ran it on a throwaway v0 project. Feedback —
especially "this rule is wrong" — would be more useful than a
retweet. MIT, no account.

github.com/vibe-hardening/cli
```

---

## Target 2 — @shadcn (creator of shadcn/ui)

**Why him**: v0 heavily uses shadcn components. He cares about the
quality of code emitted by AI tools using his library.

```
Shadcn — noticed a pattern scanning v0 exports that use your UI:
the `dangerouslySetInnerHTML` in rich-text components gets shipped
without a sanitiser in about 30% of them. Wrote a scanner that
catches it (along with 29 other AI-specific bugs).

    npx vibe-hardening scan

If you have a demo v0 project handy, 5 seconds to try. MIT, no
account, prints a 0-100 score. Happy to tune any false positive
you hit.

github.com/vibe-hardening/cli
```

---

## Target 3 — @swyx (AI engineering thought leader)

**Why him**: covers AI-assisted development extensively. Has an
audience specifically interested in the production-readiness gap of
AI-generated code. This tool IS that gap.

```
swyx — built a CLI that quantifies the "AI-generated code is not
production-ready" vibe you've been writing about. 30+ rules specific
to v0 / Lovable / Bolt / Cursor / Claude Code output. 0-100 score
per repo, badge for README, 5 seconds.

My favourite failure mode: one Cursor-generated project had
`react-auth-hooks-supabase` in package.json — doesn't exist on npm.
Cursor invented it.

    npx vibe-hardening scan

Would love your take on whether the rule set covers the right
patterns. MIT. github.com/vibe-hardening/cli
```

---

## Target 4 (bench) — @leerob (Next.js DevRel)

```
Lee — AST-based auth scanner for Next.js route handlers ignored by
AI tools — understands auth() / getServerSession() / supabase.auth.
getUser() / Bearer ${process.env.CRON_SECRET} (added that one after
it false-positived my own Vercel Cron). Rest of the checks: 30+
rules tuned for AI-coded Next.js apps.

    npx vibe-hardening scan

5 seconds, MIT, no account. If you point it at a v0 / Lovable
export and something looks wrong, please tell me.

github.com/vibe-hardening/cli
```

---

## Target 5 (bench) — @levelsio (indie hacker icon)

```
Pieter — 4-day build, 30+ security rules for AI-coded apps, shipped
to npm + vibe-hardening.io. Thought you'd appreciate the speed-run
aesthetic.

    npx vibe-hardening scan

If you scan one of your AI-assisted side projects and it finds a
real bug, tell me. If it's noisy, also tell me. Either way, 0
signup, MIT.

github.com/vibe-hardening/cli
```

---

## What NOT to send

- "Would love to get your thoughts on my project" — signals effort burden
- "Could you RT this?" — signals transactional
- "Here's the feature list:" — they won't read it
- Multi-paragraph with headers — looks like a sales email

## What to send if they reply

If they ask a question: answer directly, no pitch.
If they try it and find something: thank them, fix it, tell them in 24h.
If they ghost: leave them alone.
