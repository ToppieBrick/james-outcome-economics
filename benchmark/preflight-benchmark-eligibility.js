'use strict';

function isBenchmarkEligibleQuote({ httpStatus, liveQuoteObserved, requestEquivalent }) {
  return httpStatus === 402 && liveQuoteObserved === true && requestEquivalent === true;
}

module.exports = { isBenchmarkEligibleQuote };
