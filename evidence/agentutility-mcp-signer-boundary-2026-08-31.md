# AgentUtility MCP signer-boundary assessment — 2026-08-31

## Decision

**Do not connect the documented AgentUtility MCP payment client directly to the James runtime.** Its documented setup supplies `X402_PRIVATE_KEY` to the MCP process. That violates the project boundary that payment secrets must not be model-readable or available to the general agent process.

This is a compatibility decision, not a claim that AgentUtility MCP is insecure. The issue is mismatch with James's stricter trust boundary.

## Observed upstream capability

First-party AgentUtility MCP documentation describes 17 cluster servers / 799 tools and automated x402 payment handling. The documented client receives an `X402_PRIVATE_KEY`, signs EIP-3009 USDC transfer authorizations, and executes the HTTP 402 payment/retry lifecycle on Base.

Source: https://agentutility.ai/mcp/
Observed: 2026-08-31

No James signature, settlement, paid request, secret access, or wallet operation was performed for this assessment.

## Required compatibility boundary

AgentUtility can only become an execution adapter for James if payment authority is moved behind a purpose-specific isolated signer/sidecar whose secret is inaccessible to the model and general benchmark process.

The benchmark-facing process may submit only a validated payment intent containing:

- benchmark task ID / fingerprint
- canonical provider identity
- exact endpoint host + method
- fresh authoritative HTTP 402 terms
- Base mainnet network identity (`eip155:8453`)
- approved USDC asset
- pre-enrolled `payTo`
- exact amount within configured per-payment and session ceilings
- nonce / idempotency identity
- quote expiry

The signer must independently reject any mismatch before signing and must return only a settlement/receipt artifact required by the paid-attempt evidence contract.

## Existing James controls that remain authoritative

This assessment does not replace existing controls. Any future adapter must conform to:

- `benchmark/payment-capability.required.json`
- `benchmark/validate-payment-intent.js`
- paid-attempt evidence schema / ingestion gate
- fresh authoritative HTTP-402 benchmark-eligibility gate
- externally enforced kill switch and spend ceilings

## Acceptance test before integration

A future AgentUtility adapter is eligible for integration testing only if a no-secret conformance test proves all of the following without making a payment:

1. the benchmark process cannot read/export signer key material;
2. signing is impossible when kill switch is absent/off;
3. task/provider/endpoint/method/payTo/network/asset/amount/nonce/expiry are independently bound;
4. stale or non-402 quote evidence is rejected;
5. unknown recipients and host/method drift are rejected;
6. per-call/session ceilings are enforced outside the model;
7. nonce replay is rejected;
8. successful settlement would return the receipt fields required by the paid-attempt evidence contract.

Until those conditions are demonstrated, status is **PAYMENT_CAPABILITY_INCOMPATIBLE_WITH_CURRENT_TRUST_BOUNDARY**, not benchmark failure and not provider-quality failure.
