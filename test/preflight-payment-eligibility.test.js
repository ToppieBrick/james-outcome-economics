'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePreflightQuote } = require('../benchmark/validate-preflight-quote');

const NOW = Date.parse('2026-08-28T08:00:00.000Z');

function base(overrides = {}) {
  return {
    endpoint: 'https://x402.tavily.com/search',
    method: 'POST',
    httpStatus: 402,
    protocolVersion: 2,
    liveQuoteUsd: 0.01,
    quoteObservedAt: '2026-08-28T07:59:30.000Z',
    nowMs: NOW,
    paymentCandidate: {
      amount: '10000',
      network: 'eip155:8453',
      asset: 'USDC',
      payTo: '0x1234567890123456789012345678901234567890',
      scheme: 'exact',
    },
    ...overrides,
  };
}

test('accepts a fresh Base USDC x402 v2 quote within cap', () => {
  const result = validatePreflightQuote(base());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('rejects wrong network even when HTTP 402 and price are valid', () => {
  const result = validatePreflightQuote(base({ paymentCandidate: { ...base().paymentCandidate, network: 'solana' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('network_not_approved'));
});

test('rejects wrong asset', () => {
  const result = validatePreflightQuote(base({ paymentCandidate: { ...base().paymentCandidate, asset: 'USDT' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('asset_not_approved'));
});

test('rejects missing recipient', () => {
  const result = validatePreflightQuote(base({ paymentCandidate: { ...base().paymentCandidate, payTo: null } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('recipient_missing'));
});

test('rejects stale quote', () => {
  const result = validatePreflightQuote(base({ quoteObservedAt: '2026-08-28T07:40:00.000Z' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('stale_quote'));
});

test('rejects malformed or legacy payment challenge', () => {
  const result = validatePreflightQuote(base({ protocolVersion: 1 }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('x402_v2_required'));
});

test('rejects quote over per-payment cap', () => {
  const result = validatePreflightQuote(base({ liveQuoteUsd: 0.03 }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('payment_over_cap'));
});
