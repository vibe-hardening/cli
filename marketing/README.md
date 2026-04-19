# marketing/ — Launch Kit

Everything you need to ship vibe-hardening on 2026-05-13.

All templates are ready-to-paste. They reference specific numbers from the
142 tests / 0.0.4-preview.0 release / 8 AI tools fingerprinted / 50-repo
sample — update those if the situation changes.

## Order of operations

| # | File | When to use |
|---|---|---|
| 00 | `10-launch-day-runbook.md` | **Read first.** Minute-by-minute T-1 week through day+7 plan. |
| 01 | `01-show-hn.md` | Launch day 06:00 PT. Title, body, reply templates. |
| 02 | `02-product-hunt.md` | Launch day 00:01 PT. Maker comment + gallery spec. |
| 03 | `03-twitter-thread.md` | Launch day + drip posts for week after. |
| 04 | `04-reddit/*` | One Reddit post per subreddit. Different angle per sub. |
| 05 | `05-linkedin.md` | Launch day morning + week-after follow-up. |
| 06 | `06-kol-dm.md` | T-1 day — DM to 3-5 specific KOLs. |
| 07 | `07-friend-email.md` | **Send NOW** (pre-launch dogfood). |
| 08 | `08-comparison-table.md` | Reference material for replies / docs / landing section. |
| 09 | `09-devto-article.md` | Launch day + 2 (after PH settles, for long-tail SEO). |

## What's NOT here (yet, do yourself)

- Actual Twitter / LinkedIn / PH / Reddit account creation
- Visual assets: cover images, GIFs, screenshots, demo video
- Hunter arrangement for Product Hunt
- KOL response handling (live conversation)

## Updating these files

When you release a new version, search-and-replace in all files:

- Version number (`0.0.4-preview.0`)
- Test count (`142`)
- Rule count (`30+`)
- AI tools fingerprinted (`8`)
- Days to launch (`4 days`)

One grep, 30 seconds, all 10 files updated.

## Principles every template follows

1. **Lead with the bug, not the product.** "I scanned 50 repos, found
   X" is more compelling than "I built a scanner."
2. **Numbers beat claims.** 36 findings → 1 finding is more
   credible than "accurate."
3. **Ask for feedback, not upvotes.** Every post invites the reader
   to run the tool and reply with what's wrong. This generates
   comments (which HN and PH algorithms reward) and actual bug
   reports.
4. **Don't trash competitors.** Security community is small,
   positioning by use-case beats positioning by comparison.
5. **Reply within 15 minutes for the first 2 hours.** Sub-1-hour
   median reply time on launch day is the single biggest lever for
   HN / PH ranking.
