'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { executableHttp, evaluateSafetyGate } = require('../benchmark/preflight-safety-gate');

test('blocks executable endpoint for quarantined provider', () => {
  const evidence = { providers: [{ provider: 'AgentUtility', endpoint: 'https://api.agentutility.ai/search' }] };
  const quarantine = { providers: [{ provider: 'agentutility', status: 'quarantined' }] };
  const { unsafe } = evaluateSafetyGate(evidence, quarantine);
  assert.equal(unsafe.length, 1);
});

test('provider identity matching is case and surrounding-whitespace insensitive', () => {
  const evidence = { providers: [{ provider: ' AgentUtility ', endpoint: 'https://api.agentutility.ai/search' }] };
  const quarantine = { providers: [{ provider: 'agentutility', status: 'quarantined' }] };
  const { unsafe } = evaluateSafetyGate(evidence, quarantine);
  assert.equal(unsafe.length, 1);
});

test('allows quarantined provider only when evidence endpoint is deliberately non-executable', () => {
  const evidence = { providers: [{ provider: 'agentutility', endpoint: null }] };
  const quarantine = { providers: [{ provider: 'agentutility', status: 'quarantined' }] };
  const { unsafe } = evaluateSafetyGate(evidence, quarantine);
  assert.equal(unsafe.length, 0);
});

test('does not block an executable endpoint for a provider that is not quarantined', () => {
  const evidence = { providers: [{ provider: 'tavily', endpoint: 'https://example.tavily.com/search' }] };
  const quarantine = { providers: [{ provider: 'agentutility', status: 'quarantined' }] };
  const { unsafe } = evaluateSafetyGate(evidence, quarantine);
  assert.equal(unsafe.length, 0);
});

test('rejects non-http and placeholder hosts as executable evidence', () => {
  assert.equal(executableHttp('ftp://provider.test/search'), false);
  assert.equal(executableHttp('https://placeholder.example/search'), false);
  assert.equal(executableHttp('https://example/search'), false);
  assert.equal(executableHttp('https://provider.test/search'), true);
});
