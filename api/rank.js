const { rankProviders } = require('../lib/rank');

module.exports = function handler(req, res) {
  try {
    const input = req.method === 'GET' ? req.query : req.body;
    const ranked = rankProviders({
      taskClass: input.taskClass,
      budget: input.budget,
      acceptanceCriteria: input.acceptanceCriteria,
    });

    res.status(200).json({
      model: 'outcome-economics-v0.2',
      status: ranked.length ? 'observed-outcome-ranking' : 'awaiting-paid-outcomes',
      warning: ranked.length
        ? undefined
        : 'Synthetic seed rankings have been removed. James will not rank providers until paid benchmark outcomes are observed.',
      count: ranked.length,
      results: ranked,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
