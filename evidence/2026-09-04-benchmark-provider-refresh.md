# Exact-workload benchmark provider refresh — 2026-09-04

Status: TEST / BLOCKED FOR PAID LAUNCH

## Purpose

Shorten time from signer approval to the first real paid benchmark while preserving request-equivalence and truthful-evidence controls.

## Fresh candidate evidence

1. You.com documents x402 Web Search at US$0.005/call on GET /v1/search and GET/POST /v1/agents/search. It states /v1/search and /v1/agents/search share the same pricing, response shape and parameters.
   Source: https://you.com/docs/administration/machine-payments/x402

2. Exa is currently independently listed as x402 payment-ready, with AI-native web search advertised from US$0.007/request and monitored x402 compliance/uptime evidence.
   Source: https://x402-list.com/services/exa

3. OpenWeb Ninja announced x402 support for 40+ APIs in July 2026; most endpoints are US$0.003/call and AI-model endpoints US$0.005, with exact amount quoted in the 402 challenge and successful calls charged.
   Source: https://www.openwebninja.com/blog/x402-agentic-payments

4. 402radar's 2026-08-31 web-search ranking lists 43 x402 search APIs and ranks using real-traffic uptime, success rate, latency and price. Exa is its current top pick.
   Source: https://402radar.io/best/web-search-x402-apis

## Benchmark decision

Do not lock a provider merely because its advertised price is low. At execution time, select three providers only if the frozen task can be made request-equivalent across them and each produces a valid live 402 quote compatible with the approved signer policy.

Initial candidate order for equivalence/preflight after signer approval:

- You.com — explicit x402 search semantics and US$0.005 documented price.
- Exa — independent current payment-ready/monitoring evidence and US$0.007 advertised price.
- OpenWeb Ninja search endpoint — candidate only after exact search route/schema is verified equivalent at preflight.

If OpenWeb Ninja cannot satisfy equivalence, replace it with the next live x402 search candidate discovered at execution time; do not weaken the frozen task to retain a provider.

## Required execution evidence

For every provider/trial preserve: frozen request fingerprint, equivalence decision, 402 quote, settlement receipt/evidence, deterministic acceptance result, retry/ambiguity state, latency, settled cost, and cost per accepted result. Compare the observed winner against the best credible public recommendation available at execution time.

Advertised prices and directory rankings are preparation evidence only and must never be represented as paid benchmark results.

## Commercial control

No APPROVED_FOR_LIMITED_PILOT record exists at this update. No customer payment or delivery promise is permitted. The checkout remains disabled.

Spend: A$0
Verified revenue: A$0
Secrets handled: none
