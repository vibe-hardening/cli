# r/cursor — Platform-specific

**Subreddit**: https://www.reddit.com/r/cursor/
**Subscribers**: 25k+ but growing fast, highly engaged
**Tone**: tool-friendly, Cursor users are builders who already ship

---

## Title

```
Scanned 20 Cursor-generated Next.js projects — here's what Cursor tends to miss
```

## Body

```
I built a security scanner that fingerprints which AI tool
generated a repo. Scanned 20 Cursor-written Next.js apps I pulled
from GitHub (public, recent commits).

Top things Cursor specifically ships:

1. **Missing auth on route handlers** (14/20)
   Cursor generates the handler body but doesn't always plumb auth
   in. `export async function POST()` with no `await auth()` call.

2. **`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in .env.local** (6/20)
   The autocomplete-happy path: user types "SUPABASE" and Cursor
   offers the whole constellation of env vars. Service role sneaks in.

3. **`// TODO: add auth` comments** (11/20)
   Cursor writes the todo, nobody comes back.

4. **Hallucinated packages** (3/20)
   One repo had `react-auth-hooks-supabase` in package.json — doesn't
   exist on npm. Cursor invented it and the human ran `npm install`
   which 404'd but the name sat in package.json.

Tool: **vibe-hardening**

    npx vibe-hardening scan

MIT, no account, 5 seconds on a typical repo. Fingerprint detection
is in `.cursor/`, `.cursorrules`, and `.cursor/rules/*.mdc`.

Site: https://vibe-hardening.io
Source: https://github.com/vibe-hardening/cli

## What I'd love from r/cursor

Run it on a project you Cursor-coded and reply with:

- Did it catch something real?
- Anything that looks obviously wrong (false positive)?
- What Cursor-specific pattern am I missing?

I'll tune the Cursor-specific rule weights based on what you report.
```

---

## Reply templates

**"Does it work if I have .cursorrules?"**
```
Yes — .cursorrules and .cursor/rules/*.mdc are the primary
fingerprint signals. If both are present it flags platform:cursor
with high confidence.
```

**"Can it integrate with the Cursor agent?"**
```
Not yet. But `vibe-hardening scan --format json` outputs a
structured report your agent could read and then fix. That's
literally the v0.2 use case.
```
