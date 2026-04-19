# Launch Day Runbook — 2026-05-13 (Wednesday)

Single source of truth for the 24 hours around launch. Times in Taipei (UTC+8) with Pacific (UTC-7) in parentheses — the decisive zone for HN / PH algorithms.

---

## T-1 week (2026-05-06)

- [ ] Twitter / X account `@vibehardening` exists, 2-3 build-in-public posts already published
- [ ] Formspree waitlist has 30+ signups (personal outreach gets you there)
- [ ] HTML report samples ready for 3 of your own repos (lineage-auction, marketing-site, rental-saas)
- [ ] PH upcoming page live, hunter confirmed (or plan to self-hunt)
- [ ] Show HN draft saved locally (see 01-show-hn.md)
- [ ] Reddit 5 posts drafted, saved as reddit drafts
- [ ] 5 KOL DMs drafted, ready to send T-1 day
- [ ] Dev.to article drafted, saved (publish launch day +2)

## T-1 day (2026-05-12 Tuesday)

Morning (Taipei):
- [ ] Send 5 KOL cold DMs
- [ ] Post LinkedIn "tomorrow we launch" soft tease
- [ ] Verify npm latest tag is the version you'll launch with

Evening:
- [ ] Go to bed early. Launch day is long.

## Launch day (2026-05-13 Wednesday)

### 00:00 Taipei (09:00 PT day-before → 16:00 PT same day for AM US / 09:00 BST Europe)

Actual plan based on PH / HN timing:

### 15:00 Taipei (00:00 PT) — PH opens

- [ ] Submit to Product Hunt with the day-of post copy from `02-product-hunt.md`
- [ ] Maker comment pinned within 5 min of submission
- [ ] Post Twitter thread (`03-twitter-thread.md`), all 7 tweets posted in sequence 30-60 sec apart
- [ ] Share PH link from Twitter to LinkedIn + Facebook dev groups (if you use them)

### 17:00 Taipei (02:00 PT) — First engagement push

- [ ] Ping 3-5 closest friends personally with PH link
- [ ] Reply to every PH comment within 15 min (for the first 2 hours)
- [ ] Monitor Twitter mentions, reply fast, quote-tweet any interesting reactions

### 21:00 Taipei (06:00 PT) — HN Show HN window opens

- [ ] Submit Show HN (`01-show-hn.md`)
- [ ] Reply to every top-level HN comment within 15 min
- [ ] Do NOT ask for upvotes
- [ ] Do NOT submit-and-run — HN algorithm weights replies heavily in the first hour

### 23:00 Taipei (08:00 PT) — Reddit rollout

Post one at a time, 30-60 min apart, in this order:

1. r/SideProject (launch-day fit)
2. r/nextjs (technical crowd)
3. r/cursor (platform-specific)
4. r/webdev (broader)
5. r/indiehackers (build story)

Don't cross-post the same text. Use `04-reddit/*.md` which are each
tuned.

### 01:00 Taipei (10:00 PT day+1) — Sleep

You've been awake 10+ hours on adrenaline. Sleep. Queue up Twitter
replies via TweetDeck if you have to.

### 08:00 Taipei (17:00 PT day+1) — Morning check

- [ ] Triage overnight HN / PH / Reddit comments
- [ ] Reply to KOL DMs that got a response
- [ ] Post-launch Twitter update ("X hours in, we're at Y HN / Z PH position")
- [ ] Fix any bugs people reported overnight (24h SLA is a real retention signal)

---

## Day 2 (2026-05-14)

- [ ] Publish Dev.to article (uses the data Reddit / HN will have generated)
- [ ] Post LinkedIn launch recap
- [ ] Respond to every Reddit post comment
- [ ] If PH #1: tweet about it. If PH top 5: tweet about it. If nothing: tweet "day 2 retro" anyway
- [ ] Consolidate feedback into GitHub issues — every user who filed
      a bug gets credited in the release notes

## Days 3-7 — the long tail

- Reply window closes at day 3 for HN/PH. After that, focus on bugs
  filed against the repo.
- Ship a patch release (`0.0.4-preview.1` or `0.0.5-preview.0`)
  within 7 days incorporating user feedback — signals to repeat
  users the project is alive.
- Write a "7-day retro" blog post or thread. Include numbers
  (signups, scans run, stars, issues filed). Numbers drive
  credibility more than narrative.

---

## Metrics to track

Daily for the launch week:

- GitHub stars
- npm weekly downloads (`npm view vibe-hardening`)
- Formspree waitlist signups
- PH rank + upvote count
- HN rank + comment count
- Twitter impressions on the launch thread
- Issues / PRs filed

Save these in a simple Google Sheet. Post-launch retrospective
needs them.

---

## Failure modes (things to avoid)

- **Asking for upvotes anywhere** — both HN and PH can shadowban for this
- **Posting the same Reddit text in 5 subs** — Reddit marks cross-posts as spam
- **Replying late** — algorithm penalty is severe
- **Over-promising** — don't say "detects any bug" when it detects 30 specific patterns
- **Deleting negative comments** — screenshots travel. Engage honestly.
- **Launching broken** — test `npx vibe-hardening@latest scan` on a fresh machine the night before
