# Comparison Table — vibe-hardening vs competitors

Use this in:
- Landing page "why vibe-hardening" section
- Dev.to article
- Reddit comments when someone asks "why not X"
- Documentation

---

## Full comparison

| | vibe-hardening | vibe-guard | gitleaks | semgrep | snyk | socket.dev |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **One-command zero-config** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Free & MIT** | ✅ | ✅ | ✅ | Partial | ❌ | ❌ |
| **AI-tool fingerprint** | ✅ 8 tools | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Secret detection** | 10 rules | ~28 rules | ✅ (focus) | ✅ | ✅ | Partial |
| **AST-based auth check** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Supabase RLS specific** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **JWT payload decode** | ✅ | ❌ | Partial | ❌ | ❌ | ❌ |
| **Dependency CVE** | ✅ OSV.dev | ❌ | ❌ | ❌ | ✅ | ✅ |
| **LLM hallucination** | ✅ | ❌ | ❌ | ❌ | ❌ | Partial |
| **Platform-tuned rules** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Vercel Cron / bearer auth aware** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **HTML report** | ✅ | ❌ | ❌ | ❌ (SaaS only) | ✅ | ✅ |
| **0-100 Score** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **README badge** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Inline suppression directive** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Runs fully local (no cloud)** | ✅ | ✅ | ✅ | ✅ | ❌ (cloud) | ❌ (cloud) |
| **npx / no install** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Scan time (100-file repo)** | ~1s | ~1s | ~2s | ~10s | ~30s | ~30s |
| **Account required** | ❌ | ❌ | ❌ | Optional | ✅ | ✅ |

---

## Honest trade-offs

### vs `vibe-guard`
- Our edge: AST auth detection, Supabase RLS, OSV CVE, LLM hallucination,
  score/badge, HTML report, Bearer-token recognition, platform fingerprint.
- Their edge: launched 6 months earlier, GitHub stars we don't have
  yet. Their ruleset is also regex-based and they might catch
  patterns we miss — read their repo before assuming we cover more.

### vs `semgrep`
- Our edge: zero-config, 5 seconds, AI-platform tuning.
- Their edge: infinitely more flexible — you can write any rule you
  want. If you're a security team, use semgrep. If you're a vibe
  coder, use us.

### vs `gitleaks`
- Our edge: broader (auth / RLS / injection / CORS not just secrets).
- Their edge: deeper secret scanning, mature rule set that's been in
  production for years, plus pre-commit hook integration.
- We fork some of their secret regex with attribution. They were
  first.

### vs `snyk`
- Our edge: free, local, no account.
- Their edge: enterprise-grade, SCA, IaC scanning, compliance
  reports, SSO — if you have a security budget, this is the tool.

### vs `socket.dev`
- Our edge: broader finding types; they focus on supply chain.
- Their edge: much deeper supply chain analysis (malware detection,
  typo-squat, install-time behaviour). If supply chain is your
  primary worry, use them.

---

## When to use each

```
┌────────────────────────────────────────────────────────┐
│  Building a vibe-coded app this weekend?               │
│  → vibe-hardening (zero config, 5s)                    │
├────────────────────────────────────────────────────────┤
│  Running a security team?                              │
│  → semgrep + gitleaks + snyk (they overlap but cover) │
├────────────────────────────────────────────────────────┤
│  Enterprise compliance?                                │
│  → snyk + socket.dev                                   │
├────────────────────────────────────────────────────────┤
│  Deep supply chain worry?                              │
│  → socket.dev                                          │
├────────────────────────────────────────────────────────┤
│  "I just want to know if my repo is obviously broken"  │
│  → vibe-hardening                                      │
└────────────────────────────────────────────────────────┘
```

---

## Rules-of-thumb for communicating this

Don't trash competitors — the security community knows them, respects them, and will read bad-mouthing as insecurity. Instead, position by use case: we're the tool for a specific persona (vibe coder / indie hacker / weekend project), not a replacement for enterprise security stacks.
