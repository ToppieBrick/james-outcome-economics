'use strict';

const observed = require('../benchmark/providers.observed.json');
const paymentCapability = require('../benchmark/payment-capability.required.json');
const { readiness } = require('../lib/evidence-readiness');

function candidate(provider) {
  const r = readiness(provider);
  return {
    provider: provider.provider,
    endpoint: provider.endpoint,
    method: provider.method,
    listedPriceUsd: r.priceObserved ? Number(provider.listedPriceUsd) : null,
    sourceBackedPrice: r.sourceBackedPrice,
    endpointResolved: r.endpointResolved,
    preflightReady: r.preflightReady,
    liveQuoteObserved: r.liveQuoteObserved,
    paidExecutionObserved: r.paidExecutionObserved,
    outcomeScored: r.outcomeScored,
    observedTraction: provider.observedTraction ?? null,
    evidenceSources: provider.evidenceSources ?? [],
  };
}

module.exports = function handler(req, res) {
  const candidates = observed.providers.map(candidate);
  const preflight = candidates
    .filter((p) => p.preflightReady && p.sourceBackedPrice)
    .sort((a, b) => (a.listedPriceUsd ?? Infinity) - (b.listedPriceUsd ?? Infinity));

  const paidReady = preflight.filter((p) => p.liveQuoteObserved);
  const blocked = candidates.filter((p) => !p.preflightReady || !p.sourceBackedPrice);

  res.status(200).json({
    model: 'outcome-economics-v0.2.8',
    taskClass: observed.taskClass,
    selectionMode: 'observed-evidence-only',
    syntheticSeedData: false,
    rule: 'This endpoint prioritises zero-spend preflight candidates only. It does not rank provider outcome economics. Paid ranking remains fail-closed until comparable paid outcomes exist.',
    paymentCapabilityStatus: paymentCapability.status,
    counts: {
      providersTracked: candidates.length,
      preflightEligible: preflight.length,
      paidBenchmarkReadyByObservedQuote: paidReady.length,
      blockedOrInsufficientEvidence: blocked.length,
    },
    preflightCohort: preflight,
    blocked,
    spendUsd: 0,
    paidCallAuthorised: false,
  });
};
