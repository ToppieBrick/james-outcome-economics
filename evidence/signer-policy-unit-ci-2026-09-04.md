# x402 signer policy implementation evidence — unit/CI stage

Date: 2026-09-04 (Australia/Sydney)
Status: IMPLEMENTED_UNIT_PASS / NOT_NETWORK_VALIDATED / NO_FUNDING / NO_LIVE_SIGNING

## Evidence

- Policy gateway implementation commit: `c7030c47f7a4ba7f87be8b8d8a78f812d9b1fe8e`.
- Executable C01-C12 unit-test commit: `d5b790e432a8d8edca2ce842353b1e5398ccfce1`.
- GitHub Actions workflow run `33769213074` completed with conclusion `success` for commit `d5b790e432a8d8edca2ce842353b1e5398ccfce1`.

## Controls covered by executable tests

- C01 purpose-specific signing interface; no generic signer/key material returned to caller.
- C02 arbitrary recipient rejection.
- C03 provider/domain allowlist rejection.
- C04 network binding.
- C05 asset binding.
- C06 A$25 per-transaction ceiling.
- C07 A$40 aggregate daily exposure ceiling including reserved/indeterminate exposure.
- C08 replay/duplicate prevention.
- C09 concurrent authorization fail-closed behavior.
- C10 timeout/signer ambiguity reserves exposure and prevents blind retry economics.
- C11 frozen policy configuration unavailable for caller mutation.
- C12 audit failure denies signing before signer invocation.
- Additional request-equivalence mismatch denial and unsafe signer-response denial.

## Important limitation

This is unit/CI implementation evidence only. It does **not** satisfy the founder directive's requirement for machine-observed C01-C12 validation against an isolated signer in a network-capable environment. No wallet, funding, private key, seed phrase, payment secret, real signing, real settlement or paid benchmark was used.

Therefore:

- signer security status remains `TEST`;
- paid benchmark remains blocked;
- customer checkout remains denied;
- Relay/QA must not record `APPROVED_FOR_LIMITED_PILOT` from this evidence alone.

## Next release condition

Implement a real isolated signer adapter behind the purpose-specific `signPaymentIntent` boundary, keep the signer wallet at zero balance, run network-capable C01-C12 conformance while preserving machine evidence, and submit that evidence to independent Relay/QA before any founder/operator funding.
