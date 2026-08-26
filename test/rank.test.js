const test = require('node:test');
const assert = require('node:assert/strict');
const { rankProviders } = require('../lib/rank');

test('ranks providers by expected cost per successful outcome', () => {
  const results = rankProviders({
    taskClass: 'structured-research',
    budget: 1,
    acceptanceCriteria: 'valid structured result'
  });

  assert.equal(results.length, 3);
  assert.equal(results[0].provider, 'Seed Provider Alpha');
  assert.ok(results[0].expectedCostPerSuccess <= results[1].expectedCostPerSuccess);
  assert.ok(results[1].expectedCostPerSuccess <= results[2].expectedCostPerSuccess);
});

test('requires task class and acceptance criteria', () => {
  assert.throws(() => rankProviders({}), /required/);
});
