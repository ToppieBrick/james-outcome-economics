'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EltexX402Executor, sanitizeResponse } = require('../lib/eltex-x402-executor');

function fakeResponse({ ok = true, status = 200, body = {}, requestId = 'req-1' } = {}) {
  return {
    ok,
    status,
    headers: { get: (name) => String(name).toLowerCase() === 'x-request-id' ? requestId : null },
    async json() { return body; }
  };
}

function makeExecutor(fetchImpl) {
  return new EltexX402Executor({
    agentId: 'agt_test',
    credentialProvider: async () => 'test-credential-not-real',
    allowedDomains: ['api.tavily.com'],
    fetchImpl
  });
}

test('executor exposes no generic transfer or signing capability', () => {
  const executor = makeExecutor(async () => fakeResponse());
  assert.equal(typeof executor.fetchPaidResource, 'function');
  assert.equal(typeof executor.preflight, 'function');
  assert.equal(typeof executor.readBalance, 'function');
  assert.equal(executor.transfer, undefined);
  assert.equal(executor.sign, undefined);
  assert.equal(executor.signPaymentIntent, undefined);
});

test('target domain must be explicitly allowlisted and HTTPS', async () => {
  const calls = [];
  const executor = makeExecutor(async (...args) => { calls.push(args); return fakeResponse(); });
  await assert.rejects(() => executor.fetchPaidResource({ url: 'https://evil.example/search', maxValue: '0.01', idempotencyKey: 'k1' }), /TARGET_DOMAIN_NOT_ALLOWED/);
  await assert.rejects(() => executor.fetchPaidResource({ url: 'http://api.tavily.com/search', maxValue: '0.01', idempotencyKey: 'k2' }), /TARGET_HTTPS_REQUIRED/);
  assert.equal(calls.length, 0);
});

test('only Base network is accepted locally', async () => {
  const calls = [];
  const executor = makeExecutor(async (...args) => { calls.push(args); return fakeResponse(); });
  await assert.rejects(() => executor.fetchPaidResource({ network: 'solana', url: 'https://api.tavily.com/search', maxValue: '0.01', idempotencyKey: 'k1' }), /NETWORK_NOT_ALLOWED/);
  assert.equal(calls.length, 0);
});

test('idempotency key is mandatory before any paid request', async () => {
  const calls = [];
  const executor = makeExecutor(async (...args) => { calls.push(args); return fakeResponse(); });
  await assert.rejects(() => executor.fetchPaidResource({ url: 'https://api.tavily.com/search', maxValue: '0.01' }), /IDEMPOTENCY_KEY_REQUIRED/);
  assert.equal(calls.length, 0);
});

test('paid request uses only ELTEX mediated x402 route and preserves idempotency key', async () => {
  const calls = [];
  const executor = makeExecutor(async (url, options) => { calls.push({ url, options }); return fakeResponse({ body: { ok: true } }); });
  const result = await executor.fetchPaidResource({ url: 'https://api.tavily.com/search', maxValue: '0.01', idempotencyKey: 'bench-run-1-call-1' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://eltexlabs.com/v1/agentic-wallet/x402/fetch');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Idempotency-Key'], 'bench-run-1-call-1');
  assert.equal(result.requestId, 'req-1');
});

test('credential is used only in outbound authorization header and never returned', async () => {
  const executor = makeExecutor(async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-credential-not-real');
    return fakeResponse({ body: { ok: true, api_key: 'leak', nested: { seedPhrase: 'leak', safe: 1 } } });
  });
  const result = await executor.readBalance();
  assert.deepEqual(result.data, { ok: true, nested: { safe: 1 } });
  assert.equal(JSON.stringify(result).includes('test-credential-not-real'), false);
  assert.equal(JSON.stringify(result).includes('seedPhrase'), false);
});

test('error payload is sanitized and request is not automatically retried', async () => {
  let count = 0;
  const executor = makeExecutor(async () => {
    count += 1;
    return fakeResponse({ ok: false, status: 409, body: { error: { code: 'idempotency_request_in_progress' }, secret: 'never-return' } });
  });
  await assert.rejects(async () => {
    try {
      await executor.fetchPaidResource({ url: 'https://api.tavily.com/search', maxValue: '0.01', idempotencyKey: 'same-key' });
    } catch (error) {
      assert.equal(error.httpStatus, 409);
      assert.equal(JSON.stringify(error.details).includes('never-return'), false);
      throw error;
    }
  }, /ELTEX_REQUEST_DENIED_OR_FAILED/);
  assert.equal(count, 1);
});

test('sanitizer recursively strips known secret-bearing fields', () => {
  assert.deepEqual(sanitizeResponse({ authorization: 'x', nested: { privateKey: 'y', value: 1 } }), { nested: { value: 1 } });
});
