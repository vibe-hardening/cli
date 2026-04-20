import type { VerifierKind } from '../verifiers/index.js';

/**
 * Estimated financial impact when a leaked credential is actively
 * abused in the wild. Shown next to LIVE verify results in console +
 * HTML reports to make the abstract risk concrete.
 *
 *   ╔═══════════════════════════════════════════════════════════════╗
 *   ║  IMPORTANT: these are ORDER-OF-MAGNITUDE ESTIMATES, not       ║
 *   ║  published medians. Most providers do not publish per-        ║
 *   ║  incident cost statistics. The numbers below are derived      ║
 *   ║  from:                                                         ║
 *   ║    1. Public abuse policies + pricing pages                   ║
 *   ║    2. Community incident reports (GitHub Security Lab,        ║
 *   ║       truffle.security, Verizon DBIR)                          ║
 *   ║    3. Order-of-magnitude arithmetic from observed abuse       ║
 *   ║       windows × resource cost                                  ║
 *   ║  Treat the figure as "how bad could this get — roughly" not   ║
 *   ║  as a forecast or insurance underwriter's quote.              ║
 *   ╚═══════════════════════════════════════════════════════════════╝
 *
 * PRs with better-sourced numbers welcome. Each `source` field names
 * what the figure is actually based on — no citations claim a
 * document that doesn't exist.
 */
export interface AbuseCost {
  /** Short phrase shown inline. Either a specific dollar amount, a
   *  dollar range, or a category word. Under 30 chars. */
  label: string;
  /** One-phrase descriptor of the dominant abuse pattern. */
  vector: string;
  /** What the estimate is based on. Never a fabricated publication. */
  source: string;
}

export const ABUSE_COSTS: Record<VerifierKind, AbuseCost> = {
  openai: {
    label: '$2,000–$5,000/mo',
    vector: 'GPU inference resale via stolen key',
    source:
      'estimate: ~30-day typical abuse window × ~$80/day resold inference capacity. No published OpenAI per-incident median.',
  },
  anthropic: {
    label: '$1,500–$4,000/mo',
    vector: 'Claude API resale',
    source:
      'estimate: Anthropic has no public abuse stats; projected from pricing + OpenAI-style resale patterns.',
  },
  stripe: {
    label: '$5,000–$50,000/incident',
    vector: 'fraudulent charges + dispute chargebacks',
    source:
      'estimate: wide range depending on time-to-detect. Stripe publishes aggregate fraud stats but no per-incident median for leaked-key abuse.',
  },
  'github-pat': {
    label: '$10,000–$500,000/incident',
    vector: 'supply-chain commit → downstream compromise',
    source:
      'estimate: CISA advisory AA23-025A and public incidents (Codecov, SolarWinds tangent, Dropbox 2022) show wide blast-radius.',
  },
  slack: {
    label: '$1,000–$20,000/incident',
    vector: 'data exfiltration + internal phishing pivot',
    source:
      'estimate: Verizon DBIR 2024 SaaS credential breach category median (not Slack-specific).',
  },
  sendgrid: {
    label: '$200–$2,000/day',
    vector: 'email spam burst, domain reputation loss',
    source:
      'estimate: SendGrid abuse thresholds + typical IP warm-up cost to recover sender reputation post-blacklist.',
  },
  notion: {
    label: '$5,000–$500,000/incident',
    vector: 'NDA / strategy docs / customer data leak',
    source:
      'estimate: range spans internal leak to GDPR-actionable PII exposure. No Notion-specific public stat.',
  },
  twilio: {
    label: '$2,000–$50,000/incident',
    vector: 'international SMS pumping fraud',
    source:
      'estimate: Twilio publishes SMS pumping guidance but no per-incident median. Range reflects observed account abuse before detection.',
  },
};

/**
 * Returns the AbuseCost entry for a verifier kind, or undefined
 * if the kind is unknown. Callers should render the cost inline
 * only when the verify result is `status: 'live'`.
 *
 * The `Record<VerifierKind, AbuseCost>` type on ABUSE_COSTS means
 * TypeScript will fail at compile time if a new VerifierKind is
 * added to the union without a corresponding entry here — the
 * runtime `kind in ABUSE_COSTS` check is just defensive for callers
 * passing arbitrary strings (e.g. from an older verify payload).
 */
export function abuseCostFor(kind: string): AbuseCost | undefined {
  if (kind in ABUSE_COSTS) {
    return ABUSE_COSTS[kind as VerifierKind];
  }
  return undefined;
}
