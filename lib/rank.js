const providers = require('../data/providers.json');

function rankProviders({ taskClass, budget, acceptanceCriteria }) {
  if (!taskClass || !acceptanceCriteria) {
    throw new Error('taskClass and acceptanceCriteria are required');
  }

  const maxBudget = Number.isFinite(Number(budget)) ? Number(budget) : Infinity;

  return providers
    .filter((p) => p.taskClasses.includes(taskClass))
    .filter((p) => Number(p.observedPaidAttempts) > 0)
    .filter((p) => Number.isFinite(Number(p.successProbability)) && Number.isFinite(Number(p.livePrice)))
    .map((p) => {
      const probability = Math.max(0.01, Math.min(0.99, Number(p.successProbability)));
      const expectedAttempts = 1 / probability;
      const expectedCostPerSuccess = Number(p.livePrice) * expectedAttempts;
      return {
        provider: p.name,
        providerId: p.id,
        taskClass,
        acceptanceCriteria,
        listedPrice: p.listedPrice,
        livePrice: Number(p.livePrice),
        successProbability: probability,
        expectedAttempts: Number(expectedAttempts.toFixed(3)),
        expectedCostPerSuccess: Number(expectedCostPerSuccess.toFixed(6)),
        latencyMs: p.latencyMs,
        observedPaidAttempts: p.observedPaidAttempts,
        evidence: p.evidence,
        syntheticSeedData: false,
      };
    })
    .filter((p) => p.expectedCostPerSuccess <= maxBudget)
    .sort((a, b) => a.expectedCostPerSuccess - b.expectedCostPerSuccess);
}

module.exports = { rankProviders };
