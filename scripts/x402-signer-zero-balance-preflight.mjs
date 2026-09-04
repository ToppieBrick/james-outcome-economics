import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const evidencePath = process.env.EVIDENCE_PATH || 'benchmark/x402-signer-zero-balance-preflight-latest.json';
const wallet = process.env.X402_PREFLIGHT_WALLET || 'james-ci-zero-balance';
const expectedNetwork = 'eip155:8453';

function run(args) {
  const raw = execFileSync('x402api', [...args, '--json'], {
    encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
  }).trim();
  return { parsed: JSON.parse(raw), digest: createHash('sha256').update(raw).digest('hex') };
}

function structuralSchema(value, path = '$', out = []) {
  if (Array.isArray(value)) {
    out.push({ path, type: 'array' });
    value.slice(0, 3).forEach((child, index) => structuralSchema(child, `${path}[${index}]`, out));
    return out;
  }
  if (value !== null && typeof value === 'object') {
    out.push({ path, type: 'object' });
    for (const [key, child] of Object.entries(value)) structuralSchema(child, `${path}.${key}`, out);
    return out;
  }
  out.push({ path, type: value === null ? 'null' : typeof value });
  return out;
}

function writeDiagnostic(balance, error) {
  const diagnosticPath = process.env.X402_SCHEMA_DIAGNOSTIC_PATH || 'benchmark/x402-balance-response-schema-latest.json';
  const diagnostic = {
    evidenceType: 'SANITIZED_BALANCE_RESPONSE_SCHEMA_ONLY', status: 'FAIL_CLOSED_DIAGNOSTIC_ONLY',
    capturedAt: new Date().toISOString(), candidate: '@x402api/agent-wallet-cli@0.2.7', network: expectedNetwork,
    responseSha256: balance.digest, schema: structuralSchema(balance.parsed),
    failureClass: String(error?.message || error).replace(/[\r\n]+/g, ' ').slice(0, 500),
    valuesRecorded: false, secretsRecorded: false, customerPaymentAuthorized: false,
    guardrail: 'Field paths and JSON types only. This artifact is not zero-balance proof, C01-C12 evidence, signer admission, benchmark evidence, or commercial approval.',
  };
  mkdirSync(diagnosticPath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  writeFileSync(diagnosticPath, `${JSON.stringify(diagnostic, null, 2)}\n`, { mode: 0o600 });
  console.error(JSON.stringify({ status: diagnostic.status, diagnosticPath, valuesRecorded: false }));
}

function parseAtomicString(value, field) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`FAIL_CLOSED: ${field} must be a canonical unsigned base-10 integer string`);
  }
  return BigInt(value);
}

function proveZeroBalance(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('FAIL_CLOSED: balance response must be an object');
  if (obj.network !== expectedNetwork) throw new Error('FAIL_CLOSED: balance response network mismatch');
  const assetAtomic = parseAtomicString(obj.assetAtomic, 'assetAtomic');
  const nativeAtomic = parseAtomicString(obj.nativeAtomic, 'nativeAtomic');
  if (assetAtomic !== 0n || nativeAtomic !== 0n) throw new Error('FAIL_CLOSED: asset or native balance is non-zero');
  return { assetAtomic, nativeAtomic };
}

const startedAt = new Date().toISOString();
const help = run(['help']);
let created;
try {
  created = run(['wallet', 'create', '--name', wallet, '--network', expectedNetwork, '--maximum-payment-atomic', '1']);
} catch (error) {
  const stderr = String(error?.stderr || '');
  if (!/already|exists/i.test(stderr)) throw error;
  created = { parsed: { reusedExistingEphemeralWallet: true }, digest: createHash('sha256').update(stderr).digest('hex') };
}
const address = run(['wallet', 'address', '--wallet', wallet]);
const balance = run(['wallet', 'balance', '--wallet', wallet]);
let zero;
try {
  zero = proveZeroBalance(balance.parsed);
} catch (error) {
  writeDiagnostic(balance, error);
  throw error;
}

const evidence = {
  evidenceType: 'ZERO_BALANCE_NETWORK_PREFLIGHT_ONLY', status: 'PASS_FOR_C01_C12_EXECUTION_PRECONDITION_ONLY',
  startedAt, completedAt: new Date().toISOString(), candidate: '@x402api/agent-wallet-cli@0.2.7', network: expectedNetwork,
  rpcClass: 'credential-free HTTPS RPC supplied by CI', walletName: wallet,
  zeroAssetBalanceObserved: zero.assetAtomic === 0n, zeroNativeBalanceObserved: zero.nativeAtomic === 0n,
  observedAssetAtomic: zero.assetAtomic.toString(), observedNativeAtomic: zero.nativeAtomic.toString(),
  commandOutputDigests: { helpSha256: help.digest, walletCreateSha256: created.digest, walletAddressSha256: address.digest, walletBalanceSha256: balance.digest },
  publicAddressObservation: address.parsed, spendUsd: 0, fundsMoved: false, paidExecutionObserved: false,
  customerPaymentAuthorized: false, secretsRecorded: false,
  guardrail: 'This artifact is not C01-C12 conformance, signer admission, benchmark evidence, or commercial approval. It proves only that the pinned CLI can execute in network-capable CI against an isolated zero-balance wallet without founder secret material.',
};
mkdirSync(evidencePath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: evidence.status, evidencePath, zeroAssetBalance: true, zeroNativeBalance: true }));
