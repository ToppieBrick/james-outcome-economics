# Competitive Gate — 27 Aug 2026

## Material finding

Verging Labs' live Agentic Search Index materially overlaps the current Outcome Economics Intelligence thesis.

Observed public methodology: https://verginglabs.com/methodology

- 121 search tasks across Static Facts, Dynamic Facts, Multi-Source and Deep Research.
- 3 repeats per task.
- 9 providers and 3,263 scored verdicts reported.
- Provider API errors and timeouts count against the provider.
- Quality, cost and latency are published as separate axes.
- Cost per 1,000 successful answers includes provider fees across the whole workload, including retries and failed tasks, plus payload-ingestion cost.
- Judge calibration is published against human labels.

Machine API / monetisation: https://verginglabs.com/docs and https://verginglabs.com/pricing

- Public index is free.
- x402 machine endpoints: /v1/check at US$0.035/call and /v1/trade-check at US$0.01/call.
- Private benchmark / procurement services are also sold.

## Consequence for James

Generic same-task provider benchmarking, quality scoring, latency comparison and cost-per-success are no longer sufficient differentiation.

The surviving product test is narrower:

**execution-time task-conditioned x402 procurement**

For a specific incoming task, James must combine:
1. task subtype / acceptance contract,
2. repeated observed performance for comparable providers on that subtype,
3. current live x402 quote,
4. current canonical provider identity including endpoint host and payTo,
5. observed retries / paid latency / acceptability,
6. expected cost per acceptable result,

and then make a machine-readable purchase recommendation at execution time.

## Differentiation gate

Do not claim differentiation unless James can demonstrate that the execution-time recommendation differs materially from both:
- cheapest currently payable provider, and
- the best publicly available aggregate benchmark / provider ranking,

and that the James recommendation improves observed cost per acceptable result on repeated held-out tasks.

Until paid observations exist, this remains TEST, not SCALE.

No paid-call results were observed or inferred in this update.
