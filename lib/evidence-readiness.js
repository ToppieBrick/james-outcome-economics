'use strict';

const DEFAULT_MAX_LIVE_QUOTE_AGE_MS = 15 * 60 * 1000;

function isExecutableHttpEndpoint(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (!url.hostname || url.hostname.endsWith('.example')) return false;
    return true;
  } catch {
    return false;
  }
}

function endpointHost(value) {
  if (!isExecutableHttpEndpoint(value)) return null;
  try { return new URL(value).host.toLowerCase(); } catch { return null; }
}

function canonicalProviderIdentity(provider) {
  const explicit = provider.providerCanonicalKey || provider.canonicalProviderKey || provider.canonicalProviderId;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim().toLowerCase();

  const recipient = provider.paymentRecipientObserved || provider.paymentRecipient || provider.payTo || provider.canonicalPayTo;
  const host = endpointHost(provider.endpoint);
  if (host && typeof recipient === 'string' && recipient.trim()) {
    return `${host}|${recipient.trim().toLowerCase()}`;
  }
  return null;
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isFreshLiveQuote(provider, options = {}) {
  if (provider.liveQuoteObserved !== true) return false;
  const observedAt = parseTimestamp(provider.liveQuoteObservedAt || provider.liveQuoteObservedAtIso);
  if (observedAt === null) return false;

  const nowMs = options.now instanceof Date
    ? options.now.getTime()
    : Number.isFinite(Number(options.now))
      ? Number(options.now)
      : Date.now();
  const maxAgeMs = Number.isFinite(Number(options.maxLiveQuoteAgeMs))
    ? Number(options.maxLiveQuoteAgeMs)
    : DEFAULT_MAX_LIVE_QUOTE_AGE_MS;
  const ageMs = nowMs - observedAt;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function readiness(provider, options = {}) {
  const endpointResolved = isExecutableHttpEndpoint(provider.endpoint);
  const priceObserved = Number.isFinite(Number(provider.listedPriceUsd));
  const sourceBackedPrice = priceObserved
    && Array.isArray(provider.evidenceSources)
    && provider.evidenceSources.length > 0;

  const explicitlyIneligible = typeof provider.executionEligibility === 'string'
    && (provider.executionEligibility.startsWith('unresolved')
      || provider.executionEligibility.startsWith('ineligible')
      || provider.executionEligibility.startsWith('blocked'));

  const preflightReady = endpointResolved && !explicitlyIneligible;
  const liveQuoteObserved = provider.liveQuoteObserved === true;
  const liveQuoteFresh = isFreshLiveQuote(provider, options);
  const liveQuotePolicyCompliant = provider.liveQuotePolicyCompliant === true;
  const quoteVerified = liveQuoteObserved && liveQuoteFresh && liveQuotePolicyCompliant;
  const paidBenchmarkReady = preflightReady && quoteVerified;
  const paidExecutionObserved = provider.paidExecutionObserved === true;
  const providerCanonicalIdentity = canonicalProviderIdentity(provider);
  const outcomeScored = paidExecutionObserved
    && provider.outcomeScored === true
    && typeof provider.benchmarkFingerprint === 'string'
    && provider.benchmarkFingerprint.length > 0;

  return {
    discovered: Array.isArray(provider.evidenceSources) && provider.evidenceSources.length > 0,
    endpointResolved,
    priceObserved,
    sourceBackedPrice,
    preflightReady,
    liveQuoteObserved,
    liveQuoteFresh,
    liveQuotePolicyCompliant,
    quoteVerified,
    paidBenchmarkReady,
    paidExecutionObserved,
    outcomeScored,
    benchmarkFingerprint: outcomeScored ? provider.benchmarkFingerprint : null,
    providerCanonicalIdentity,
  };
}

function rankingReadiness(providers) {
  const scored = providers
    .map((provider) => ({ provider, readiness: readiness(provider) }))
    .filter((entry) => entry.readiness.outcomeScored);

  const byFingerprint = new Map();
  for (const entry of scored) {
    const fingerprint = entry.readiness.benchmarkFingerprint;
    const identity = entry.readiness.providerCanonicalIdentity;
    if (!identity) continue;
    const current = byFingerprint.get(fingerprint) || new Set();
    current.add(identity);
    byFingerprint.set(fingerprint, current);
  }

  const comparableFingerprints = [...byFingerprint.entries()]
    .filter(([, providerIdentities]) => providerIdentities.size >= 2)
    .map(([fingerprint]) => fingerprint);

  return {
    rankingReady: comparableFingerprints.length > 0,
    comparableFingerprints,
    scoredProviders: scored.length,
    canonicallyIdentifiedScoredProviders: scored.filter((entry) => entry.readiness.providerCanonicalIdentity).length,
  };
}

module.exports = {
  DEFAULT_MAX_LIVE_QUOTE_AGE_MS,
  isExecutableHttpEndpoint,
  canonicalProviderIdentity,
  isFreshLiveQuote,
  readiness,
  rankingReadiness,
};
