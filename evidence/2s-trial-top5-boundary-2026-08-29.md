# 2s.io trial benchmark — top-5 evaluation boundary

Observed against commit `9896e0f40293c9fbe7b6094a2f1bd987aff237d6`.

## Finding

`api/trial-benchmark.js` requests `count=5`, but `normalizeResults()` returns the provider's full response array and `evaluate(task, results)` evaluates that entire array. Only `resultSample` is sliced to five.

If the provider ignores, caps differently, or otherwise returns more than five items, acceptance can be influenced by results outside the locked top-5 contract. In particular, an authoritative-domain hit or extra distinct domain at rank >5 can turn a top-5 failure into a pass. That would make the zero-spend trial evidence non-comparable with providers whose benchmark adapters enforce exactly five results.

## Required invariant

Acceptance must be calculated from exactly the first five normalized results, independent of provider response length. Preserve the raw normalized count separately for diagnostics.

Recommended implementation:

```js
const normalizedResults = body ? normalizeResults(body) : [];
const benchmarkResults = normalizedResults.slice(0, 5);
const acceptance = response?.ok ? evaluate(task, benchmarkResults) : {
  pass: false,
  failures: [error ? 'request_error' : `http_${response?.status ?? 'unknown'}`],
  resultCount: benchmarkResults.length,
  distinctDomains: 0,
  authoritativeMatches: 0,
};
```

Return both `providerResultCount: normalizedResults.length` and `benchmarkResultCount: benchmarkResults.length`; use `benchmarkResults` for `resultSample`.

## Regression cases

1. Six results where only result 6 is on an authoritative domain => FAIL.
2. Five results where result 5 is authoritative => PASS if all other criteria pass.
3. More than five results where distinct-domain threshold is reached only after rank 5 => FAIL.
4. Fewer than five results => existing minimum-result rule applies.

## Evidence status

This finding changes benchmark-integrity logic only. It does not claim any observed 2s.io trial outcome, latency, live x402 quote, payment, or paid result. `rankingEligible` must remain false for trial observations.
