'use strict';

/**
 * Fail-closed validator for cross-provider benchmark request equivalence.
 * This does not claim provider APIs are semantically identical; it proves the
 * harness preserved the locked query and result-count contract and explicitly
 * records provider-specific search modes for later interpretation.
 */
function normalizeQuery(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function parseJsonBody(options, provider, errors) {
  try { return JSON.parse(options?.body || '{}'); }
  catch {
    errors.push(`${provider} request body is not valid JSON`);
    return {};
  }
}

function validateRequestEquivalence({ task, provider, url, options }) {
  const errors = [];
  const expectedQuery = normalizeQuery(task?.query);
  let observedQuery = null;
  let observedResultCount = null;
  let providerMode = null;

  if (provider === 'You.com') {
    const parsed = new URL(url);
    observedQuery = normalizeQuery(parsed.searchParams.get('query'));
    observedResultCount = Number(parsed.searchParams.get('count'));
    providerMode = 'web-search:no-livecrawl';
    if (parsed.searchParams.has('livecrawl')) errors.push('You.com livecrawl must not be enabled in the primary cohort');
  } else if (provider === 'Tavily') {
    const body = parseJsonBody(options, provider, errors);
    observedQuery = normalizeQuery(body.query);
    observedResultCount = Number(body.max_results);
    providerMode = `search_depth:${body.search_depth ?? 'unset'}`;
    if (body.search_depth !== 'advanced') errors.push('Tavily search_depth drifted from locked advanced mode');
  } else if (provider === 'Firecrawl') {
    const body = parseJsonBody(options, provider, errors);
    observedQuery = normalizeQuery(body.query);
    observedResultCount = Number(body.limit);
    providerMode = Array.isArray(body.sources) ? `sources:${body.sources.join(',')}` : 'sources:unset';
    if (!Array.isArray(body.sources) || body.sources.length !== 1 || body.sources[0] !== 'web') {
      errors.push('Firecrawl sources drifted from locked web-only mode');
    }
  } else {
    errors.push(`No equivalence contract for provider: ${provider}`);
  }

  if (!expectedQuery) errors.push('Locked task query is empty');
  if (observedQuery !== expectedQuery) errors.push('Outbound query differs from locked task query');
  if (observedResultCount !== 5) errors.push('Outbound result count differs from locked top-5 contract');

  return {
    ok: errors.length === 0,
    errors,
    expectedQuery,
    observedQuery,
    observedResultCount,
    providerMode,
    equivalenceScope: 'query-string identity + top-5 result count + pinned provider mode; does not assert provider retrieval semantics are identical',
  };
}

module.exports = { normalizeQuery, validateRequestEquivalence };
