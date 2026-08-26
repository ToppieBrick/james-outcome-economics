module.exports = function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'james-outcome-economics',
    version: '0.1.0',
    dataMode: 'synthetic-seed'
  });
};
