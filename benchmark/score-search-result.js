'use strict';

function parseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      hostname: parsed.hostname.toLowerCase().replace(/^www\./, ''),
      protocol: parsed.protocol,
      isHttp: parsed.protocol === 'http:' || parsed.protocol === 'https:'
    };
  } catch {
    return null;
  }
}

function domainMatches(host, allowed) {
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

function scoreSearchResult(task, payload, criteria) {
  const reasons = [];
  const results = Array.isArray(payload?.results) ? payload.results : [];

  if (results.length < criteria.minimumResults) reasons.push('fewer_than_minimum_results');

  const fieldValid = results.filter((r) =>
    criteria.requiredFieldsPerResult.every((f) => typeof r?.[f] === 'string' && r[f].trim())
  );
  if (fieldValid.length < results.length) reasons.push('missing_required_fields');

  const invalidOrNonHttp = criteria.requireHttpUrls
    ? fieldValid.filter((r) => {
        const parsed = parseUrl(r.url);
        return !parsed || !parsed.isHttp;
      })
    : [];
  if (invalidOrNonHttp.length > 0) reasons.push('invalid_or_non_http_url');

  const valid = criteria.requireHttpUrls
    ? fieldValid.filter((r) => {
        const parsed = parseUrl(r.url);
        return parsed && parsed.isHttp;
      })
    : fieldValid;

  const hosts = valid.map((r) => parseUrl(r.url)?.hostname).filter(Boolean);
  if (new Set(hosts).size < criteria.minimumDistinctDomains) reasons.push('fewer_than_minimum_distinct_domains');

  const authoritative = valid.filter((r) => {
    const parsed = parseUrl(r.url);
    const host = parsed?.hostname;
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
