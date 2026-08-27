'use strict';

function hostname(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return null; }
}

function domainMatches(host, allowed) {
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

function scoreSearchResult(task, payload, criteria) {
  const reasons = [];
  const results = Array.isArray(payload?.results) ? payload.results : [];

  if (results.length < criteria.minimumResults) reasons.push('fewer_than_minimum_results');

  const valid = results.filter((r) =>
    criteria.requiredFieldsPerResult.every((f) => typeof r?.[f] === 'string' && r[f].trim())
  );
  if (valid.length < results.length) reasons.push('missing_required_fields');

  const hosts = valid.map((r) => hostname(r.url)).filter(Boolean);
  if (new Set(hosts).size < criteria.minimumDistinctDomains) reasons.push('fewer_than_minimum_distinct_domains');

  const authoritative = valid.filter((r) => {
    const host = hostname(r.url);
    if (!host || !domainMatches(host, task.authoritativeDomains || [])) return false;
    const terms = task.requiredUrlTerms || [];
    return terms.every((term) => r.url.toLowerCase().includes(term.toLowerCase()));
  });

  if (authoritative.length < (criteria.minimumAuthoritativeMatches || 0)) reasons.push('no_authoritative_match');

  return {
    pass: reasons.length === 0,
    reasons,
    metrics: {
      resultCount: results.length,
      validResultCount: valid.length,
      distinctDomains: new Set(hosts).size,
      authoritativeMatches: authoritative.length
    }
  };
}

module.exports = { scoreSearchResult };
