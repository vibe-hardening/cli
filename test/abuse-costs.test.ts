import { describe, it, expect } from 'vitest';
import { ABUSE_COSTS, abuseCostFor } from '../src/reporters/abuse-costs.js';
import type { VerifierKind } from '../src/verifiers/index.js';

describe('abuse-costs: data integrity', () => {
  it('has an entry for every VerifierKind', () => {
    const kinds: VerifierKind[] = [
      'openai',
      'anthropic',
      'stripe',
      'github-pat',
      'slack',
      'sendgrid',
      'twilio',
      'notion',
    ];
    for (const k of kinds) {
      expect(ABUSE_COSTS[k], `missing abuse cost for ${k}`).toBeTruthy();
      expect(ABUSE_COSTS[k].label).toBeTruthy();
      expect(ABUSE_COSTS[k].vector).toBeTruthy();
      expect(ABUSE_COSTS[k].source).toBeTruthy();
    }
  });

  it('all cost labels are short enough for inline display (< 30 chars)', () => {
    for (const [kind, cost] of Object.entries(ABUSE_COSTS)) {
      expect(cost.label.length, `${kind} label too long`).toBeLessThan(30);
    }
  });

  it('no label or vector contains control characters', () => {
    // eslint-disable-next-line no-control-regex
    const ansi = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x1B]/;
    for (const [kind, cost] of Object.entries(ABUSE_COSTS)) {
      expect(ansi.test(cost.label), `${kind} label has control char`).toBe(
        false,
      );
      expect(ansi.test(cost.vector), `${kind} vector has control char`).toBe(
        false,
      );
    }
  });

  it('every entry has a citation', () => {
    for (const [kind, cost] of Object.entries(ABUSE_COSTS)) {
      expect(
        cost.source.length,
        `${kind} source empty`,
      ).toBeGreaterThan(5);
    }
  });
});

describe('abuse-costs: helper', () => {
  it('abuseCostFor returns the entry for known kinds', () => {
    expect(abuseCostFor('openai')).toEqual(ABUSE_COSTS.openai);
    expect(abuseCostFor('stripe')).toEqual(ABUSE_COSTS.stripe);
  });

  it('abuseCostFor returns undefined for unknown kinds', () => {
    expect(abuseCostFor('not-a-real-provider')).toBeUndefined();
    expect(abuseCostFor('')).toBeUndefined();
  });
});
