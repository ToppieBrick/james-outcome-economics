'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { X402PolicyGateway } = require('../lib/x402-policy-gateway');

function makeHarness(overrides = {}) {
  const audit = [];
  const signerCalls = [];
  const signerAdapter = overrides.signerAdapter || {
    async signPaymentIntent(intent) {
      signerCalls.push(intent);
      return { signatureRequestId: `sig-${signerCalls.length}`, paymentEnvelope: 'opaque-envelope' };
    }
  };
  const auditSink = overrides.auditSink || { append: (entry) => audit.push(entry) };
  const policy = {
    version: 'test-v1',
    allowedProviders: ['tavily'],
    allowedDomains: ['api.tavily.com'],
    pinnedRecipients: { tavily: '0xabc' },
    frozenRequestHash: 'frozen-hash',
    network: 'base',
    asset: 'USDC',
    maxTransactionAud: 25,
    maxDailyAud: 40,
    ...overrides.policy
  };
  const gateway = new X402PolicyGateway({ policy, signerAdapter, auditSink });
  const valid = {
    providerId: 'tavily',
    domain: 'api.tavily.com',
    requestHash: 'frozen-hash',
    challenge: { id: 'challenge-1', recipient: '0xabc', network: 'base', asset: 'USDC', amount: '0.01' },
    amountAud: 1,
    runId: 'run-1',
    callId: 'call-1'
  };
  return { gateway, audit, signerCalls, valid };
}

test('C01 exposes only purpose-specific signer method and returns no key material', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  assert.equal(typeof gateway.signerAdapter.signPaymentIntent, 'function');
  assert.equal(gateway.signerAdapter.sign, undefined);
  const result = await gateway.authorizeAndSign(valid);
  assert.equal(result.allowed, true);
  assert.equal(Object.hasOwn(result, 'rawPrivateKey'), false);
  assert.equal(Object.hasOwn(result, 'seedPhrase'), false);
  assert.equal(signerCalls.length, 1);
});

test('C02 rejects arbitrary recipient before signing', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, challenge: { ...valid.challenge, recipient: '0xevil' } }), /RECIPIENT_MISMATCH/);
  assert.equal(signerCalls.length, 0);
});

test('C03 rejects unapproved provider/domain before signing', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, providerId: 'evil' }), /PROVIDER_NOT_ALLOWED/);
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, domain: 'evil.example' }), /DOMAIN_NOT_ALLOWED/);
  assert.equal(signerCalls.length, 0);
});

test('C04 rejects wrong network before signing', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, challenge: { ...valid.challenge, network: 'ethereum' } }), /NETWORK_NOT_ALLOWED/);
  assert.equal(signerCalls.length, 0);
});

test('C05 rejects wrong asset before signing', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, challenge: { ...valid.challenge, asset: 'ETH' } }), /ASSET_NOT_ALLOWED/);
  assert.equal(signerCalls.length, 0);
});

test('C06 rejects amount over transaction cap before signing', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, amountAud: 25.01 }), /TRANSACTION_CAP_EXCEEDED/);
  assert.equal(signerCalls.length, 0);
});

test('C07 reserves exposure and rejects aggregate amount above daily cap', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  const first = await gateway.authorizeAndSign({ ...valid, amountAud: 25 });
  gateway.recordSettlement(first.reservationId, 'settled', 'receipt-1');
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, callId: 'call-2', challenge: { ...valid.challenge, id: 'challenge-2' }, amountAud: 16 }), /DAILY_CAP_EXCEEDED/);
  assert.equal(signerCalls.length, 1);
});

test('C08 duplicate intent cannot create a second payment', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await gateway.authorizeAndSign(valid);
  await assert.rejects(() => gateway.authorizeAndSign(valid), /REPLAY_DENY/);
  assert.equal(signerCalls.length, 1);
});

test('C09 concurrent authorization fails closed', async () => {
  let release;
  const blocker = new Promise((resolve) => { release = resolve; });
  const signerAdapter = {
    async signPaymentIntent() {
      await blocker;
      return { signatureRequestId: 'sig-1', paymentEnvelope: 'opaque' };
    }
  };
  const { gateway, valid } = makeHarness({ signerAdapter });
  const first = gateway.authorizeAndSign(valid);
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, callId: 'call-2', challenge: { ...valid.challenge, id: 'challenge-2' } }), /CONCURRENT_POLICY_EVALUATION_DENY/);
  release();
  await first;
});

test('C10 signer/timeout ambiguity retains reserved exposure and is not automatically retried', async () => {
  const signerAdapter = { async signPaymentIntent() { throw new Error('timeout'); } };
  const { gateway, valid } = makeHarness({ signerAdapter });
  await assert.rejects(() => gateway.authorizeAndSign(valid), /SIGNER_FAILURE_RESERVED/);
  assert.equal(gateway.exposureAud(), 1);
});

test('C11 policy is frozen against mutation from caller', async () => {
  const { gateway, valid } = makeHarness();
  assert.equal(Object.isFrozen(gateway.policy), true);
  assert.equal(Object.isFrozen(gateway.policy.allowedProviders), true);
  assert.throws(() => { gateway.policy.allowedProviders.push('evil'); });
  const result = await gateway.authorizeAndSign(valid);
  assert.equal(result.allowed, true);
});

test('C12 audit failure denies signing', async () => {
  const auditSink = { append() { throw new Error('audit unavailable'); } };
  const { gateway, valid, signerCalls } = makeHarness({ auditSink });
  await assert.rejects(() => gateway.authorizeAndSign(valid), /AUDIT_FAILURE_DENY/);
  assert.equal(signerCalls.length, 0);
});

test('unsafe signer response containing secret material is denied and exposure remains reserved', async () => {
  const signerAdapter = { async signPaymentIntent() { return { signatureRequestId: 'sig-x', rawPrivateKey: 'should-never-exist' }; } };
  const { gateway, valid } = makeHarness({ signerAdapter });
  await assert.rejects(() => gateway.authorizeAndSign(valid), /UNSAFE_SIGNER_RESPONSE_DENY/);
  assert.equal(gateway.exposureAud(), 1);
});

test('request equivalence mismatch is denied before signing', async () => {
  const { gateway, valid, signerCalls } = makeHarness();
  await assert.rejects(() => gateway.authorizeAndSign({ ...valid, requestHash: 'changed-request' }), /REQUEST_HASH_MISMATCH/);
  assert.equal(signerCalls.length, 0);
});
