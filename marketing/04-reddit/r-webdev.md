# r/webdev — General web dev

**Subreddit**: https://www.reddit.com/r/webdev/
**Subscribers**: 2.3M
**Tone**: broader, less niche. Lead with pain, not technology.

---

## Title

```
Built a free tool to catch the security bugs AI coding tools leave in your repo
```

## Body

```
If you've ever used v0, Lovable, Bolt, Cursor, Claude Code, Replit
Agent or Windsurf to scaffold a project, you probably have one of
these sitting in your codebase right now:

- An API key you forgot to move to env
- Supabase `service_role` token leaking through a client component
- A /api/ route with no authentication at all
- An `.env.local` that got committed "temporarily"
- CORS set to `*` because the generator told you to

**vibe-hardening** is a CLI I built over a weekend to catch these
without any setup:

    npx vibe-hardening scan

Free, MIT licensed, no account. Runs in ~5 seconds on a typical
repo and outputs a 0-100 security score plus a readable list of
what to fix.

https://vibe-hardening.io
https://github.com/vibe-hardening/cli

Would love for r/webdev to run it on a weekend project and tell me:

1. Did it find something real you'd missed?
2. Did it scream about something that isn't actually a problem?

I've pruned false positives down from "very noisy" to "mostly real"
by scanning my own repos, but real data beats my synthetic tests
every time.
```

---

## Reply templates

**"Why is this better than GitHub's secret scanner?"**
```
It's complementary. GitHub catches secrets in commits after you push.
This runs locally before you push, and also catches the things
GitHub doesn't — missing auth, CORS mistakes, RLS disabled, etc.

Use both.
```

**"What about WordPress / PHP?"**
```
JS/TS only right now. Rules are written for the Next.js / Node
ecosystem because that's where AI coding tools have the biggest
footprint. Open to Python next. PHP further out — let me know if
it's a real need.
```

**"Does it send my code anywhere?"**
```
CLI runs locally. Two optional network calls:
- OSV.dev lookup for CVEs on package-lock.json
- npm registry check to detect hallucinated dependencies

Both are just package-name lookups, no source code uploaded. Skip
both with `--offline`.
```
