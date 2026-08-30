'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isBenchmarkEligibleQuote } = require('../benchmark/preflight-benchmark-eligibility');

test('accepts only equivalent live quotes observed on HTTP 402', () => {
  assert.equal(isBenchmarkEligibleQuote({ httpStatus: 402, liveQuoteObserved: true, requestEquivalent: true }), true);
});

test('rejects quote-shaped evidence returned with HTTP 200', () => {
  assert.equal(isBenchmarkEligibleQuote({ httpStatus: 200, liveQuoteObserved: true, requestEquivalent: true }), false);
});

test('rejects quote-shaped evidence returned with auth or other non-402 status', () => {
  assert.equal(isBenchmarkEligibleQuote({ httpStatus: 401, liveQuoteObserved: true, requestEquivalent: true }), false);
  assert.equal(isBenchmarkEligibleQuote({ httpStatus: 403, liveQuoteObserved: true, requestEquivalent: true }), false);
});

test('rejects 402 when request equivalence fails or no live quote is parsed', () => {
  assert.equal(isBenchmarkEligibleQuote({ httpStatus: 402, liveQuoteObserved: true, requestEquivalent: false }), false);
  assert.equal(isBenchmarkEligibleQuote({ httpStatus: 402, liveQuoteObserved: false, requestEquivalent: true }), false);
});
