# Market wedge pressure test — 2026-09-04

Status: TEST / BLOCKED FOR PAID LAUNCH

## Fresh external evidence

Public x402 discovery/routing is rapidly commoditising:

- 402radar now ranks routing APIs using observed uptime, success rate, latency, price and real-traffic signals, with an update dated 2026-08-31.
- x402dash exposes a paid `/v1/route` decision endpoint that searches task-matched endpoints and ranks candidates using liveness, latency, on-chain activity and price efficiency, returning a primary recommendation plus fallbacks.
- Graded probes discoverable x402 services and exposes quality grades, price and observed demand, while providing a callable gateway.
- TOLL·402 explicitly distinguishes quoted prices from settled payments and reports provider-weighted market pricing.

Sources:
- https://402radar.io/best/routing-x402-apis
- https://x402dash.com/developers/
- https://graded.sh/
- https://toll402.com/insights/state-of-x402-pricing-2026

## Decision

Do not sell generic endpoint discovery, liveness ranking, price comparison or generic routing as Outcome Economics Intelligence. Those capabilities are increasingly available as commodity/public infrastructure.

The surviving hypothesis remains narrower:

> For a buyer's exact repeated workload, freeze request semantics and deterministic acceptance criteria, make real paid request-equivalent calls across eligible providers, preserve settlement/attempt evidence, and determine observed cost per accepted result and whether provider choice changes for that workload.

## Benchmark evidence required before Relay approval

The first controlled benchmark must record, per provider and trial:

1. frozen request fingerprint and equivalence check;
2. actual 402 quote and actual settlement evidence;
3. deterministic acceptance PASS/FAIL and failure reason;
4. retries and ambiguous-settlement treatment;
5. latency;
6. total settled cost;
7. cost per accepted result;
8. comparison against the best relevant public routing/ranking recommendation available at benchmark time.

No advertised price, synthetic call, catalogue rank or quote alone counts as paid evidence.

## Sharpened kill criterion

Trigger founder kill/reposition review if, after safe signer approval and at least three representative exact-workload benchmark sets, James does not demonstrate at least one of:

- a materially different provider decision than credible public routing/ranking intelligence; or
- >=15% lower observed cost per accepted result versus the public/default choice; or
- a material acceptance/reliability failure that the public/default recommendation did not reveal.

The 15% threshold is an internal validation threshold, not a customer-facing claim.

## Commercial control

There is no APPROVED_FOR_LIMITED_PILOT record as of this evidence update. Checkout and external payment acceptance therefore remain disabled. Pre-gate activity is limited to demand qualification, lead capture, representative non-sensitive workload collection, packaging preparation and disabled checkout plumbing.

Spend: A$0
Verified revenue: A$0
Secrets handled: none
