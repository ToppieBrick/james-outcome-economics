# Market-demand snapshot validation — 2026-08-29

## Finding

The 08:51Z LavoLoop marketplace snapshot correctly marks the artifact `rankingEligible: false`, but each listed service is also marked `taskComparable: true`. That field is stronger than the observed evidence supports.

The marketplace establishes category-level comparability only: the listings describe structured/web search services and report listed price, Base/x402 payment metadata, 30-day calls and unique payer counts. It does not establish that StableEnrich, Exa, BlockRun.AI or Vaaya can execute James's canonical locked request shape, including the same result-count and search-mode constraints. Tavily's canonical request equivalence is validated elsewhere in the harness; the marketplace listing itself does not provide that proof.

## Evidence boundary

Treat `taskComparable: true` in `market-demand-snapshot-2026-08-29T0851Z.json` as **categoryComparable**, not benchmark request-equivalent. Do not use it for cohort admission or ranking eligibility.

For future marketplace snapshots, persist separate fields:

- `categoryComparable`: listing appears to sell the same broad task class.
- `requestEquivalenceValidated`: exact endpoint/request contract has passed James's canonical validator.
- `rankingEligible`: requires the benchmark's independent admission gates; marketplace demand never sets this by itself.

## Decision

The demand conclusion survives unchanged: multiple independent payer populations are purchasing machine-paid web-search services. The snapshot reduces category-demand risk only. It does not expand the benchmark cohort and cannot establish provider-to-provider task equivalence.

## Source check

Fresh LavoLoop pages observed 2026-08-29 continue to show Tavily advanced search at $0.01 with 60,307 calls / 422 unique payers and describe the directory as provider-declared metadata indexed from Coinbase Bazaar. LavoLoop explicitly says it does not endorse third-party content, accuracy, or continued availability. This reinforces the separation between marketplace demand evidence and benchmark validation.

Spend: $0. Paid calls: 0. Secrets/signatures: none.
