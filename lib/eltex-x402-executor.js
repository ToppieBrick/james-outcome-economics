'use strict';

const { URL } = require('node:url');

const ELTEX_ORIGIN = 'https://eltexlabs.com';
const ELTEX_BASE = `${ELTEX_ORIGIN}/v1`;

function normalizeAllowedDomains(domains) {
  return Object.freeze([...(domains || [])].map((d) => String(d).trim().toLowerCase()).filter(Boolean));
}

function assertPublicHttpsTarget(rawUrl, allowedDomains) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch (_) { throw new Error('TARGET_URL_INVALID'); }
  if (parsed.protocol !== 'https:') throw new Error('TARGET_HTTPS_REQUIRED');
  if (parsed.username || parsed.password) throw new Error('TARGET_CREDENTIALS_DENY');
  const host = parsed.hostname.toLowerCase();
  if (!allowedDomains.includes(host)) throw new Error('TARGET_DOMAIN_NOT_ALLOWED');
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('TARGET_LOCAL_DENY');
  return parsed.toString();
}

function sanitizeResponse(value) {
  if (!value || typeof value !== 'object') return value;
  const forbidden = new Set(['authorization', 'apiKey', 'api_key', 'privateKey', 'private_key', 'seedPhrase', 'seed_phrase', 'mnemonic', 'secret']);
  const walk = (input) => {
    if (Array.isArray(input)) return input.map(walk);
    if (!input || typeof input !== 'object') return input;
    const out = {};
    for (const [key, val] of Object.entries(input)) {
      if (forbidden.has(key)) continue;
      out[key] = walk(val);
    }
    return out;
  };
  return walk(value);
}

class EltexX402Executor {
  constructor({ agentId, credentialProvider, allowedDomains, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
    if (!agentId) throw new Error('ELTEX_AGENT_ID_REQUIRED');
    if (typeof credentialProvider !== 'function') throw new Error('ELTEX_CREDENTIAL_PROVIDER_REQUIRED');
    if (typeof fetchImpl !== 'function') throw new Error('FETCH_REQUIRED');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('INVALID_TIMEOUT');
    this.agentId = agentId;
    this.credentialProvider = credentialProvider;
    this.allowedDomains = normalizeAllowedDomains(allowedDomains);
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    Object.freeze(this.allowedDomains);
  }

  async _request(path, { method = 'GET', body, idempotencyKey } = {}) {
    if (!['/agentic-wallet/balance', '/agentic-wallet/preflight', '/agentic-wallet/x402/fetch'].includes(path)) {
      throw new Error('ELTEX_OPERATION_NOT_ALLOWED');
    }
    const credential = await this.credentialProvider();
    if (typeof credential !== 'string' || credential.length < 8) throw new Error('ELTEX_CREDENTIAL_UNAVAILABLE');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' };
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
      const response = await this.fetchImpl(`${ELTEX_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      let payload = null;
      try { payload = await response.json(); } catch (_) { payload = null; }
      const safePayload = sanitizeResponse(payload);
      if (!response.ok) {
        const error = new Error('ELTEX_REQUEST_DENIED_OR_FAILED');
        error.httpStatus = response.status;
        error.details = safePayload;
        throw error;
      }
      return Object.freeze({ status: response.status, requestId: response.headers?.get?.('x-request-id') || null, data: safePayload });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('ELTEX_REQUEST_TIMEOUT_INDETERMINATE');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async readBalance() {
    return this._request(`/agentic-wallet/balance?agent_id=${encodeURIComponent(this.agentId)}`);
  }

  async preflight({ network = 'base', url, method = 'GET', maxValue, idempotencyKey }) {
    const safeUrl = assertPublicHttpsTarget(url, this.allowedDomains);
    if (network !== 'base') throw new Error('NETWORK_NOT_ALLOWED');
    if (!idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
    if (!/^\d+(\.\d{1,6})?$/.test(String(maxValue))) throw new Error('MAX_VALUE_INVALID');
    return this._request('/agentic-wallet/preflight', {
      method: 'POST',
      idempotencyKey,
      body: { agentId: this.agentId, network, url: safeUrl, method, maxValue: String(maxValue) }
    });
  }

  async fetchPaidResource({ network = 'base', url, method = 'GET', maxValue, idempotencyKey }) {
    const safeUrl = assertPublicHttpsTarget(url, this.allowedDomains);
    if (network !== 'base') throw new Error('NETWORK_NOT_ALLOWED');
    if (!idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
    if (!/^\d+(\.\d{1,6})?$/.test(String(maxValue))) throw new Error('MAX_VALUE_INVALID');
    return this._request('/agentic-wallet/x402/fetch', {
      method: 'POST',
      idempotencyKey,
      body: { agentId: this.agentId, network, url: safeUrl, method, maxValue: String(maxValue) }
    });
  }
}

module.exports = { EltexX402Executor, assertPublicHttpsTarget, sanitizeResponse, ELTEX_BASE };
