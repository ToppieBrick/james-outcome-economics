const assert = require('node:assert/strict');
const { parsePaymentHeaders, collectPaymentCandidates, normalizeUsd, normalizeRecipient } = require('./preflight-quotes');

const paymentRequired = {
  x402Version: 2,
  accepts: [{
    scheme: 'exact',
    network: 'eip155:8453',
    amount: '10000',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: '0xAbCdEf0000000000000000000000000000001234'
  }]
};
const encoded = Buffer.from(JSON.stringify(paymentRequired), 'utf8').toString('base64');
const parsed = parsePaymentHeaders({ 'payment-required': encoded });
assert.equal(parsed.protocolVersion, 2);
assert.equal(parsed.transport, 'v2-payment-required-base64');
assert.equal(parsed.objects.length, 1);
const candidates = collectPaymentCandidates(parsed.objects[0], []);
assert.equal(normalizeRecipient(candidates), '0xabcdef0000000000000000000000000000001234');
assert.equal(normalizeUsd(candidates.find((c) => c.amount != null)), 0.01);

const malformed = parsePaymentHeaders({ 'payment-required': '***not-base64***' });
assert.equal(malformed.objects.length, 0);
assert.equal(malformed.transport, null);

const legacyObject = { maxAmountRequired: '10000', asset: 'USDC', network: 'base', payTo: '0x123' };
const legacy = parsePaymentHeaders({ 'x-payment-required': JSON.stringify(legacyObject) });
assert.equal(legacy.transport, 'legacy-json-payment-header');
assert.equal(legacy.objects.length, 1);
assert.equal(normalizeUsd(collectPaymentCandidates(legacy.objects[0], [])[0]), 0.01);

console.log('x402 V2 parser regression tests passed');
