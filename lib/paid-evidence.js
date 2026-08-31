'use strict';

const REQUIRED = [
  'schema_version','observation_id','observed_at','task_fingerprint',
  'provider_canonical_key','endpoint','pay_to','quote_observed_at',
  'quoted_amount','settlement_state','settled_amount','settlement_receipt_or_tx_reference',
  'attempt_number','paid_latency_ms','deterministic_acceptance_pass',
  'acceptance_failure_reason','retry_reason','evidence_kind'
];

const ALLOWED = new Set(REQUIRED);
const SETTLEMENT_STATES = new Set(['SETTLED', 'VERIFIED_NOT_SETTLED']);

function isDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /T/.test(value);
}

function validatePaidEvidence(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['record must be an object'] };
  }
  for (const key of REQUIRED) if (!(key in record)) errors.push(`missing:${key}`);
  for (const key of Object.keys(record)) if (!ALLOWED.has(key)) errors.push(`unexpected:${key}`);
  if (record.schema_version !== '1.1.0') errors.push('schema_version');
  if (record.evidence_kind !== 'OBSERVED_PAID') errors.push('evidence_kind');
  if (typeof record.observation_id !== 'string' || record.observation_id.length < 8) errors.push('observation_id');
  if (typeof record.task_fingerprint !== 'string' || record.task_fingerprint.length < 8) errors.push('task_fingerprint');
  if (typeof record.provider_canonical_key !== 'string' || !record.provider_canonical_key) errors.push('provider_canonical_key');
  if (typeof record.endpoint !== 'string' || !record.endpoint.startsWith('https://')) errors.push('endpoint');
  if (typeof record.pay_to !== 'string' || !record.pay_to) errors.push('pay_to');
  if (!isDateTime(record.observed_at)) errors.push('observed_at');
  if (!isDateTime(record.quote_observed_at)) errors.push('quote_observed_at');
  if (typeof record.quoted_amount !== 'number' || record.quoted_amount < 0 || !Number.isFinite(record.quoted_amount)) errors.push('quoted_amount');
  if (!SETTLEMENT_STATES.has(record.settlement_state)) errors.push('settlement_state');
  if (typeof record.settled_amount !== 'number' || record.settled_amount < 0 || !Number.isFinite(record.settled_amount)) errors.push('settled_amount');
  if (record.settlement_state === 'SETTLED' && (!(record.settled_amount > 0) || typeof record.settlement_receipt_or_tx_reference !== 'string' || !record.settlement_receipt_or_tx_reference)) errors.push('settlement_proof');
  if (record.settlement_state === 'VERIFIED_NOT_SETTLED' && (record.settled_amount !== 0 || record.settlement_receipt_or_tx_reference !== null)) errors.push('unsettled_semantics');
  if (!Number.isInteger(record.attempt_number) || record.attempt_number < 1) errors.push('attempt_number');
  if (!Number.isInteger(record.paid_latency_ms) || record.paid_latency_ms < 0) errors.push('paid_latency_ms');
  if (typeof record.deterministic_acceptance_pass !== 'boolean') errors.push('deterministic_acceptance_pass');
  if (record.deterministic_acceptance_pass === true && record.acceptance_failure_reason !== null) errors.push('acceptance_failure_reason');
  if (record.deterministic_acceptance_pass === false && (typeof record.acceptance_failure_reason !== 'string' || !record.acceptance_failure_reason)) errors.push('acceptance_failure_reason');
  if (Number.isInteger(record.attempt_number) && record.attempt_number >= 2 && (typeof record.retry_reason !== 'string' || !record.retry_reason)) errors.push('retry_reason');
  if (record.retry_reason !== null && typeof record.retry_reason !== 'string') errors.push('retry_reason');
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

function ingestPaidEvidence(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  return records.map((record, index) => {
    const result = validatePaidEvidence(record);
    if (!result.ok) {
      const error = new Error(`Paid evidence rejected at index ${index}: ${result.errors.join(', ')}`);
      error.code = 'INVALID_PAID_EVIDENCE';
      error.validationErrors = result.errors;
      throw error;
    }
    return Object.freeze({ ...record });
  });
}

module.exports = { validatePaidEvidence, ingestPaidEvidence };
