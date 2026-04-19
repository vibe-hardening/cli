# Twitter/X Launch Thread

**Launch fires**: 2026-05-13 00:10 PT (right after PH goes live)
**Account**: @vibehardening (if you open one) or your personal.

Twitter pacing: hook → 1 surprising stat → problem → demo → tech → CTA.
Max 280 chars per post. Keep visuals at 1200×675.

---

## Main thread (7 tweets)

### Tweet 1 (the hook — this is everything)
```
I scanned 50 open-source apps built by v0, Lovable, Bolt and Cursor.

18/50 had a real API key committed to GitHub.
9/50 had Supabase service_role keys in client components.
14/50 had Next.js routes with zero auth.

So I built a scanner. 🧵
```
*Attach: 15-second terminal demo GIF*

---

### Tweet 2 (the named problem)
```
The bugs weren't random.

Every AI tool has its own 'forgot'.

v0 ships polished UI but skips auth in API routes.
Lovable wires up Supabase with service_role on the client.
Bolt leaves NEXT_PUBLIC_*SECRET in .env templates.

Different tools, same kind of leak.
```

---

### Tweet 3 (the fix)
```
vibe-hardening — one command, no config:

  npx vibe-hardening scan

30+ rules tuned for AI-generated code. Fingerprints which tool
produced your repo and weights rules. Ships a 0-100 score you can
put in your README.

Free, MIT, no account.
```
*Attach: vibe-hardening: 42/100 F badge screenshot*

---

### Tweet 4 (the technical depth — for credibility)
```
What it catches:

· secrets (OpenAI, Stripe, GitHub PAT, Supabase service_role)
· missing auth on Next.js API routes (AST, not regex)
· Supabase RLS disabled
· SQL / NoSQL / command injection patterns
· CORS wildcards, SSRF, open redirects
· npm CVEs via OSV.dev
· LLM-hallucinated packages (slopsquat targets)
```

---

### Tweet 5 (the "wow" moment)
```
Dogfood moment:

I ran it on my own side project. Found a missing-auth bug on a cron
endpoint I'd shipped to prod last week.

If my *security scanner* couldn't catch its own author's mistakes
on day one, it wasn't worth shipping.

36 noise → 1 real finding after two more fix rounds.
```
*Attach: before/after terminal screenshot*

---

### Tweet 6 (the CTA)
```
Try it yourself on any AI-coded repo:

  npx vibe-hardening scan

Site + docs: vibe-hardening.io
Source: github.com/vibe-hardening/cli

Roadmap: live secret verification (--verify pings OpenAI/Stripe/
GitHub), HTML report, Pro dashboard for teams.

Built for vibe coders. MIT forever.
```

---

### Tweet 7 (the community ask)
```
If you scan your repo and it:

· finds something silly (false positive) 
· misses something obvious (false negative)

Tell me. Real data beats synthetic. I'll fix it fast.

#buildinpublic #vibecoding
```

---

## Individual one-off posts (drip over the week after launch)

### Post A — social proof once someone shares
```
Someone scanned their shadcn-based SaaS with vibe-hardening:

> "Found two API keys I forgot to move to env. Plus a missing RLS
> policy I've been staring at for a month."

This is the job.
```

### Post B — technical flex
```
vibe-hardening's AST scanner understands:

· auth() / getServerSession() / requireAuth()
· supabase.auth.getUser() including createServerClient(...).auth.*
· (x as SupabaseClient).auth.getUser()
· x['auth']['getUser']()
· Bearer ${process.env.CRON_SECRET} pattern
· withAuth() HOC wrappers

Not just regex. It tries.
```

### Post C — cultural anchor
```
Vibe coded.
Vibe hardened.®

Ship soft. Ship secure. You can have both.
(npx vibe-hardening scan)
```

### Post D — useful data point
```
From scanning 50 repos:

top 3 reasons v0 exports leak —

1. NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local
2. app/api/admin/* handlers without auth()
3. CORS: '*' with credentials: true

If you used v0 in the last month, you have at least one.
```

### Post E — reply magnet
```
Curious:

What's the worst thing an AI coding tool has ever shipped in your
repo?

Reply with your best horror story and I'll run vibe-hardening on
it for you.
```

---

## Engagement targets to tag / reply to (not @-mention aggressively)

- @rauchg (Vercel CEO) — subtle mention of v0 findings
- @shadcn (UI system author) — tag on shadcn-related posts
- @leerob (Next.js DevRel) — Next.js technical posts
- @swyx (AI DX expert) — the AI angle posts
- @theo (T3, Next community) — technical depth posts
- @levelsio (indie hacker icon) — launch day general tag

**Rule**: tag them ONCE in a thread where they're actually relevant. Don't spray.
