'use strict';

const capability = require('./payment-capability.required.json');

function normalizeNetwork(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'base' || raw === 'base-mainnet' || raw === 'eip155:8453') return 'eip155:8453';
  return raw || null;
}

function normalizeAsset(value) {
  const raw = String(value || '').trim().toLowerCase();
  const contract = capability.asset.contract.toLowerCase();
  if (raw === 'usdc' || raw === contract) return contract;
  return raw || null;
}

function validatePreflightQuote(input) {
  const errors = [];
  const endpoint = input?.endpoint;
  const method = String(input?.method || '').toUpperCase();
  let host = null;

  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') errors.push('endpoint_not_https');
    host = url.host.toLowerCase();
  } catch {
    errors.push('invalid_endpoint');
  }

  const approvedHosts = new Set(capability.executionControls.approvedHosts.map((h) => h.toLowerCase()));
  if (!host || !approvedHosts.has(host)) errors.push('host_not_approved');

  const allowedMethods = host ? capability.executionControls.allowedMethodsByHost[host] || [] : [];
  if (!allowedMethods.includes(method)) errors.push('method_not_approved');

  if (input?.httpStatus !== 402) errors.push('http_402_required');
  if (!input?.paymentCandidate) errors.push('payment_candidate_required');

  const amount = Number(input?.liveQuoteUsd);
  if (!Number.isFinite(amount) || amount < 0) errors.push('invalid_live_quote');
  else if (amount > capability.executionControls.perPaymentUsdCap) errors.push('payment_over_cap');

  const network = normalizeNetwork(input?.paymentCandidate?.network);
  if (network !== capability.asset.preferredNetwork) errors.push('network_not_approved');

  const asset = normalizeAsset(input?.paymentCandidate?.asset);
  if (asset !== capability.asset.contract.toLowerCase()) errors.push('asset_not_approved');

  const recipient = String(input?.paymentCandidate?.payTo || '').trim();
  if (!recipient) errors.push('recipient_missing');

  const protocolVersion = Number(input?.protocolVersion);
  if (protocolVersion !== 2) errors.push('x402_v2_required');

  const quoteObservedAt = Date.parse(input?.quoteObservedAt || '');
  const nowMs = Number(input?.nowMs ?? Date.now());
  if (!Number.isFinite(quoteObservedAt)) errors.push('quote_timestamp_missing');
  else {
    const ageMs = nowMs - quoteObservedAt;
    if (ageMs < 0) errors.push('future_dated_quote');
    if (ageMs > capability.executionControls.maxQuoteAgeSeconds * 1000) errors.push('stale_quote');
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: { host, method, network, asset, recipient: recipient || null, amountUsd: Number.isFinite(amount) ? amount : null },
    capabilityVersion: capability.version,
  };
}

module.exports = { validatePreflightQuote, normalizeNetwork, normalizeAsset };
