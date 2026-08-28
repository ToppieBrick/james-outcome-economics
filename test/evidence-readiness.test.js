'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readiness, rankingReadiness, isExecutableHttpEndpoint } = require('../lib/evidence-readiness');

const base = {
  provider: 'Provider A',
  endpoint: 'https://provider.test/search',
  evidenceSources: [{ type: 'provider', url: 'https://provider.test' }],
  listedPriceUsd: 0.01,
};

test('valid constrained quote makes first paid benchmark ready without prior payment', () => {
  const result = readiness({
    ...base,
    liveQuoteObserved: true,
    liveQuotePolicyCompliant: true,
    paidExecutionObserved: false,
  });
  assert.equal(result.preflightReady, true);
  assert.equal(result.quoteVerified, true);
  assert.equal(result.paidBenchmarkReady, true);
  assert.equal(result.paidExecutionObserved, false);
});

test('resolved endpoint without live quote is not paid benchmark ready', () => {
  const result = readiness({ ...base, liveQuoteObserved: false });
  assert.equal(result.preflightReady, true);
  assert.equal(result.paidBenchmarkReady, false);
});

test('paid execution without deterministic score cannot make ranking ready', () => {
  const ranking = rankingReadiness([
    { ...base, paidExecutionObserved: true, outcomeScored: false },
  ]);
  assert.equal(ranking.rankingReady, false);
});

test('one scored provider is not a ranking', () => {
  const ranking = rankingReadiness([
    { ...base, paidExecutionObserved: true, outcomeScored: true, benchmarkFingerprint: 'fp-1' },
  ]);
  assert.equal(ranking.rankingReady, false);
});

test('two scored providers under same fingerprint make ranking ready', () => {
  const ranking = rankingReadiness([
    { ...base, provider: 'A', paidExecutionObserved: true, outcomeScored: true, benchmarkFingerprint: 'fp-1' },
    { ...base, provider: 'B', endpoint: 'https://b.test/search', paidExecutionObserved: true, outcomeScored: true, benchmarkFingerprint: 'fp-1' },
  ]);
  assert.equal(ranking.rankingReady, true);
  assert.deepEqual(ranking.comparableFingerprints, ['fp-1']);
});

test('different fingerprints cannot be compared', () => {
  const ranking = rankingReadiness([
    { ...base, provider: 'A', paidExecutionObserved: true, outcomeScored: true, benchmarkFingerprint: 'fp-1' },
    { ...base, provider: 'B', endpoint: 'https://b.test/search', paidExecutionObserved: true, outcomeScored: true, benchmarkFingerprint: 'fp-2' },
  ]);
  assert.equal(ranking.rankingReady, false);
});

test('http prefix lookalike is not executable', () => {
  assert.equal(isExecutableHttpEndpoint('httpx://provider.test'), false);
  assert.equal(isExecutableHttpEndpoint('https://provider.example/search'), false);
  assert.equal(isExecutableHttpEndpoint('https://provider.test/search'), true);
});
