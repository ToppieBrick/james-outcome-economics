# Pre-gate demand qualification — 2026-09-04

Status: TEST / DENY_CHECKOUT. This artifact does not authorize payment or promise delivery.

## Commercial objective
Create external demand without crossing the independent Relay/QA gate. Qualify only prospects for whom customer-specific Outcome Economics Intelligence could outperform commodity x402 directories/rankings.

## Qualified workload
A lead is commercially qualified only when all are true:
1. repeated paid/API workload exists or is planned;
2. workload has meaningful volume/spend or reliability consequence;
3. success can be expressed as deterministic machine-checkable acceptance criteria;
4. a representative non-sensitive request can be supplied;
5. at least two request-equivalent providers can execute the same task class;
6. provider choice could plausibly change based on accepted-result economics rather than advertised unit price alone.

Disqualify generic requests for 'best x402 provider', endpoint discovery, advertised-price comparison, uptime lookup, or generic trust/ranking data.

## Pre-approval lead capture
Before APPROVED_FOR_LIMITED_PILOT James may collect only:
- task class and representative non-sensitive request;
- deterministic acceptance criteria;
- expected calls per day/month;
- current provider(s) and approximate current spend if voluntarily supplied;
- failure/retry pain and switching constraints;
- contact route and permission to notify when a limited pilot is approved.

Do not collect payment. Do not state or imply that delivery is available. Use 'pilot waitlist / qualification' language only.

## Post-gate pilot boundary
Only after independent Relay/QA records APPROVED_FOR_LIMITED_PILOT:
- initial price: A$49 for one approved workload benchmark;
- execute the frozen representative task across approved request-equivalent providers;
- report attempts, accepted results, deterministic PASS/FAIL, retries, latency, observed settlement evidence and effective cost per accepted result;
- claims must be limited to observed evidence;
- immediately test repeat intent after successful delivery.

## Wedge validation / kill criterion
For each real benchmark, compare the workload-specific recommendation against current public provider rankings/directories. Record whether customer acceptance criteria materially changed provider selection, usable-result rate, or effective economics. If repeated real benchmarks show no material decision improvement over public information, trigger reposition/kill review rather than expanding spend.

## Market control observation
Public x402 discovery and generic price/reliability intelligence continue to commoditize. Current public services expose live pricing, health, success-rate/trust and routing data. This increases the importance of customer-specific acceptance criteria and accepted-result economics as the remaining hypothesis to validate.

## Evidence integrity
Advertised prices are discovery inputs only. A live 402 quote is authoritative for pre-payment price; settlement evidence is authoritative for actual paid cost. Unknown values remain unknown. No synthetic run may be represented as paid evidence, customer usage, traction or revenue.

## Security/spend controls
No private key, seed phrase or payment secret enters James/model-visible context. No benchmark funding before the isolated signer boundary passes the required network-capable conformance gate. Existing A$25 transaction and A$40 daily limits remain hard ceilings and must fail closed.
