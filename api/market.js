const demand = require('../benchmark/market-demand-observations-2026-08-29.json');

module.exports = function handler(req, res) {
  const observations = demand.observations.map((item) => ({
    provider: item.provider,
    scope: item.scope,
    endpoint: item.endpoint ?? null,
    serverUrl: item.serverUrl ?? null,
    listedSearchPriceUsd: item.listedSearchPriceUsd ?? null,
    transactions30d: item.transactions30d ?? item.transactions30dApprox ?? null,
    transactionsApproximate: item.transactions30dApprox != null,
    buyers30d: item.buyers30d ?? null,
    volumeUsd30d: item.volumeUsd30d ?? null,
    source: item.source,
    note: item.note,
  }));

  const endpointSpecificDemand = observations.filter(
    (item) => item.scope === 'graded-endpoint-demand' && (item.transactions30d ?? 0) > 0
  );

  res.status(200).json({
    model: 'outcome-economics-market-v0.1',
    taskClass: demand.taskClass,
    evidenceClass: demand.evidenceClass,
    observedAt: demand.observedAt,
    rankingEligible: false,
    syntheticSeedData: false,
    summary: {
      observations: observations.length,
      providersWithDisplayedPaidActivity: new Set(
        observations.filter((item) => (item.transactions30d ?? 0) > 0).map((item) => item.provider)
      ).size,
      endpointSpecificDemandSignals: endpointSpecificDemand.length,
      x402SearchServersObserved: demand.market.x402scanSearchServers,
      globalX402Transactions30d: demand.market.x402scanGlobal30d.transactions,
    },
    observations,
    market: demand.market,
    warning: demand.warning,
  });
};
