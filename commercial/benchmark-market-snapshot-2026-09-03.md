# Structured-search benchmark market snapshot — 2026-09-03

Status: TEST / checkout denied until independent Relay records `APPROVED_FOR_LIMITED_PILOT`.

## Material market evidence

The paid benchmark should not remain artificially limited to only two providers once signer validation clears.

Current publicly advertised x402 structured-search candidates:

| Provider | Advertised paid search price | Notes | Source checked 2026-09-03 |
|---|---:|---|---|
| Klymax402 web-search | US$0.008 | POST structured search, up to 10 results | https://github.com/Br0ski777/web-search-x402 |
| Tavily x402 | US$0.01 basic / US$0.02 advanced | ranked results; no API key required | https://www.tavily.com/blog/tavily-on-x402 and https://agentcash.tavily.com/ |
| Agent402 web search | US$0.02 | structured ranked results; x402 USDC | https://agent402.tools/tools/search |

Advertised price is discovery evidence only. Actual 402 quote and settled spend are authoritative during the benchmark.

## Decision

Once the isolated signer passes C01–C12, execute the frozen exact-task suite against **three providers** where request equivalence can be maintained, not merely the previous Tavily/Agent402 pair. Ten frozen trials per provider remains the initial target.

At advertised base prices this is approximately US$0.38 for 30 successful first-attempt calls (10 × 0.008 + 10 × 0.01 + 10 × 0.02), before retries. This is far below existing A$25 transaction / A$40 daily limits, but no spend is authorised until signer validation and live quote policy checks pass.

## Why this improves the sellable artifact

A three-provider evidence artifact is commercially stronger than a two-provider comparison and reduces the risk that the A$49 pilot is perceived as a trivial price comparison. The deliverable remains observed evidence: identical frozen task, paid attempts, settlement evidence, deterministic acceptance PASS/FAIL, retries, latency and effective cost per accepted result.

No claim of superiority, savings, reliability or provider ranking may be made until observed paid evidence exists.

## Revenue control

- Current verified revenue: A$0.
- Customer checkout: DENY until independent Relay approval.
- No external delivery promise before approval.
- First commercial threshold after approval remains: first verified A$49 customer, then 3 paid customers and at least 1 repeat workload before task-class expansion.
