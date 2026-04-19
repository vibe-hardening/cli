# Friend / beta-tester email

**Send**: right now (pre-launch, get real dogfood feedback before PH)
**Target count**: 10-15 friends / dev contacts who've built something recently

---

## Subject line (pick one)

- `built something, need 5 min of your eyeballs`
- `one npx command, tell me what's dumb`
- `can you run this on a repo you shipped?`

---

## Body (casual version)

```
Hey,

Built a thing over the past week — vibe-hardening, a CLI that scans
AI-coded repos for security bugs. Public launch is 2026-05-13 but
I need a round of dogfood before then.

Ask:

Run this in any repo you built with v0 / Lovable / Bolt / Cursor /
Claude Code / Replit Agent / Windsurf (or just a regular Next.js
side project):

    npx vibe-hardening scan

Then tell me:

1. Did it find something real? (a screenshot is gold)
2. Did it scream about something obviously wrong?
3. Is the output understandable?

Also: what rule is missing that you'd want?

Doesn't upload anything — all checks are local. Takes about 5
seconds. MIT, no account. Site is https://vibe-hardening.io.

Reply with a screenshot or just "noisy" / "useful" / "broken". All
three help.

Thanks 🙏
```

---

## Body (formal version — for senior colleagues / mentors)

```
Hi [Name],

Short pre-launch ask. I've built a security scanner aimed at the
vibe-coding community and I'm 3 weeks out from a Product Hunt
launch. I need real-repo feedback before then — the rules are
tested against synthetic fixtures but synthetic fixtures always lie.

Ten minutes of your time would look like:

1. Pick any JS / TS repo you've worked on in the last 6 months,
   preferably one with AI-assisted code.
2. Run:
      npx vibe-hardening scan
3. Send me back one of:
   - A screenshot of the findings
   - "Nothing found" (also useful)
   - A specific thing that looked wrong

No data leaves your machine. Scanner is fully local — MIT licensed,
source at github.com/vibe-hardening/cli.

Happy to send back a write-up of the findings and recommendations
for your repo as a thank-you.

Best,
[You]
```

---

## Follow-up — 1 week later if no reply

```
Quick bump — if you haven't had time for the vibe-hardening scan
request yet, no worries. If you can spare 30 seconds just to run
it once and paste me the last 10 lines of output, that's already
gold. MIT, local-only, npx one-shot.
```

---

## After they reply

- **Finding was real** → thank them, mention you'll credit them in
  the release notes if they want
- **Finding was noise** → fix the rule, push a new version, send
  them the version number so they can verify their feedback
  mattered
- **Broke on install** → debug, send back fixed version within 24h

## Target list (fill in your own)

- Dev friends from your current job: ___, ___, ___
- Open-source contributors you know: ___, ___
- Former colleagues now at AI companies: ___
- Indie hacker contacts: ___
- Bootcamp / alumni network if relevant: ___

Aim for 10 real replies. 20% reply rate is normal for cold friend
asks so target 50 sends.
