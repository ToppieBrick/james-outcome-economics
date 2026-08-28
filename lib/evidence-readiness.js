'use strict';

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

function readiness(provider) {
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
  const liveQuotePolicyCompliant = provider.liveQuotePolicyCompliant === true;
  const quoteVerified = liveQuoteObserved && liveQuotePolicyCompliant;
  const paidBenchmarkReady = preflightReady && quoteVerified;
  const paidExecutionObserved = provider.paidExecutionObserved === true;
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
    liveQuotePolicyCompliant,
    quoteVerified,
    paidBenchmarkReady,
    paidExecutionObserved,
    outcomeScored,
    benchmarkFingerprint: outcomeScored ? provider.benchmarkFingerprint : null,
  };
}

function rankingReadiness(providers) {
  const scored = providers
    .map((provider) => ({ provider, readiness: readiness(provider) }))
    .filter((entry) => entry.readiness.outcomeScored);

  const byFingerprint = new Map();
  for (const entry of scored) {
    const fingerprint = entry.readiness.benchmarkFingerprint;
    const current = byFingerprint.get(fingerprint) || new Set();
    current.add(entry.provider.provider || entry.provider.name || 'unknown');
    byFingerprint.set(fingerprint, current);
  }

  const comparableFingerprints = [...byFingerprint.entries()]
    .filter(([, providerNames]) => providerNames.size >= 2)
    .map(([fingerprint]) => fingerprint);

  return {
    rankingReady: comparableFingerprints.length > 0,
    comparableFingerprints,
    scoredProviders: scored.length,
  };
}

module.exports = {
  isExecutableHttpEndpoint,
  readiness,
  rankingReadiness,
};
