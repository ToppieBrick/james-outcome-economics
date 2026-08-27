const observed = require('../benchmark/providers.observed.json');

function readiness(provider) {
  const endpointResolved = typeof provider.endpoint === 'string'
    && provider.endpoint.startsWith('http')
    && !provider.endpoint.includes('.example');
  const priceObserved = Number.isFinite(Number(provider.listedPriceUsd));
  const liveQuoteObserved = provider.liveQuoteObserved === true;
  const paidExecutionObserved = provider.paidExecutionObserved === true;

  return {
    endpointResolved,
    priceObserved,
    liveQuoteObserved,
    paidExecutionObserved,
    paidBenchmarkReady: endpointResolved && liveQuoteObserved && paidExecutionObserved,
  };
}

module.exports = function handler(req, res) {
  const providers = observed.providers.map((provider) => ({
    provider: provider.provider,
    endpoint: provider.endpoint,
    method: provider.method,
    listedPriceUsd: provider.listedPriceUsd ?? null,
    listedPriceStatus: provider.listedPriceStatus ?? null,
    publicPriceObservationsUsd: provider.publicPriceObservationsUsd ?? null,
    executionEligibility: provider.executionEligibility ?? null,
    freeTrialAvailable: provider.freeTrialAvailable === true,
    freeTrialLimit: provider.freeTrialLimit ?? null,
    evidence: provider.evidence,
    readiness: readiness(provider),
  }));

  const resolved = providers.filter((p) => p.readiness.endpointResolved).length;
  const liveQuoted = providers.filter((p) => p.readiness.liveQuoteObserved).length;
  const paidObserved = providers.filter((p) => p.readiness.paidExecutionObserved).length;

  res.status(200).json({
    model: 'outcome-economics-v0.2',
    evidenceType: 'observed-public-and-benchmark-evidence',
    syntheticSeedData: false,
    observedAt: observed.observedAt,
    taskClass: observed.taskClass,
    summary: {
      providersTracked: providers.length,
      endpointsResolved: resolved,
      liveQuotesObserved: liveQuoted,
      paidExecutionsObserved: paidObserved,
      rankingReady: paidObserved > 0,
    },
    providers,
    marketContext: observed.marketContext,
    executionBlocker: observed.executionBlocker,
    warning: 'Listed/public prices and unpaid preflight evidence are not paid outcome evidence. /api/rank remains empty until real paid benchmark outcomes are observed.',
  });
};
