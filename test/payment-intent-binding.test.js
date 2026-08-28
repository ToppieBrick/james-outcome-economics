'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentIntent } = require('../benchmark/validate-payment-intent');

const nowMs = Date.parse('2026-08-28T05:20:00.000Z');
const endpoint = 'https://provider.example/search';
const payTo = '0x1111111111111111111111111111111111111111';

function intent(overrides = {}) {
  return {
    taskId: 'search-001',
    provider: 'example-provider',
    endpoint,
    payTo,
    network: 'base',
    asset: 'USDC',
    liveQuoteUsd: 0.01,
    quotedAt: '2026-08-28T05:19:00.000Z',
    expiresAt: '2026-08-28T05:30:00.000Z',
    nonce: 'nonce-binding-001',
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    nowMs,
    expectedTaskId: 'search-001',
    expectedProvider: 'example-provider',
    expectedEndpoint: endpoint,
    expectedPayTo: payTo,
    allowedRecipients: [payTo],
    allowedEndpoints: [endpoint],
    usedNonces: new Set(),
    sessionSpendUsd: 0,
    paidCalls: 0,
    ...overrides
  };
}

test('accepts intent bound to independently selected execution context', () => {
  const result = validatePaymentIntent(intent(), context());
  assert.equal(result.ok, true);
});

test('rejects task substitution even when all payment fields are allowlisted', () => {
  const result = validatePaymentIntent(intent({ taskId: 'search-999' }), context());
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('task_binding_mismatch'));
});

test('rejects provider substitution even when endpoint and recipient are allowlisted', () => {
  const result = validatePaymentIntent(intent({ provider: 'other-provider' }), context());
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('provider_binding_mismatch'));
});

test('rejects endpoint substitution within a broader session allowlist', () => {
  const alternate = 'https://provider.example/alternate';
  const result = validatePaymentIntent(
    intent({ endpoint: alternate }),
    context({ allowedEndpoints: [endpoint, alternate] })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('endpoint_binding_mismatch'));
});

test('rejects recipient substitution within a broader session allowlist', () => {
  const alternate = '0x2222222222222222222222222222222222222222';
  const result = validatePaymentIntent(
    intent({ payTo: alternate }),
    context({ allowedRecipients: [payTo, alternate] })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('recipient_binding_mismatch'));
});
