# r/nextjs — Technical / Developer flavour

**Subreddit**: https://www.reddit.com/r/nextjs/
**Subscribers**: 140k+
**Tone**: technical, show your work. They care about implementation not marketing.
**Avoid**: "AI" hype. Lead with the actual bug class.

---

## Title

```
I built a security scanner that catches the common Next.js + Supabase mistakes AI tools generate
```

## Body

```
Spent a weekend on this after seeing too many shadcn/v0/Lovable
repos with the same bugs.

**vibe-hardening** — one CLI, works on Next.js App Router and Pages:

    npx vibe-hardening scan

## What it catches specifically

**Auth**
- `app/api/**/route.ts` exporting HTTP methods with no auth call
- AST-based — understands `auth()`, `getServerSession()`,
  `requireAuth()`, `supabase.auth.getUser()`, chained
  `createServerClient(...).auth.getUser()`, `(x as SupabaseClient).auth.*`,
  `x['auth']['getUser']()`, `Bearer ${process.env.CRON_SECRET}` for
  Vercel Cron, and `withAuth()` HOC.
- JWT `algorithms: ['none']` usage
- `// TODO: add auth` comments (surprisingly common)

**Secrets**
- Live OpenAI, Anthropic, Stripe, GitHub PAT, AWS keys, Slack tokens
- `NEXT_PUBLIC_*SECRET` / `*SERVICE_ROLE` — these ship to browsers
- Supabase `service_role` JWT detected via payload decode, not regex

**Supabase**
- Tables created in migrations without `enable row level security`
- RLS policies using `(true)`
- `service_role` referenced in `'use client'` files

**Injection / Network**
- Template-literal SQL with `${req.body.*}`
- `child_process.exec` with string interpolation
- `dangerouslySetInnerHTML` without a sanitiser
- `fetch(req.body.url)` SSRF
- `cors({ origin: '*', credentials: true })` (multi-line friendly)

**Supply chain**
- OSV.dev CVE lookup on `package-lock.json`
- LLM-hallucinated packages — queries npm registry for every
  dependency, flags missing ones and very-low-download names

## AST engine

Uses `ts-morph`. Handles:
- `(x as T).auth.getUser()` — unwraps AsExpression
- `x!.auth.getUser()` — unwraps NonNullExpression
- `x['auth']['getUser']()` — descends ElementAccessExpression
- Helper depth 1 — scans one level of local function calls

Source: [src/engines/auth-missing-ast.ts](https://github.com/vibe-hardening/cli/blob/main/src/engines/auth-missing-ast.ts)

## Output

Console (colour), JSON (for CI), or standalone HTML:

    npx vibe-hardening scan --format html --output report.html

Exit code 1 when critical/high findings — drop in CI.

## Tell me what I got wrong

The first self-scan produced 36 findings. 35 were false positives
(README describes vulns, test fixtures *are* vulns). After two
rounds of pruning it's down to 1 real finding on my own project.

If you run it on your Next.js app and it's noisy, tell me which rule
and what should happen. Or open an issue.

Site: https://vibe-hardening.io
Source: https://github.com/vibe-hardening/cli (MIT)
```

---

## Reply templates

**"Have you seen semgrep-registry?"**
```
Yes — semgrep is more powerful. The bet here is that a dev running
`npx vibe-hardening scan` in a fresh v0-generated repo gets feedback
in 5 seconds without writing semgrep config. If you already run
semgrep in CI, this isn't for you.
```

**"Does it check server actions?"**
```
v0.1 checks `app/api/**/route.ts` and `pages/api/**` handlers. Server
Actions ('use server' exports) are on the roadmap — they have the
same auth-missing problem but the detection pattern is different.
Should be in 0.1 final.
```

**"What about tRPC?"**
```
Doesn't understand tRPC middleware yet. If you're using tRPC,
chances are you already have per-procedure middleware defined once
and auth propagates correctly. Lower priority unless I see the
pattern fail.
```

**"Tailwind / radix / shadcn rules?"**
```
Nothing specific — they're generally fine security-wise. The rule
that hits shadcn repos most is `vh-inj-xss-dangerous-html` for
rich-text components that skip DOMPurify.
```
