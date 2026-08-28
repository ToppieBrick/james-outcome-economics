'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/evidence');
const { DEFAULT_MAX_LIVE_QUOTE_AGE_MS } = require('../lib/evidence-readiness');

function invokeEvidenceApi() {
  let statusCode = null;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  handler({}, res);
  return { statusCode, body };
}

test('evidence API exposes the live-quote freshness policy', () => {
  const { statusCode, body } = invokeEvidenceApi();
  assert.equal(statusCode, 200);
  assert.equal(body.controls.maxLiveQuoteAgeSeconds, DEFAULT_MAX_LIVE_QUOTE_AGE_MS / 1000);
  assert.equal(body.controls.liveQuoteTimestampRequired, true);
  assert.equal(body.controls.staleQuotesFailClosed, true);
});

test('evidence API summary is derived from provider readiness rather than drifting counters', () => {
  const { body } = invokeEvidenceApi();
  const count = (field) => body.providers.filter((provider) => provider.readiness[field]).length;

  assert.equal(body.summary.providersTracked, body.providers.length);
  assert.equal(body.summary.endpointsResolved, count('endpointResolved'));
  assert.equal(body.summary.preflightReady, count('preflightReady'));
  assert.equal(body.summary.sourceBackedListedPrices, count('sourceBackedPrice'));
  assert.equal(body.summary.liveQuotesObserved, count('liveQuoteObserved'));
  assert.equal(body.summary.freshLiveQuotesObserved, count('liveQuoteFresh'));
  assert.equal(body.summary.policyCompliantQuotesVerified, count('quoteVerified'));
  assert.equal(body.summary.paidBenchmarkReady, count('paidBenchmarkReady'));
  assert.equal(body.summary.paidExecutionsObserved, count('paidExecutionObserved'));
  assert.equal(body.summary.scoredPaidOutcomes, count('outcomeScored'));
});

test('no provider can be paid-benchmark-ready without a fresh policy-compliant live quote', () => {
  const { body } = invokeEvidenceApi();
  for (const provider of body.providers) {
    if (!provider.readiness.paidBenchmarkReady) continue;
    assert.equal(provider.readiness.preflightReady, true, provider.provider);
    assert.equal(provider.readiness.liveQuoteObserved, true, provider.provider);
    assert.equal(provider.readiness.liveQuoteFresh, true, provider.provider);
    assert.equal(provider.readiness.liveQuotePolicyCompliant, true, provider.provider);
    assert.equal(provider.readiness.quoteVerified, true, provider.provider);
  }
});
