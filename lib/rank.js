const providers = require('../data/providers.json');

function rankProviders({ taskClass, budget, acceptanceCriteria }) {
  if (!taskClass || !acceptanceCriteria) {
    throw new Error('taskClass and acceptanceCriteria are required');
  }

  const maxBudget = Number.isFinite(Number(budget)) ? Number(budget) : Infinity;

  return providers
    .filter((p) => p.taskClasses.includes(taskClass))
    .map((p) => {
      const probability = Math.max(0.01, Math.min(0.99, p.successProbability));
      const expectedAttempts = 1 / probability;
      const expectedCostPerSuccess = p.livePrice * expectedAttempts;
      return {
        provider: p.name,
        providerId: p.id,
        taskClass,
        acceptanceCriteria,
        listedPrice: p.listedPrice,
        livePrice: p.livePrice,
        successProbability: probability,
        expectedAttempts: Number(expectedAttempts.toFixed(3)),
        expectedCostPerSuccess: Number(expectedCostPerSuccess.toFixed(4)),
        latencyMs: p.latencyMs,
        evidence: p.evidence,
        syntheticSeedData: true,
      };
    })
    .filter((p) => p.expectedCostPerSuccess <= maxBudget)
    .sort((a, b) => a.expectedCostPerSuccess - b.expectedCostPerSuccess);
}

module.exports = { rankProviders };
