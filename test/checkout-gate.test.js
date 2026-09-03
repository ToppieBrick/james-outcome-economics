const test = require('node:test');
const assert = require('node:assert/strict');
const { approvalState, APPROVED } = require('../api/checkout');

test('checkout fails closed with no environment configuration', () => {
  const state = approvalState({});
  assert.equal(state.approved, false);
  assert.equal(state.status, 'BLOCKED');
  assert.equal(state.approvalDigestPresent, false);
  assert.equal(state.checkoutConfigured, false);
});

test('status alone cannot unlock checkout', () => {
  const state = approvalState({ QA_MARKET_STATUS: APPROVED });
  assert.equal(state.approved, false);
});

test('approval digest alone cannot unlock checkout', () => {
  const state = approvalState({
    QA_MARKET_STATUS: APPROVED,
    QA_APPROVAL_RECORD_SHA256: 'a'.repeat(64),
  });
  assert.equal(state.approved, false);
});

test('non-Stripe or insecure checkout URL cannot unlock checkout', () => {
  const base = {
    QA_MARKET_STATUS: APPROVED,
    QA_APPROVAL_RECORD_SHA256: 'b'.repeat(64),
  };
  assert.equal(approvalState({ ...base, STRIPE_CHECKOUT_URL: 'http://buy.stripe.com/test' }).approved, false);
  assert.equal(approvalState({ ...base, STRIPE_CHECKOUT_URL: 'https://example.com/pay' }).approved, false);
});

test('checkout unlocks only with approval status, evidence digest and Stripe payment link', () => {
  const state = approvalState({
    QA_MARKET_STATUS: APPROVED,
    QA_APPROVAL_RECORD_SHA256: 'c'.repeat(64),
    STRIPE_CHECKOUT_URL: 'https://buy.stripe.com/test_link',
  });
  assert.equal(state.approved, true);
  assert.equal(state.reason, 'limited_pilot_approved');
});
