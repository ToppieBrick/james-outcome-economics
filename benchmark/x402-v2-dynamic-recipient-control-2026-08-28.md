# x402 V2 dynamic-recipient control — 2026-08-28

## Observed protocol evidence

x402 V2 explicitly formalizes dynamic payment recipients as part of the protocol evolution. The official x402 Foundation launch note states V2 adds dynamic payment recipients, wallet-based identity, automatic API discovery, additional network/payment support, and a modular SDK.

Source: https://x402.org/x402-v2-launch/
Observed: 2026-08-28

The x402 Foundation also reports the protocol is now operating at large production scale, with the public homepage showing tens of millions of transactions in the trailing 30 days. This is ecosystem evidence only; it is not James benchmark outcome evidence.

Source: https://x402.org/
Observed: 2026-08-28

## Outcome Economics implication

A fresh HTTP 402 can legitimately contain a recipient that was not hard-coded when the benchmark harness was written. Accepting any dynamically supplied recipient would, however, weaken James's current payment boundary and create an avoidable redirection risk.

Therefore James remains fail-closed:

1. Dynamic recipients are protocol-valid but **not automatically payment-authorized**.
2. Before signing, the payee must resolve to a recipient already enrolled for the canonical provider/endpoint, or be promoted through a separate trusted enrollment step outside the LLM execution path.
3. A fresh quote alone is insufficient to authorize a new payee.
4. Provider + endpoint + method + task fingerprint + recipient + network + asset + amount + nonce + expiry remain bound into the audit record.
5. A changed recipient for an already approved endpoint is treated as `recipient-drift` and blocks payment until re-enrolled.

## Benchmark consequence

This does not change the structured-search cohort or create paid evidence. It changes only the machine-payment admission control required before a paid call can be attempted.

Status: observed protocol evidence; payment execution still blocked until an isolated signer/wallet capability is connected.
