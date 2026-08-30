'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const validator = path.join(__dirname, '..', 'benchmark', 'validate-connected-payment-capability.js');
const requiredSource = path.join(__dirname, '..', 'benchmark', 'payment-capability.required.json');

function runGate(connected) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'james-payment-gate-'));
  try {
    fs.copyFileSync(validator, path.join(dir, 'validate-connected-payment-capability.js'));
    fs.copyFileSync(requiredSource, path.join(dir, 'payment-capability.required.json'));
    if (connected !== undefined) {
      fs.writeFileSync(path.join(dir, 'payment-capability.connected.json'), JSON.stringify(connected));
    }
    return spawnSync(process.execPath, [path.join(dir, 'validate-connected-payment-capability.js')], { encoding: 'utf8' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function validConnected(overrides = {}) {
  return {
    provider: 'coinbase-agentic-wallet-mcp',
    network: 'Base',
    asset: 'USDC',
    tools: ['check_payment_requirements', 'make_x402_request', 'get_wallet_balance'],
    rawPrivateKeyAgentReadable: false,
    agentCanChangeSpendingLimits: false,
    agentCanTransferArbitrarily: false,
    agentCanAddFunds: false,
    perCallCapUsd: 0.025,
    sessionCapUsd: 1,
    providerAllowlistEnforced: true,
    recipientEnrollmentEnforced: true,
    auditReceiptRequired: true,
    killSwitchEnabled: true,
    ...overrides
  };
}

test('fails closed when connected capability evidence is absent', () => {
  const result = runGate(undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /paid execution remains blocked/);
});

test('rejects a capability that exceeds the configured per-call ceiling', () => {
  const result = runGate(validConnected({ perCallCapUsd: 0.026 }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /per-call cap must be <= USD 0.025/);
});

test('rejects agent-readable private key capability', () => {
  const result = runGate(validConnected({ rawPrivateKeyAgentReadable: true }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /raw private key must not be agent-readable/);
});

test('rejects missing out-of-model recipient enrollment', () => {
  const result = runGate(validConnected({ recipientEnrollmentEnforced: false }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /recipient enrollment must be enforced outside the model/);
});

test('accepts only a bounded capability satisfying all declared controls', () => {
  const result = runGate(validConnected());
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.eligibleForPaidBenchmark, true);
  assert.equal(output.perCallCapUsd, 0.025);
  assert.equal(output.sessionCapUsd, 1);
});
