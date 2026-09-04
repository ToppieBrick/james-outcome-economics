# x402api Agent Wallet CLI — signer candidate admission plan

Date: 2026-09-04
Status: TEST ONLY / NOT APPROVED FOR FUNDING

## Why this candidate

Current public documentation for x402api Agent Wallet CLI v0.2.7 describes a headless signing boundary with locally encrypted keys, durable payment attempts, exact request-envelope authorization, stablecoin-only launch profiles, and explicit guidance that agents must not receive raw spending keys or generic signing primitives.

This is a candidate implementation only. Documentation is not evidence of conformance and does not alter the Relay/QA gate.

## Required architecture

James/model -> purpose-specific merchant purchase adapter -> deterministic policy validation -> isolated Agent Wallet CLI/core -> exact saved request submission -> authoritative merchant outcome/reconciliation.

James/model MUST NOT receive private keys, seed phrases, unlock material, keystore content, complete payment signatures, generic sign_transaction/pay_url capability, merchant credentials, or policy mutation authority.

## Admission constraints

1. Run only in a network-capable isolated test environment.
2. Starting spendable balance MUST be zero for C01-C12 conformance.
3. No founder funding until all C01-C12 controls pass and Relay independently accepts the evidence.
4. Pin exact package/version and record provenance/hash before testing.
5. Purpose-specific adapter constructs the exact merchant request; model-supplied arbitrary URL/method/body/payment terms are rejected.
6. Policy validation occurs before signer invocation and binds origin, route, method, product/task, network, asset, amount, recipient, expiry and request digest.
7. Per-transaction limit <= A$25 equivalent and daily limit <= A$40 equivalent; stricter benchmark-specific caps may apply.
8. Ambiguous outcomes reuse/reconcile the same durable attempt and exact authorization; they MUST NOT silently create a replacement payment.
9. Any secret exposure, unexpected funds movement, generic signing path, policy bypass/mutation, recipient/network/asset substitution acceptance, replay acceptance, or fail-open condition is automatic FAIL.
10. Successful C01-C12 produces PASS_FOR_RELAY_REVIEW only. It does not authorize funding, paid benchmarking, customer checkout or delivery.

## C01-C12 execution objective

Execute the repository's frozen signer-conformance contract against this candidate without weakening any existing case. Evidence must populate the existing machine-auditable evidence envelope and pass the repository validator.

Particular attention:
- process/context isolation;
- exact request binding;
- immutable pre-sign policy;
- recipient/network/asset substitution denial;
- per-call/session/daily cap denial;
- malformed/expired challenge denial;
- nonce/payment-identifier replay denial;
- exact retry after timeout/202/503 or other ambiguous outcome;
- append-only auditable decision evidence;
- no secret-bearing fields in James-visible output/logs.

## After Relay signer approval

Only after independent signer approval may an operator fund the dedicated isolated wallet within existing founder-authorized limits. Then execute the frozen real, non-synthetic paid exact-task benchmark. Do not use testnet/synthetic payment as commercial evidence.

## Commercial gate remains unchanged

No external customer payment and no promise of delivery is permitted until independent Relay/QA records APPROVED_FOR_LIMITED_PILOT after the complete market-readiness gate, including real paid benchmark evidence and end-to-end dry run.

Spend recorded by this document: A$0
Revenue evidenced by this document: A$0
Secrets handled: none
