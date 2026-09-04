# Isolated x402 signer candidate assessment — 2026-09-04

Status: EVIDENCE_ONLY / NOT APPROVED / NO FUNDING

## Purpose
Shorten the path to C01–C12 network conformance without exposing or requesting founder secrets.

## Candidate: tx402 v0.2.0
Public documentation observed 2026-09-04 describes a non-custodial buyer SDK with policy evaluation and atomic budget reservation before signer invocation. Documented controls include per-request, hourly and lifetime caps, network allowlists, recipient pinning, shared spend stores, typed payment-state errors and explicit handling of ambiguous payments.

## Important limitation
The candidate documentation explicitly states that v0.2.0 does not protect the spending path against a fully compromised application that already holds the signer; signer mediation is described as future work. Therefore tx402 MUST NOT be treated as satisfying James's no-secret isolated signer boundary merely because its policy layer passes tests.

## James boundary decision
Use tx402 only as a candidate policy/client component behind an independently isolated signer service. James/model context must never receive the private key, seed phrase, wallet unlock material, generic signing primitive or policy-mutation authority.

Required architecture remains:
James -> purpose-limited purchase adapter -> deterministic policy/client -> isolated signer service -> x402 settlement.

The isolated signer service must independently bind the exact canonical request/challenge digest, network, asset, recipient, amount, policy version and unique payment identifier before producing only the purpose-approved signature/transaction. It must fail closed on ambiguity and retain auditable decision evidence.

## C01–C12 consequence
No control may be marked PASS from documentation or synthetic tests. Network-capable zero-balance execution remains mandatory. The candidate can reduce implementation effort but cannot lower the acceptance contract.

## Spend/funding state
A$0 spent. A$0 authorised for benchmark settlement until C01–C12 independently pass and Relay approves the signer boundary. No secrets handled.

## Commercial state
Customer checkout remains DENY until independent Relay/QA records APPROVED_FOR_LIMITED_PILOT. This assessment grants no commercial approval.
