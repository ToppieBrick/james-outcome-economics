const test = require('node:test');
const assert = require('node:assert/strict');
const { rankProviders } = require('../lib/rank');

test('withholds ranking until paid outcome evidence exists', () => {
  const results = rankProviders({
    taskClass: 'structured-research',
    budget: 1,
    acceptanceCriteria: 'valid structured result'
  });

  assert.deepEqual(results, []);
});

test('requires task class and acceptance criteria', () => {
  assert.throws(() => rankProviders({}), /required/);
});
