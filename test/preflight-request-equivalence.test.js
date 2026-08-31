'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRequestEquivalence } = require('../benchmark/validate-request-equivalence');

const task = { query: 'locked benchmark query' };

function post(body) {
  return { method: 'POST', body: JSON.stringify(body) };
}

test('equivalence validator admits only the pinned comparable request shapes', () => {
  const tavily = validateRequestEquivalence({ task, provider: 'Tavily', url: 'https://example.test/search', options: post({ query: task.query, search_depth: 'advanced', max_results: 5 }) });
  assert.equal(tavily.ok, true);
  const firecrawl = validateRequestEquivalence({ task, provider: 'Firecrawl', url: 'https://example.test/search', options: post({ query: task.query, limit: 5, sources: ['web'] }) });
  assert.equal(firecrawl.ok, true);
  const agentutility = validateRequestEquivalence({ task, provider: 'agentutility', url: 'https://example.test/web-search', options: post({ query: task.query, num_results: 5 }) });
  assert.equal(agentutility.ok, true);
  assert.equal(agentutility.providerMode, 'web-search:decodo-ranked-results');
  const you = validateRequestEquivalence({ task, provider: 'You.com', url: `https://example.test/search?query=${encodeURIComponent(task.query)}&count=5`, options: { method: 'GET' } });
  assert.equal(you.ok, true);
  const scrape402 = validateRequestEquivalence({ task, provider: 'scrape402', url: `https://example.test/search?q=${encodeURIComponent(task.query)}&count=5`, options: { method: 'GET' } });
  assert.equal(scrape402.ok, true);
});

test('You.com equivalence fails closed on count drift or livecrawl cost-mode drift', () => {
  const wrongCount = validateRequestEquivalence({ task, provider: 'You.com', url: `https://example.test/search?query=${encodeURIComponent(task.query)}&count=10`, options: { method: 'GET' } });
  assert.equal(wrongCount.ok, false);
  assert.match(wrongCount.errors.join(' | '), /top-5/);

  const livecrawl = validateRequestEquivalence({ task, provider: 'You.com', url: `https://example.test/search?query=${encodeURIComponent(task.query)}&count=5&livecrawl=web`, options: { method: 'GET' } });
  assert.equal(livecrawl.ok, false);
  assert.match(livecrawl.errors.join(' | '), /livecrawl must not be enabled/);
});

test('equivalence validator fails closed for unsupported or drifted adapters', () => {
  const agentutilityDrift = validateRequestEquivalence({ task, provider: 'agentutility', url: 'https://example.test/web-search', options: post({ query: task.query, num_results: 10 }) });
  assert.equal(agentutilityDrift.ok, false);
  assert.match(agentutilityDrift.errors.join(' | '), /top-5/);
  const unsupported = validateRequestEquivalence({ task, provider: 'unsupported-provider', url: 'https://example.test/search', options: post({ query: task.query, limit: 5 }) });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.errors.join(' | '), /No equivalence contract/);
  const tavilyDrift = validateRequestEquivalence({ task, provider: 'Tavily', url: 'https://example.test/search', options: post({ query: task.query, search_depth: 'basic', max_results: 10 }) });
  assert.equal(tavilyDrift.ok, false);
  assert.match(tavilyDrift.errors.join(' | '), /search_depth drifted/);
  assert.match(tavilyDrift.errors.join(' | '), /top-5/);
  const scrape402Drift = validateRequestEquivalence({ task, provider: 'scrape402', url: `https://example.test/search?q=${encodeURIComponent(task.query)}&count=10`, options: { method: 'GET' } });
  assert.equal(scrape402Drift.ok, false);
  assert.match(scrape402Drift.errors.join(' | '), /top-5/);
  const openWebNinja = validateRequestEquivalence({ task, provider: 'OpenWeb Ninja', url: `https://example.test/realtime-web-search/search?q=${encodeURIComponent(task.query)}`, options: { method: 'GET' } });
  assert.equal(openWebNinja.ok, false);
  assert.equal(openWebNinja.observedQuery, task.query);
  assert.equal(openWebNinja.observedResultCount, null);
  assert.match(openWebNinja.errors.join(' | '), /does not expose a pinned top-5/);
  assert.match(openWebNinja.errors.join(' | '), /top-5/);
});

test('preflight and batch APIs cannot count a non-equivalent or non-402 live quote as benchmark eligible', () => {
  const preflight = fs.readFileSync(path.join(__dirname, '..', 'api', 'preflight.js'), 'utf8');
  const batch = fs.readFileSync(path.join(__dirname, '..', 'api', 'preflight-batch.js'), 'utf8');
  assert.match(preflight, /isBenchmarkEligibleQuote\s*\(\s*\{[\s\S]*httpStatus\s*:[\s\S]*liveQuoteObserved[\s\S]*requestEquivalent\s*:\s*requestEquivalence\.ok[\s\S]*\}\s*\)/);
  assert.match(preflight, /runtime-zero-spend-discovery-diagnostic/);
  assert.match(preflight, /agentutility[\s\S]*num_results:\s*5/);
  assert.match(preflight, /'OpenWeb Ninja'[\s\S]*searchParams\.set\('q'/);
  assert.match(batch, /benchmarkEligibleQuotes/);
  assert.match(batch, /nonEquivalentRequests/);
  assert.match(batch, /OpenWeb Ninja/);
  assert.match(batch, /Raw live quotes remain discovery evidence unless request equivalence passes/);
});
