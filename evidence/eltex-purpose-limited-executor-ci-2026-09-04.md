# ELTEX purpose-limited x402 executor — CI evidence

Date: 2026-09-04 (Australia/Sydney)
Status: TEST_ONLY — NOT NETWORK VALIDATION — NOT APPROVED_FOR_LIMITED_PILOT

## Material change

The ELTEX integration boundary is implemented as a purpose-limited x402 executor rather than a generic signer abstraction. Current ELTEX Agentic Wallet documentation presents mediated wallet operations including balance, preflight and x402/fetch; the product code therefore does not expose transfer or generic signing capabilities to James.

Implemented code:
- `lib/eltex-x402-executor.js`
- implementation correction commit: `9ec60405d87171a39d1eb82c0e14fdea32f26d18`
- fail-closed test commit: `4255af4866058ccdc2a692531723ea72e28aef35`

## Controls covered in CI

- only balance, preflight and x402/fetch ELTEX routes are callable through the executor;
- no transfer, generic sign, or `signPaymentIntent` method is exposed;
- target resource must be HTTPS and on an explicit hostname allowlist;
- Base is the only locally accepted network for this benchmark boundary;
- an idempotency key is mandatory before a paid-resource request;
- credentials are obtained at call time and are not returned by the executor;
- known secret-bearing response fields are recursively removed before data is returned or attached to an error;
- an error/ambiguous provider response is surfaced once and is not automatically retried.

GitHub Actions evidence:
- workflow: Test
- run: 33775695072
- head SHA: `4255af4866058ccdc2a692531723ea72e28aef35`
- conclusion: SUCCESS

## Truth boundary

This record proves local/CI behavior only. It does NOT prove:
- a live ELTEX credential or grant exists;
- the credential is safely provisioned outside model-visible context;
- a live wallet has zero balance;
- network-capable C01-C12 conformance has passed;
- any payment was signed, submitted or settled;
- any paid benchmark evidence exists;
- Relay/QA approval has been granted;
- checkout or external paid delivery may be enabled.

No private key, seed phrase, wallet secret, payment secret, funding, spend, customer payment, revenue or traction was created or observed in this change.

## Next gate

Provision a dedicated ELTEX Agentic Wallet grant/credential outside model-visible context with zero balance and restrictive policy. Then execute network-capable machine-observed conformance and submit the resulting secret-free evidence to independent Relay/QA. Funding remains prohibited until that signer-boundary review passes. The separate market-readiness gate remains mandatory before any customer payment or delivery promise.

Truth counters at record time: spend A$0; funding A$0; verified revenue A$0; customer checkout disabled.
