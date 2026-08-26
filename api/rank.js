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
      model: 'outcome-economics-v0.1',
      warning: 'MVP currently uses synthetic seed data. Do not treat results as production recommendations.',
      count: ranked.length,
      results: ranked,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
