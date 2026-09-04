# Isolated x402 signer candidate assessment — 2026-09-04

Status: CANDIDATE_ONLY / NOT APPROVED / NO FUNDING

## Purpose
Shorten time to a C01–C12 network-capable signer test without weakening the no-secret boundary.

## Candidate
QBT-Labs/x402 documents a six-layer design including an encrypted vault, an `x402-signer` isolated process, a separate policy engine, spend/recipient/chain controls and audit logging. This is materially closer to James's required architecture than libraries that keep a hot signer in the application process.

## Required architecture remains
James/model -> purpose-limited purchase adapter -> deterministic immutable-at-runtime policy -> isolated signer process -> x402 settlement.

James/model MUST NOT receive a private key, seed phrase, vault password, generic signing primitive, policy-mutation capability, or unrestricted transfer capability.

## Candidate admission conditions
QBT-Labs/x402 is not trusted by documentation alone. It may enter ELTEX only if a clean network-capable environment can demonstrate all frozen C01–C12 controls. In particular:

1. zero starting balance for conformance;
2. key material never enters the James/model process or logs;
3. signer accepts only request-bound x402 payment operations, not generic signatures;
4. policy is enforced before signature and cannot be mutated by James;
5. per-transaction <= A$25 equivalent and aggregate daily <= A$40 equivalent remain hard caps;
6. network, asset and recipient substitution fail closed;
7. malformed/replayed/duplicate payment requests fail closed;
8. settlement ambiguity does not trigger an uncontrolled retry;
9. append-only evidence is emitted for each decision/signature/settlement attempt;
10. any secret exposure, unexpected funds movement or policy bypass terminates the run and records FAIL.

## Evidence rule
Documentation, mocks, synthetic results and local unit tests are insufficient for PASS. Only observed C01–C12 evidence from the network-capable ELTEX runner may produce PASS_FOR_RELAY_REVIEW. Relay remains the independent approval authority.

## Commercial boundary
This assessment does not authorize funding, paid benchmarking, customer checkout, customer payment, or delivery promises. `APPROVED_FOR_LIMITED_PILOT` remains mandatory before external paid launch.

## Next execution step
Run the frozen zero-balance C01–C12 suite against this candidate in a network-capable environment. If it cannot satisfy process isolation plus immutable pre-sign policy, reject it quickly and move to the next isolated-signer implementation rather than adapting James around the candidate.

Spend: A$0. Revenue: A$0. Secrets handled: none.
