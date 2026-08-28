const observed = require('../benchmark/providers.observed.json');
const { readiness, rankingReadiness } = require('../lib/evidence-readiness');

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
    directoryServerUrl: provider.directoryServerUrl ?? null,
    observedTraction: provider.observedTraction ?? null,
    evidenceSources: provider.evidenceSources ?? [],
    evidence: provider.evidence,
    readiness: readiness(provider),
  }));

  const resolved = providers.filter((p) => p.readiness.endpointResolved).length;
  const preflightReady = providers.filter((p) => p.readiness.preflightReady).length;
  const sourceBackedPrices = providers.filter((p) => p.readiness.sourceBackedPrice).length;
  const liveQuoted = providers.filter((p) => p.readiness.liveQuoteObserved).length;
  const quoteVerified = providers.filter((p) => p.readiness.quoteVerified).length;
  const paidBenchmarkReady = providers.filter((p) => p.readiness.paidBenchmarkReady).length;
  const paidObserved = providers.filter((p) => p.readiness.paidExecutionObserved).length;
  const scored = providers.filter((p) => p.readiness.outcomeScored).length;
  const ranking = rankingReadiness(observed.providers);

  res.status(200).json({
    model: 'outcome-economics-v0.2.2',
    evidenceType: 'observed-public-and-benchmark-evidence',
    syntheticSeedData: false,
    observedAt: observed.observedAt,
    taskClass: observed.taskClass,
    summary: {
      providersTracked: providers.length,
      endpointsResolved: resolved,
      preflightReady,
      sourceBackedListedPrices: sourceBackedPrices,
      liveQuotesObserved: liveQuoted,
      policyCompliantQuotesVerified: quoteVerified,
      paidBenchmarkReady,
      paidExecutionsObserved: paidObserved,
      scoredPaidOutcomes: scored,
      rankingReady: ranking.rankingReady,
      comparableFingerprints: ranking.comparableFingerprints,
    },
    providers,
    marketContext: observed.marketContext,
    executionBlocker: observed.executionBlocker,
    warning: 'Listed/public prices and unpaid preflight evidence are not paid outcome evidence. A provider is paid-benchmark-ready only after a policy-compliant live x402 quote is verified; prior payment is not required. Ranking requires scored paid outcomes from at least two comparable providers under the same benchmark fingerprint.',
  });
};
