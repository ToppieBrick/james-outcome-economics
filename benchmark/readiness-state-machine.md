# Benchmark readiness state machine

Date: 2026-08-28
Status: implementation gate

## Problem

`api/evidence.js` currently defines `paidBenchmarkReady` as `endpointResolved && liveQuoteObserved && paidExecutionObserved`. This is circular: a provider cannot be ready for its first paid benchmark only after a paid execution has already occurred. The API summary also defines `rankingReady` as `paidObserved > 0`, which can expose ranking readiness before any acceptable scored outcome exists.

## Required state model

Treat these as distinct states and never collapse them:

1. `discovered`: provider has source-backed public evidence.
2. `preflightReady`: canonical executable endpoint is resolved and provider is not explicitly execution-ineligible.
3. `quoteVerified`: a live x402 challenge has been observed and parsed; network, asset, recipient and quoted amount satisfy the constrained payment policy.
4. `paidBenchmarkReady`: `preflightReady && quoteVerified`; this means the provider is eligible for the first bounded paid benchmark. It MUST NOT require prior payment.
5. `paidExecutionObserved`: at least one bounded paid execution actually settled.
6. `outcomeScored`: at least one paid execution has a deterministic benchmark score recorded under the current benchmark fingerprint.
7. `rankingReady`: at least two comparable providers have `outcomeScored === true` under the same task class and benchmark fingerprint. A single paid call is not a ranking.

## Fail-closed requirements

- `endpointResolved` must accept only valid `http:` or `https:` URLs, not string-prefix lookalikes such as `httpx:`.
- Placeholder `.example` hosts and discovery-only sentinel strings are never executable.
- A source-backed listed price is provenance evidence only; it does not imply `quoteVerified`.
- Free-trial outcomes may validate schema/scoring but cannot set `paidExecutionObserved`, `outcomeScored` for paid economics, or `rankingReady`.
- A paid execution without a deterministic score cannot make a provider ranking-ready.
- Outcomes generated under different benchmark fingerprints cannot be compared.

## Minimum regression cases

1. Resolved endpoint + valid constrained live quote + no prior payment => `paidBenchmarkReady=true`.
2. Resolved endpoint + no live quote => `paidBenchmarkReady=false`.
3. Valid quote + prior paid execution + no scored outcome => `rankingReady=false`.
4. One scored provider only => global `rankingReady=false`.
5. Two scored providers with the same benchmark fingerprint => global `rankingReady=true`.
6. Two scored providers with different fingerprints => global `rankingReady=false`.
7. `httpx://provider.test` => `endpointResolved=false`.

## Implementation priority

Apply this state model before wiring any execution controller to `/api/evidence`. The current API is safe as descriptive evidence, but its readiness labels must not control the first paid benchmark until this correction is implemented and regression-tested.
