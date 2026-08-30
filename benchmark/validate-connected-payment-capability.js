'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_FILE = path.join(__dirname, 'payment-capability.required.json');
const CONNECTED_FILE = path.join(__dirname, 'payment-capability.connected.json');

function fail(message) {
  console.error(JSON.stringify({ eligibleForPaidBenchmark: false, reason: message }, null, 2));
  process.exitCode = 1;
}

function main() {
  const required = JSON.parse(fs.readFileSync(REQUIRED_FILE, 'utf8'));
  if (!fs.existsSync(CONNECTED_FILE)) {
    return fail('payment-capability.connected.json is absent; paid execution remains blocked.');
  }

  const connected = JSON.parse(fs.readFileSync(CONNECTED_FILE, 'utf8'));
  const errors = [];
  const tools = new Set(connected.tools || []);
  for (const tool of ['check_payment_requirements', 'make_x402_request', 'get_wallet_balance']) {
    if (!tools.has(tool)) errors.push(`missing required tool: ${tool}`);
  }

  if (connected.provider !== 'coinbase-agentic-wallet-mcp') errors.push('provider must be coinbase-agentic-wallet-mcp');
  if (connected.network !== 'Base') errors.push('network must be Base');
  if (connected.asset !== 'USDC') errors.push('asset must be USDC');
  if (connected.rawPrivateKeyAgentReadable !== false) errors.push('raw private key must not be agent-readable');
  if (connected.agentCanChangeSpendingLimits !== false) errors.push('agent must not be able to change spending limits');
  if (connected.agentCanTransferArbitrarily !== false) errors.push('agent must not be able to make arbitrary transfers');
  if (connected.agentCanAddFunds !== false) errors.push('agent must not be able to add funds');

  const perCall = Number(connected.perCallCapUsd);
  const session = Number(connected.sessionCapUsd);
  if (!Number.isFinite(perCall) || perCall > required.executionControls.perPaymentUsdCap) {
    errors.push(`per-call cap must be <= USD ${required.executionControls.perPaymentUsdCap}`);
  }
  if (!Number.isFinite(session) || session > required.executionControls.sessionUsdCap) {
    errors.push(`session cap must be <= USD ${required.executionControls.sessionUsdCap}`);
  }

  if (!connected.providerAllowlistEnforced) errors.push('provider allowlist must be enforced outside the model');
  if (!connected.recipientEnrollmentEnforced) errors.push('recipient enrollment must be enforced outside the model');
  if (!connected.auditReceiptRequired) errors.push('audit receipt capture must be enabled');
  if (!connected.killSwitchEnabled) errors.push('kill switch must be enabled');

  if (errors.length) {
    console.error(JSON.stringify({ eligibleForPaidBenchmark: false, errors }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({
    eligibleForPaidBenchmark: true,
    provider: connected.provider,
    network: connected.network,
    asset: connected.asset,
    perCallCapUsd: perCall,
    sessionCapUsd: session,
    founderTransactionLimitAud: required.executionControls.founderTransactionLimitAud,
    founderDailyLimitAud: required.executionControls.founderDailyLimitAud,
    note: 'Capability gate passed. Individual live 402 quotes must still pass endpoint, recipient, network, asset, amount, freshness and request-equivalence checks before payment.'
  }, null, 2));
}

main();
