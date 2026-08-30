'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaidEvidence, ingestPaidEvidence } = require('../lib/paid-evidence');

function valid(overrides = {}) {
  return {
    schema_version: '1.0.0', observation_id: 'obs-00001',
    observed_at: '2026-08-31T00:00:00Z', task_fingerprint: 'task-0001',
    provider_canonical_key: 'provider-a', endpoint: 'https://example.com/search',
    pay_to: '0xabc', quote_observed_at: '2026-08-31T00:00:00Z',
    quoted_amount: 0.01, settled_amount: 0.01,
    settlement_receipt_or_tx_reference: 'tx-observed-1', attempt_number: 1,
    paid_latency_ms: 250, deterministic_acceptance_pass: true,
    acceptance_failure_reason: null, retry_reason: null, evidence_kind: 'OBSERVED_PAID',
    ...overrides
  };
}

test('accepts complete observed paid evidence', () => {
  assert.equal(validatePaidEvidence(valid()).ok, true);
  assert.equal(ingestPaidEvidence([valid()]).length, 1);
});

test('rejects unpaid or synthetic evidence before ingestion', () => {
  for (const evidence_kind of ['UNPAID_QUOTE', 'SYNTHETIC', 'CLAIMED_PAID']) {
    assert.equal(validatePaidEvidence(valid({ evidence_kind })).ok, false);
  }
});

test('rejects missing settlement identity and unexpected fields', () => {
  const missing = valid(); delete missing.pay_to;
  assert.equal(validatePaidEvidence(missing).ok, false);
  assert.equal(validatePaidEvidence(valid({ third_party_uptime: 99.9 })).ok, false);
});

test('enforces acceptance failure reason semantics', () => {
  assert.equal(validatePaidEvidence(valid({ deterministic_acceptance_pass: false, acceptance_failure_reason: null })).ok, false);
  assert.equal(validatePaidEvidence(valid({ deterministic_acceptance_pass: false, acceptance_failure_reason: 'wrong canonical answer' })).ok, true);
  assert.equal(validatePaidEvidence(valid({ acceptance_failure_reason: 'should be null' })).ok, false);
});

test('requires retry provenance from second attempt onward', () => {
  assert.equal(validatePaidEvidence(valid({ attempt_number: 2, retry_reason: null })).ok, false);
  assert.equal(validatePaidEvidence(valid({ attempt_number: 2, retry_reason: 'provider timeout' })).ok, true);
});

test('ingestion fails closed on any invalid record', () => {
  assert.throws(() => ingestPaidEvidence([valid(), valid({ settled_amount: -1 })]), error => error.code === 'INVALID_PAID_EVIDENCE');
});
