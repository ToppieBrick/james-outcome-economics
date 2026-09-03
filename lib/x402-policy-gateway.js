'use strict';

const crypto = require('node:crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function assertFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`INVALID_${name.toUpperCase()}`);
}

class X402PolicyGateway {
  constructor({ policy, signerAdapter, auditSink }) {
    if (!policy || !signerAdapter || !auditSink) throw new Error('POLICY_GATEWAY_DEPENDENCY_MISSING');
    if (typeof signerAdapter.signPaymentIntent !== 'function') throw new Error('PURPOSE_SPECIFIC_SIGNER_REQUIRED');
    if (typeof auditSink.append !== 'function') throw new Error('AUDIT_SINK_REQUIRED');

    this.policy = Object.freeze({
      ...policy,
      allowedProviders: Object.freeze([...(policy.allowedProviders || [])]),
      allowedDomains: Object.freeze([...(policy.allowedDomains || [])]),
      pinnedRecipients: Object.freeze({ ...(policy.pinnedRecipients || {}) })
    });
    this.signerAdapter = signerAdapter;
    this.auditSink = auditSink;
    this.reservations = new Map();
    this.seenIntentHashes = new Set();
    this.locked = false;
  }

  exposureAud() {
    let total = 0;
    for (const reservation of this.reservations.values()) {
      if (['reserved', 'submitted-unsettled', 'settled', 'indeterminate'].includes(reservation.state)) {
        total += reservation.amountAud;
      }
    }
    return total;
  }

  _deny(code, context = {}) {
    try {
      this.auditSink.append({
        type: 'policy_decision',
        decision: 'DENY',
        code,
        policyVersion: this.policy.version,
        ...context
      });
    } catch (_) {
      throw new Error('AUDIT_FAILURE_DENY');
    }
    const error = new Error(code);
    error.code = code;
    throw error;
  }

  async authorizeAndSign(input) {
    if (this.locked) return this._deny('CONCURRENT_POLICY_EVALUATION_DENY');
    this.locked = true;
    try {
      const { providerId, domain, requestHash, challenge, amountAud, runId, callId } = input || {};
      assertFiniteNonNegative(amountAud, 'amountAud');

      if (!this.policy.allowedProviders.includes(providerId)) this._deny('PROVIDER_NOT_ALLOWED', { providerId, runId, callId });
      if (!this.policy.allowedDomains.includes(domain)) this._deny('DOMAIN_NOT_ALLOWED', { providerId, domain, runId, callId });
      if (requestHash !== this.policy.frozenRequestHash) this._deny('REQUEST_HASH_MISMATCH', { providerId, requestHash, runId, callId });
      if (!challenge || challenge.network !== this.policy.network) this._deny('NETWORK_NOT_ALLOWED', { providerId, runId, callId });
      if (challenge.asset !== this.policy.asset) this._deny('ASSET_NOT_ALLOWED', { providerId, runId, callId });

      const pinnedRecipient = this.policy.pinnedRecipients[providerId];
      if (pinnedRecipient && challenge.recipient !== pinnedRecipient) this._deny('RECIPIENT_MISMATCH', { providerId, runId, callId });
      if (!challenge.recipient) this._deny('RECIPIENT_MISSING', { providerId, runId, callId });

      if (amountAud > this.policy.maxTransactionAud) this._deny('TRANSACTION_CAP_EXCEEDED', { providerId, amountAud, runId, callId });
      if (this.exposureAud() + amountAud > this.policy.maxDailyAud) this._deny('DAILY_CAP_EXCEEDED', { providerId, amountAud, runId, callId });

      const intentHash = sha256(JSON.stringify({
        providerId,
        domain,
        requestHash,
        recipient: challenge.recipient,
        network: challenge.network,
        asset: challenge.asset,
        challengeId: challenge.id,
        amountAud,
        runId,
        callId,
        policyVersion: this.policy.version
      }));

      if (this.seenIntentHashes.has(intentHash)) this._deny('REPLAY_DENY', { providerId, intentHash, runId, callId });

      const reservationId = `${runId}:${callId}:${intentHash.slice(0, 12)}`;
      this.reservations.set(reservationId, { amountAud, state: 'reserved', intentHash });
      this.seenIntentHashes.add(intentHash);

      try {
        this.auditSink.append({
          type: 'policy_decision',
          decision: 'ALLOW',
          policyVersion: this.policy.version,
          providerId,
          domain,
          requestHash,
          challengeHash: sha256(JSON.stringify(challenge)),
          intentHash,
          amountAud,
          reservedExposureAud: this.exposureAud(),
          runId,
          callId
        });
      } catch (_) {
        this.reservations.delete(reservationId);
        throw new Error('AUDIT_FAILURE_DENY');
      }

      let signed;
      try {
        signed = await this.signerAdapter.signPaymentIntent({
          intentHash,
          providerId,
          recipient: challenge.recipient,
          network: challenge.network,
          asset: challenge.asset,
          challengeId: challenge.id,
          amount: challenge.amount,
          policyVersion: this.policy.version,
          requestHash
        });
      } catch (_) {
        this.reservations.set(reservationId, { amountAud, state: 'indeterminate', intentHash });
        throw new Error('SIGNER_FAILURE_RESERVED');
      }

      if (!signed || !signed.signatureRequestId || signed.rawPrivateKey || signed.seedPhrase) {
        this.reservations.set(reservationId, { amountAud, state: 'indeterminate', intentHash });
        throw new Error('UNSAFE_SIGNER_RESPONSE_DENY');
      }

      this.reservations.set(reservationId, { amountAud, state: 'submitted-unsettled', intentHash });
      return Object.freeze({
        allowed: true,
        reservationId,
        intentHash,
        signatureRequestId: signed.signatureRequestId,
        paymentEnvelope: signed.paymentEnvelope
      });
    } finally {
      this.locked = false;
    }
  }

  recordSettlement(reservationId, state, receiptId = null) {
    const current = this.reservations.get(reservationId);
    if (!current) throw new Error('UNKNOWN_RESERVATION');
    if (!['settled', 'indeterminate', 'submitted-unsettled'].includes(state)) throw new Error('INVALID_SETTLEMENT_STATE');
    this.reservations.set(reservationId, { ...current, state, receiptId });
    this.auditSink.append({
      type: 'settlement_state',
      reservationId,
      state,
      receiptId,
      exposureAud: this.exposureAud(),
      policyVersion: this.policy.version
    });
  }
}

module.exports = { X402PolicyGateway, sha256 };
