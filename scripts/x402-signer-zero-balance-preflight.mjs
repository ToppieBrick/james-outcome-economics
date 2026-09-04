import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const evidencePath = process.env.EVIDENCE_PATH || 'benchmark/x402-signer-zero-balance-preflight-latest.json';
const wallet = process.env.X402_PREFLIGHT_WALLET || 'james-ci-zero-balance';

function run(args) {
  const raw = execFileSync('x402api', [...args, '--json'], {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  }).trim();
  const parsed = JSON.parse(raw);
  return { parsed, digest: createHash('sha256').update(raw).digest('hex') };
}

function numericBalance(obj) {
  const candidates = [
    obj?.balanceAtomic,
    obj?.assetBalanceAtomic,
    obj?.spendableAtomic,
    obj?.balance?.atomic,
    obj?.balance?.amountAtomic,
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && /^-?\d+$/.test(String(value))) return BigInt(String(value));
  }
  throw new Error('Unable to locate an integer atomic balance in wallet balance output');
}

const startedAt = new Date().toISOString();
const help = run(['help']);
let created;
try {
  created = run(['wallet', 'create', '--name', wallet, '--network', 'eip155:8453', '--maximum-payment-atomic', '1']);
} catch (error) {
  const stderr = String(error?.stderr || '');
  if (!/already|exists/i.test(stderr)) throw error;
  created = { parsed: { reusedExistingEphemeralWallet: true }, digest: createHash('sha256').update(stderr).digest('hex') };
}
const address = run(['wallet', 'address', '--wallet', wallet]);
const balance = run(['wallet', 'balance', '--wallet', wallet]);
const atomic = numericBalance(balance.parsed);
if (atomic !== 0n) throw new Error(`FAIL_CLOSED: wallet balance is non-zero (${atomic})`);

const evidence = {
  evidenceType: 'ZERO_BALANCE_NETWORK_PREFLIGHT_ONLY',
  status: 'PASS_FOR_C01_C12_EXECUTION_PRECONDITION_ONLY',
  startedAt,
  completedAt: new Date().toISOString(),
  candidate: '@x402api/agent-wallet-cli@0.2.7',
  network: 'eip155:8453',
  rpcClass: 'credential-free HTTPS RPC supplied by CI',
  walletName: wallet,
  zeroSpendableBalanceObserved: true,
  observedBalanceAtomic: atomic.toString(),
  commandOutputDigests: {
    helpSha256: help.digest,
    walletCreateSha256: created.digest,
    walletAddressSha256: address.digest,
    walletBalanceSha256: balance.digest,
  },
  publicAddressObservation: address.parsed,
  spendUsd: 0,
  fundsMoved: false,
  paidExecutionObserved: false,
  customerPaymentAuthorized: false,
  secretsRecorded: false,
  guardrail: 'This artifact is not C01-C12 conformance, signer admission, benchmark evidence, or commercial approval. It proves only that the pinned CLI can execute in network-capable CI against an isolated zero-balance wallet without founder secret material.',
};

mkdirSync(evidencePath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: evidence.status, evidencePath, zeroBalance: true }));
