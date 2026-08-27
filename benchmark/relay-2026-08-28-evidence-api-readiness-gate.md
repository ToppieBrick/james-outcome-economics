# Relay finding — evidence API readiness gate

Observed against commit `0e254091cb37b1f4c02b584b2b44d04ae3359dbd`.

## Finding

`api/evidence.js` currently defines:

```js
paidBenchmarkReady: endpointResolved && liveQuoteObserved && paidExecutionObserved
```

This makes **paid benchmark readiness depend on a paid execution already having occurred**. That is circular if this field is used to select the first provider(s) eligible for paid benchmarking: no provider can become `paidBenchmarkReady` until after it has already passed through the activity that readiness is supposed to gate.

The API also uses `provider.endpoint.startsWith('http')`, which accepts non-HTTP schemes such as `httpx:`. The benchmark scorer has already been hardened to HTTP/HTTPS-only semantics, so the evidence API should use the same strict URL rule to avoid inconsistent eligibility reporting.

## Required separation

Keep these states distinct:

- `preflightReady`: strict HTTP/HTTPS endpoint + observed live quote + execution eligibility/safety policy satisfied.
- `paidExecutionObserved`: historical evidence that a paid execution actually occurred.
- `outcomeEvidenceReady`: paid execution observed + result scored under the versioned benchmark contract.
- `rankingReady`: at least enough scored paid outcome evidence exists to produce a defensible comparison; do not infer this from payment alone.

A paid execution by itself is not ranking evidence.

## Acceptance gate

Before `/api/evidence` is used operationally to choose paid benchmark candidates:

1. Replace permissive `startsWith('http')` with parsed `http:` / `https:` validation.
2. Remove `paidExecutionObserved` from the preflight-readiness predicate.
3. Do not set `rankingReady` from `paidExecutionsObserved > 0`; require scored paid outcome evidence.
4. Add regression cases proving:
   - a valid live-quoted, execution-eligible provider can be preflight-ready before its first payment;
   - `httpx://...` is not endpoint-resolved;
   - one paid execution with no scored acceptable outcome does not make ranking ready;
   - historical paid execution remains visible separately from current eligibility.

## Priority

High. This is on the control path immediately before paid benchmarking and can otherwise create either a deadlock (no provider ever becomes ready) or premature ranking readiness (payment occurred but no valid outcome was scored).
