'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { scoreSearchResult } = require('../benchmark/score-search-result');

const criteria = {
  minimumResults: 3,
  requiredFieldsPerResult: ['title', 'url'],
  minimumDistinctDomains: 2,
  minimumAuthoritativeMatches: 1,
  requireHttpUrls: true,
};

const task = {
  authoritativeDomains: ['openai.com'],
  requiredUrlTerms: ['api'],
};

test('passes only when structural and authoritative checks are satisfied', () => {
  const payload = { results: [
    { title: 'API docs', url: 'https://platform.openai.com/docs/api-reference' },
    { title: 'Guide', url: 'https://example.com/openai-api-guide' },
    { title: 'Discussion', url: 'https://example.org/api-discussion' },
  ] };
  const result = scoreSearchResult(task, payload, criteria);
  assert.equal(result.pass, true);
  assert.equal(result.metrics.authoritativeMatches, 1);
  assert.equal(result.metrics.distinctDomains, 3);
});

test('fails plausible-looking results that omit authoritative ground truth', () => {
  const payload = { results: [
    { title: 'API docs mirror', url: 'https://example.com/api-docs' },
    { title: 'API guide', url: 'https://example.org/api-guide' },
    { title: 'API reference', url: 'https://example.net/api-reference' },
  ] };
  const result = scoreSearchResult(task, payload, criteria);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.includes('no_authoritative_match'));
});

test('subdomains of an authoritative domain are accepted', () => {
  const payload = { results: [
    { title: 'API docs', url: 'https://platform.openai.com/docs/api-reference' },
    { title: 'Guide', url: 'https://example.com/api-guide' },
    { title: 'Reference', url: 'https://example.org/api-reference' },
  ] };
  assert.equal(scoreSearchResult(task, payload, criteria).pass, true);
});

test('required URL terms prevent unrelated pages on an authoritative host from passing', () => {
  const payload = { results: [
    { title: 'OpenAI', url: 'https://openai.com/about' },
    { title: 'Guide', url: 'https://example.com/api-guide' },
    { title: 'Reference', url: 'https://example.org/api-reference' },
  ] };
  const result = scoreSearchResult(task, payload, criteria);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.includes('no_authoritative_match'));
});

test('missing fields and insufficient domain diversity are independently observable', () => {
  const payload = { results: [
    { title: 'API docs', url: 'https://platform.openai.com/docs/api-reference' },
    { title: 'Another', url: 'https://platform.openai.com/api/other' },
    { title: '', url: 'https://example.org/api' },
  ] };
  const result = scoreSearchResult(task, payload, criteria);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.includes('missing_required_fields'));
  assert.ok(result.reasons.includes('fewer_than_minimum_distinct_domains'));
});

test('non-HTTP authoritative URLs cannot satisfy the benchmark contract', () => {
  const payload = { results: [
    { title: 'Fake API docs', url: 'ftp://platform.openai.com/docs/api-reference' },
    { title: 'Guide', url: 'https://example.com/api-guide' },
    { title: 'Reference', url: 'https://example.org/api-reference' },
  ] };
  const result = scoreSearchResult(task, payload, criteria);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.includes('invalid_or_non_http_url'));
  assert.ok(result.reasons.includes('no_authoritative_match'));
  assert.equal(result.metrics.authoritativeMatches, 0);
  assert.equal(result.metrics.validResultCount, 2);
});
