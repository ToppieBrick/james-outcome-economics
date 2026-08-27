'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  decodeBase64Json,
  parsePaymentHeaders,
  collectPaymentCandidates,
  normalizeUsd,
  runnableProviders,
} = require('../benchmark/preflight-quotes-v2');

test('decodes canonical x402 V2 PAYMENT-REQUIRED base64 JSON', () => {
  const payload = { x402Version: 2, accepts: [{ amount: '10000', asset: 'USDC', payTo: '0xABC' }] };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  assert.deepEqual(decodeBase64Json(encoded), payload);
  const parsed = parsePaymentHeaders({ 'payment-required': encoded });
  assert.equal(parsed.protocolVersion, 2);
  assert.equal(parsed.transport, 'v2-payment-required-base64');
});

test('preserves legacy raw JSON payment header fallback', () => {
  const parsed = parsePaymentHeaders({ 'x402-payment-required': JSON.stringify({ x402Version: 1, maxAmountRequired: '0.01' }) });
  assert.equal(parsed.protocolVersion, 1);
  assert.equal(parsed.transport, 'legacy-json-payment-header');
});

test('malformed payment challenge fails closed with no parsed payment objects', () => {
  const parsed = parsePaymentHeaders({ 'payment-required': 'not-valid-base64-or-json' });
  assert.deepEqual(parsed.objects, []);
  assert.equal(parsed.protocolVersion, null);
  assert.equal(parsed.transport, null);
});

test('collects dynamic recipient and normalizes atomic USDC amount', () => {
  const candidates = collectPaymentCandidates({ accepts: [{ amount: '10000', network: 'eip155:8453', asset: 'USDC', payTo: '0x123', scheme: 'exact' }] });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].payTo, '0x123');
  assert.equal(normalizeUsd(candidates[0]), 0.01);
});

test('runnableProviders excludes unsupported adapters and invalid endpoints', () => {
  const evidence = { providers: [
    { provider: 'Firecrawl', endpoint: 'https://example.com/search' },
    { provider: 'Unknown', endpoint: 'https://example.com/search' },
    { provider: 'agentutility', endpoint: 'not-a-url' },
  ] };
  const providers = runnableProviders(evidence);
  assert.equal(providers.length, 1);
  assert.equal(providers[0].provider, 'Firecrawl');
});
