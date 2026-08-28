'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentIntent } = require('../benchmark/validate-payment-intent');

const nowMs = Date.parse('2026-08-28T03:50:00.000Z');
const endpoint = 'https://provider.example/search';
const payTo = '0x1111111111111111111111111111111111111111';

function validIntent(overrides = {}) {
  return {
    taskId: 'search-001',
    provider: 'example-provider',
    endpoint,
    payTo,
    network: 'base',
    asset: 'USDC',
    liveQuoteUsd: 0.01,
    quotedAt: '2026-08-28T03:49:00.000Z',
    expiresAt: '2026-08-28T04:00:00.000Z',
    nonce: 'nonce-001',
    ...overrides
  };
}

const context = {
  nowMs,
  allowedRecipients: [payTo],
  allowedEndpoints: [endpoint],
  usedNonces: new Set(),
  sessionSpendUsd: 0,
  paidCalls: 0
};

test('accepts a policy-compliant payment intent', () => {
  const result = validatePaymentIntent(validIntent(), context);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('rejects stale quote', () => {
  const result = validatePaymentIntent(validIntent({ quotedAt: '2026-08-28T03:30:00.000Z' }), context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('stale_quote'));
});

test('rejects replayed nonce', () => {
  const result = validatePaymentIntent(validIntent(), { ...context, usedNonces: new Set(['nonce-001']) });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('replayed_nonce'));
});

test('rejects unknown recipient', () => {
  const result = validatePaymentIntent(validIntent({ payTo: '0x2222222222222222222222222222222222222222' }), context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('recipient_not_allowlisted'));
});

test('rejects over-limit payment', () => {
  const result = validatePaymentIntent(validIntent({ liveQuoteUsd: 0.03 }), context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('payment_over_cap'));
});

test('rejects expired payment requirement', () => {
  const result = validatePaymentIntent(validIntent({ expiresAt: '2026-08-28T03:49:59.000Z' }), context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('expired_payment_requirement'));
});
