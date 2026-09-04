'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { X402PolicyGateway } = require('../lib/x402-policy-gateway');

const POLICY = {
  version: 'c01-c12-v1',
  allowedProviders: ['benchmark-provider'],
  allowedDomains: ['benchmark.example'],
  frozenRequestHash: 'frozen-request-hash',
  network: 'base',
  asset: 'USDC',
  pinnedRecipients: { 'benchmark-provider': '0xPINNED' },
  maxTransactionAud: 25,
  maxDailyAud: 40
};

function fixture(overrides = {}) {
  const calls = [];
  const audit = [];
  const signerAdapter = overrides.signerAdapter || {
    async signPaymentIntent(intent) {
      calls.push(intent);
      return { signatureRequestId: `sig-${calls.length}`, paymentEnvelope: 'opaque-envelope' };
    }
  };
  const auditSink = overrides.auditSink || { append(entry) { audit.push(entry); } };
  const gateway = new X402PolicyGateway({ policy: POLICY, signerAdapter, auditSink });
  const input = {
    providerId: 'benchmark-provider', domain: 'benchmark.example', requestHash: 'frozen-request-hash',
    challenge: { id: 'challenge-1', network: 'base', asset: 'USDC', recipient: '0xPINNED', amount: '1' },
    amountAud: 10, runId: 'run-1', callId: 'call-1'
  };
  return { gateway, calls, audit, input };
}

async function denied(mutator, code) {
  const f = fixture();
  const input = structuredClone(f.input);
  mutator(input, f);
  await assert.rejects(() => f.gateway.authorizeAndSign(input), new RegExp(code));
  assert.equal(f.calls.length, 0, `${code} must deny before signer invocation`);
}

test('C01 purpose-specific boundary exposes no generic key/sign/transfer primitive', () => {
  const { gateway } = fixture();
  assert.equal(typeof gateway.authorizeAndSign, 'function');
  for (const name of ['privateKey', 'seedPhrase', 'mnemonic', 'sign', 'transfer', 'exportKey']) assert.equal(gateway[name], undefined);
});

test('C02 arbitrary recipient denied before signing', () => denied(i => { i.challenge.recipient = '0xEVIL'; }, 'RECIPIENT_MISMATCH'));
test('C03 unapproved provider/domain denied before signing', async () => {
  await denied(i => { i.providerId = 'evil-provider'; }, 'PROVIDER_NOT_ALLOWED');
  await denied(i => { i.domain = 'evil.example'; }, 'DOMAIN_NOT_ALLOWED');
});
test('C04 wrong network denied before signing', () => denied(i => { i.challenge.network = 'solana'; }, 'NETWORK_NOT_ALLOWED'));
test('C05 wrong asset denied before signing', () => denied(i => { i.challenge.asset = 'ETH'; }, 'ASSET_NOT_ALLOWED'));
test('C06 per-transaction cap enforced', () => denied(i => { i.amountAud = 25.01; }, 'TRANSACTION_CAP_EXCEEDED'));

test('C07 daily exposure includes unsettled reservations and blocks > A$40', async () => {
  const f = fixture();
  await f.gateway.authorizeAndSign(f.input);
  const second = structuredClone(f.input); second.callId = 'call-2'; second.challenge.id = 'challenge-2'; second.amountAud = 25;
  await assert.rejects(() => f.gateway.authorizeAndSign(second), /DAILY_CAP_EXCEEDED/);
  assert.equal(f.calls.length, 1);
});

test('C08 exact replay cannot create second payment', async () => {
  const f = fixture();
  await f.gateway.authorizeAndSign(f.input);
  await assert.rejects(() => f.gateway.authorizeAndSign(f.input), /REPLAY_DENY/);
  assert.equal(f.calls.length, 1);
});

test('C09 concurrent evaluation fails closed', async () => {
  let release; const wait = new Promise(r => { release = r; });
  const calls = [];
  const f = fixture({ signerAdapter: { async signPaymentIntent(i) { calls.push(i); await wait; return { signatureRequestId: 'sig', paymentEnvelope: 'opaque' }; } } });
  const first = f.gateway.authorizeAndSign(f.input);
  await new Promise(r => setImmediate(r));
  const second = structuredClone(f.input); second.callId = 'call-2'; second.challenge.id = 'challenge-2';
  await assert.rejects(() => f.gateway.authorizeAndSign(second), /CONCURRENT_POLICY_EVALUATION_DENY/);
  release(); await first; assert.equal(calls.length, 1);
});

test('C10 signer timeout/failure reserves exposure and is not automatically retried', async () => {
  let calls = 0;
  const f = fixture({ signerAdapter: { async signPaymentIntent() { calls += 1; throw new Error('timeout'); } } });
  await assert.rejects(() => f.gateway.authorizeAndSign(f.input), /SIGNER_FAILURE_RESERVED/);
  assert.equal(calls, 1); assert.equal(f.gateway.exposureAud(), 10);
});

test('C11 frozen policy collections reject mutation', () => {
  const { gateway } = fixture();
  assert.throws(() => gateway.policy.allowedProviders.push('evil-provider'));
  assert.throws(() => { gateway.policy.pinnedRecipients['evil-provider'] = '0xEVIL'; });
  assert.equal(gateway.policy.allowedProviders.includes('evil-provider'), false);
});

test('C12 audit failure denies before signer; signer failure remains reserved', async () => {
  let signerCalls = 0;
  const f = fixture({ auditSink: { append() { throw new Error('audit down'); } }, signerAdapter: { async signPaymentIntent() { signerCalls += 1; return { signatureRequestId: 'sig' }; } } });
  await assert.rejects(() => f.gateway.authorizeAndSign(f.input), /AUDIT_FAILURE_DENY/);
  assert.equal(signerCalls, 0);
});

test('request-equivalence control denies altered frozen request', () => denied(i => { i.requestHash = 'changed'; }, 'REQUEST_HASH_MISMATCH'));
