# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email vulnerability reports to **angletech2026@gmail.com** with:

- A short description of the issue and potential impact.
- Minimal steps to reproduce (a failing test case or a small repo that triggers the bug is ideal).
- Your GitHub / npm handle if you want credit in the fix commit.

You'll get an acknowledgement within **72 hours**. Fixes land in a patch release within **7 days** for high / critical issues.

## In Scope

- The `vibe-hardening` npm package (CLI binary + library surface).
- Rules in `src/rules/` that produce incorrect findings (false positive or false negative on realistic code).
- Engine bugs in `src/engines/` that crash, hang, or leak data.
- Anything in the landing page at [vibe-hardening.io](https://vibe-hardening.io).

## Out of Scope

- DoS against the public Formspree endpoint — that's a Formspree concern.
- Self-XSS from running `vibe-hardening scan` on adversarial source trees (the scanner does not execute scanned code).
- Vulnerabilities in direct dependencies — report those upstream. We subscribe to advisories and will bump deps.

## Supply Chain

- All releases are published from `angletech2026` on npm.
- Git tags are signed from 0.1.0 onwards.
- Tarball contents are kept minimal; see `files` in `package.json`.
- Token with `Bypass 2FA` is used **per release** and revoked immediately after. Long-lived publish tokens are not used.

## Keep in Mind

vibe-hardening is a preview release. The ruleset is still evolving and **no scanner catches every vulnerability**. Treat its output as a prioritisation aid, not a ship / no-ship gate.
