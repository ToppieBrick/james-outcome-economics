# No-secret x402 signer boundary — implementation decision

Date: 2026-09-03
Status: DESIGN_READY / NO_FUNDING / NO_LIVE_SIGNING

## Objective
Allow James to purchase approved x402 benchmark calls without any private key, seed phrase, generic signing primitive, wallet session, or payment secret entering model context, repository, logs, or the James application process.

## Required boundary

James -> purpose-specific `paid_benchmark_call` -> deterministic policy gateway -> isolated signer/wallet service -> x402 settlement.

James may supply only a frozen benchmark request identifier and provider identifier. It must not supply an arbitrary transaction, recipient, asset, network, price, or signing payload.

The gateway must independently fetch/re-fetch the provider's 402 challenge and bind authorization to the exact request before asking the isolated signer to sign.

## Fail-closed policy

A signing request is DENIED unless all conditions are true:

- provider/domain is in the benchmark allowlist;
- network and asset exactly match the approved benchmark policy;
- recipient matches the fresh 402 challenge and any pinned recipient policy;
- request hash matches the frozen request-equivalence fixture;
- price is <= A$25 equivalent per transaction;
- aggregate settled + reserved + indeterminate exposure remains <= A$40 equivalent per day;
- benchmark run/call count is within the approved run envelope;
- no unresolved/indeterminate prior payment would cause the budget to be exceeded;
- signer/policy service is healthy and audit logging is available.

James cannot change limits, allowlists, recipient pins, network, asset, policy version, signer configuration, or funding destination.

## Required evidence per attempt

Record without secrets:

- benchmark run ID and immutable request hash;
- provider/domain;
- challenge/intent hash;
- quoted amount, asset, network and recipient;
- policy version and allow/deny result;
- signature request ID (never key material);
- settlement state: unpaid / submitted-unsettled / settled / indeterminate;
- transaction/settlement receipt identifier where available;
- response hash, latency, deterministic acceptance PASS/FAIL and failure code;
- cumulative daily reserved/settled/indeterminate exposure.

## Security acceptance tests before funding

C01 no key/seed/generic signer exposed to James process, prompts, tool args, logs or repository.
C02 arbitrary recipient is rejected before signing.
C03 unapproved domain/provider is rejected before signing.
C04 wrong network is rejected before signing.
C05 wrong asset/token is rejected before signing.
C06 amount above per-transaction cap is rejected before signing.
C07 aggregate exposure above daily cap is rejected before signing.
C08 duplicate/replay request cannot create an unintended second payment.
C09 concurrent calls cannot race through the remaining budget.
C10 timeout/ambiguous settlement reserves exposure and is not automatically retried.
C11 policy/config mutation is unavailable to James and fails closed.
C12 audit failure, signer failure or policy-store failure denies signing.

All C01-C12 require machine-observed PASS in a network-capable test environment before founder funding. A mocked PASS is insufficient for the live-signing controls.

## Benchmark release sequence

1. Implement isolated signer adapter and policy gateway with zero balance.
2. Run C01-C12 and preserve machine evidence.
3. Independent Relay/QA reviews signer evidence. Failure => remain TEST/BLOCKED.
4. Only after signer PASS, operator funds the dedicated bounded wallet using a mechanism that does not disclose secrets to James.
5. Run the frozen paid benchmark under the existing A$25 transaction/A$40 daily limits.
6. Preserve actual quotes, settlements, responses and deterministic acceptance evidence.
7. Relay/QA performs the full market-readiness gate. Checkout remains disabled unless the shared record explicitly says `APPROVED_FOR_LIMITED_PILOT`.

## Commercial control

This design does not authorize customer payment collection or delivery promises. Until Relay/QA records `APPROVED_FOR_LIMITED_PILOT`, commercial status remains TEST/BLOCKED and Stripe checkout must remain denied.
