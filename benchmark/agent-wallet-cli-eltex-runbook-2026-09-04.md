# Agent Wallet CLI v0.2.7 — zero-balance ELTEX execution runbook

Date: 2026-09-04
Status: TEST ONLY / NO FUNDING / NO CUSTOMER PAYMENT

## Objective

Convert the admitted x402api Agent Wallet CLI candidate into network-capable C01-C12 evidence without handling founder secrets or moving funds. This runbook is an execution handoff, not conformance evidence.

## Pinned candidate

- Package: `@x402api/agent-wallet-cli@0.2.7`
- Matching core/skill only; record npm provenance and package digest at execution time.
- Node.js 22+ isolated host/container.
- Credential-free HTTPS RPC endpoints only.
- Dedicated wallet with ZERO spendable balance throughout C01-C12.

Public documentation states v0.2.7 is published but production mainnet evidence remains gated. Treat all documentation claims as hypotheses until observed in ELTEX.

## Secret boundary

Operator/untrusted-model separation is mandatory:

`James/model -> purpose-specific merchant test adapter -> deterministic policy -> isolated wallet CLI/core -> exact request artifact`

James/model MUST NOT receive or log: passphrase, seed, private key, encrypted keystore bytes, backup, payment artifact, complete signature, RPC credential, generic signing primitive, or policy-mutation authority.

If unlock material is required, it is supplied only by an operator-supervised stdin flow or owner-only password file outside model/tool context. If that cannot be arranged, mark BLOCKED_SECRET_BOUNDARY and continue non-secret work; do not request the secret.

## Zero-balance setup

1. Create isolated filesystem identity and owner-only directories for wallet, attempts and logs.
2. Install exact pinned release; capture package provenance/digest and `x402api help --json` output with secret-bearing fields redacted by trusted code.
3. Create one dedicated Base test wallet with `maximumPaymentAtomic` set to a non-zero test ceiling but DO NOT FUND IT.
4. Independently observe public-chain balance = 0 for the wallet address immediately before C01 and after C12.
5. No ETH/SOL/native token funding. No faucet funds. No testnet/synthetic settlement may be represented as paid benchmark evidence.

## Purpose-specific test adapter

The adapter exposes only a frozen test operation such as `authorize_benchmark_probe(test_case_id)`. It constructs the URL/method/body/product/payment envelope from a test fixture. Model-supplied arbitrary URL, body, recipient, network, asset, amount, expiry or payment terms are rejected before wallet invocation.

Policy binds at minimum: origin, route, HTTP method, product/task ID, network, asset, amount, recipient, expiry, challenge digest, request digest and unique payment/attempt identifier.

## C01-C12 observed execution

Execute the repository's frozen signer-conformance contract unchanged. For every case record: UTC timestamp, candidate version/hash, fixture hash, policy hash, command/adapter version, exit code/stable error code, decision, signature-created boolean, settlement-observed boolean, funds-moved boolean, secret-exposure boolean, and append-only log digest.

Required adversarial coverage includes:

- process/context isolation and absence of secret-bearing output;
- denial of generic signing/pay-URL capability through James-visible interface;
- policy-before-sign ordering;
- origin/route/method/body/product request-binding mutation denial;
- recipient substitution denial;
- network and asset substitution denial;
- amount/per-call and cumulative/daily cap denial;
- malformed, expired or changed challenge denial;
- duplicate/replay authorization denial;
- timeout/202/503/ambiguous outcome reuses and reconciles the SAME durable attempt rather than creating replacement authorization;
- immutable/append-only decision evidence sufficient for Relay review.

Any unexpected signature, funds movement, secret exposure, policy bypass/mutation, fail-open result, replacement payment on ambiguity, or inability to prove zero balance is automatic FAIL and terminates the run.

## Evidence completion

Populate `benchmark/signer-conformance-evidence-template-2026-09-04.json` only from observed artifacts. Do not infer PASS from documentation. Run the repository evidence validator. A successful validator result is `PASS_FOR_RELAY_REVIEW` only.

Relay independently decides signer admission. C01-C12 success does NOT authorize wallet funding, paid benchmarking, customer checkout, customer delivery or `APPROVED_FOR_LIMITED_PILOT`.

## Immediate post-admission path

Only after independent signer admission may an operator fund the dedicated wallet within existing limits (<= A$25 per transaction; <= A$40/day). Then execute the already-frozen real, non-synthetic exact-task paid benchmark. Commercial checkout remains disabled until the separate complete Relay/QA market-readiness gate records `APPROVED_FOR_LIMITED_PILOT`.

Spend recorded by this runbook: A$0
Revenue evidenced by this runbook: A$0
Secrets handled by this runbook: none
