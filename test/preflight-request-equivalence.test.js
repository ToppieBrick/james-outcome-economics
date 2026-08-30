'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRequestEquivalence } = require('../benchmark/validate-request-equivalence');

const task = { query: 'locked benchmark query' };

function post(body) {
  return {
    method: 'POST',
    body: JSON.stringify(body),
  };
}

test('equivalence validator admits only the pinned comparable request shapes', () => {
  const tavily = validateRequestEquivalence({
    task,
    provider: 'Tavily',
    url: 'https://example.test/search',
    options: post({ query: task.query, search_depth: 'advanced', max_results: 5 }),
  });
  assert.equal(tavily.ok, true);

  const firecrawl = validateRequestEquivalence({
    task,
    provider: 'Firecrawl',
    url: 'https://example.test/search',
    options: post({ query: task.query, limit: 5, sources: ['web'] }),
  });
  assert.equal(firecrawl.ok, true);

  const you = validateRequestEquivalence({
    task,
    provider: 'You.com',
    url: `https://example.test/search?query=${encodeURIComponent(task.query)}&count=5`,
    options: { method: 'GET' },
  });
  assert.equal(you.ok, true);

  const scrape402 = validateRequestEquivalence({
    task,
    provider: 'scrape402',
    url: `https://example.test/search?q=${encodeURIComponent(task.query)}&count=5`,
    options: { method: 'GET' },
  });
  assert.equal(scrape402.ok, true);
});

test('equivalence validator fails closed for unsupported or drifted adapters', () => {
  const agentutility = validateRequestEquivalence({
    task,
    provider: 'agentutility',
    url: 'https://example.test/search',
    options: post({ query: task.query }),
  });
  assert.equal(agentutility.ok, false);
  assert.match(agentutility.errors.join(' | '), /No equivalence contract/);

  const tavilyDrift = validateRequestEquivalence({
    task,
    provider: 'Tavily',
    url: 'https://example.test/search',
    options: post({ query: task.query, search_depth: 'basic', max_results: 10 }),
  });
  assert.equal(tavilyDrift.ok, false);
  assert.match(tavilyDrift.errors.join(' | '), /search_depth drifted/);
  assert.match(tavilyDrift.errors.join(' | '), /top-5/);

  const scrape402Drift = validateRequestEquivalence({
    task,
    provider: 'scrape402',
    url: `https://example.test/search?q=${encodeURIComponent(task.query)}&count=10`,
    options: { method: 'GET' },
  });
  assert.equal(scrape402Drift.ok, false);
  assert.match(scrape402Drift.errors.join(' | '), /top-5/);
});

test('preflight and batch APIs cannot count a non-equivalent or non-402 live quote as benchmark eligible', () => {
  const preflight = fs.readFileSync(path.join(__dirname, '..', 'api', 'preflight.js'), 'utf8');
  const batch = fs.readFileSync(path.join(__dirname, '..', 'api', 'preflight-batch.js'), 'utf8');

  assert.match(preflight, /isBenchmarkEligibleQuote\s*\(\s*\{[\s\S]*httpStatus\s*:[\s\S]*liveQuoteObserved[\s\S]*requestEquivalent\s*:\s*requestEquivalence\.ok[\s\S]*\}\s*\)/);
  assert.match(preflight, /runtime-zero-spend-discovery-diagnostic/);
  assert.match(batch, /benchmarkEligibleQuotes/);
  assert.match(batch, /nonEquivalentRequests/);
  assert.match(batch, /Raw live quotes remain discovery evidence unless request equivalence passes/);
});
