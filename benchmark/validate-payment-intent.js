'use strict';

const policy = require('./payment-policy.json');

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validatePaymentIntent(intent, context = {}) {
  const errors = [];
  const nowMs = context.nowMs ?? Date.now();
  const usedNonces = context.usedNonces ?? new Set();
  const allowedRecipients = new Set(context.allowedRecipients ?? []);
  const allowedEndpoints = new Set(context.allowedEndpoints ?? []);
  const sessionSpendUsd = Number(context.sessionSpendUsd ?? 0);
  const paidCalls = Number(context.paidCalls ?? 0);

  if (!intent || typeof intent !== 'object') return { ok: false, errors: ['missing_intent'] };

  if (intent.network !== policy.network) errors.push('network_not_allowed');
  if (intent.asset !== policy.asset) errors.push('asset_not_allowed');

  const amount = Number(intent.liveQuoteUsd);
  if (!Number.isFinite(amount) || amount < 0) errors.push('invalid_live_quote');
  else {
    if (amount > policy.maxPaymentUsd) errors.push('payment_over_cap');
    if (sessionSpendUsd + amount > policy.maxSessionUsd) errors.push('session_cap_exceeded');
  }

  if (paidCalls >= policy.maxPaidCalls) errors.push('paid_call_cap_exceeded');

  if (!isHttpsUrl(intent.endpoint)) errors.push('endpoint_not_https');
  if (policy.requireProviderAllowlist && !allowedEndpoints.has(intent.endpoint)) errors.push('endpoint_not_allowlisted');
  if (policy.requireProviderAllowlist && !allowedRecipients.has(intent.payTo)) errors.push('recipient_not_allowlisted');

  const quotedAtMs = Date.parse(intent.quotedAt || '');
  if (!Number.isFinite(quotedAtMs)) errors.push('missing_or_invalid_quote_timestamp');
  else {
    const ageMs = nowMs - quotedAtMs;
    if (ageMs < 0) errors.push('future_dated_quote');
    if (ageMs > policy.maxQuoteAgeSeconds * 1000) errors.push('stale_quote');
  }

  const expiresAtMs = Date.parse(intent.expiresAt || '');
  if (!Number.isFinite(expiresAtMs)) errors.push('missing_or_invalid_expiry');
  else if (expiresAtMs <= nowMs) errors.push('expired_payment_requirement');

  if (!intent.nonce || typeof intent.nonce !== 'string') errors.push('missing_nonce');
  else if (usedNonces.has(intent.nonce)) errors.push('replayed_nonce');

  if (!intent.taskId) errors.push('missing_task_binding');
  if (!intent.provider) errors.push('missing_provider_binding');
  if (!intent.payTo) errors.push('missing_recipient_binding');

  // A session allowlist is only a coarse safety boundary. Payment must also be
  // bound to the exact task/provider/endpoint/recipient independently selected
  // by the execution context so an allowlisted substitution cannot be paid.
  if (context.expectedTaskId !== undefined && intent.taskId !== context.expectedTaskId) {
    errors.push('task_binding_mismatch');
  }
  if (context.expectedProvider !== undefined && intent.provider !== context.expectedProvider) {
    errors.push('provider_binding_mismatch');
  }
  if (context.expectedEndpoint !== undefined && intent.endpoint !== context.expectedEndpoint) {
    errors.push('endpoint_binding_mismatch');
  }
  if (context.expectedPayTo !== undefined && intent.payTo !== context.expectedPayTo) {
    errors.push('recipient_binding_mismatch');
  }

  return {
    ok: errors.length === 0,
    errors,
    policyVersion: policy.version,
    checkedAt: new Date(nowMs).toISOString()
  };
}

module.exports = { validatePaymentIntent };
