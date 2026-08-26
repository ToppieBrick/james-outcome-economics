# James Outcome Economics

Minimal machine-readable MVP for ranking providers by **expected cost per acceptable outcome**, not sticker price alone.

## Status

MVP only. Current provider data is **synthetic seed data** and must be replaced with observed benchmark results before production or commercial use.

## Endpoints

### `GET /api/health`
Returns service status.

### `GET /api/rank`
Query parameters:

- `taskClass`
- `budget`
- `acceptanceCriteria`

Example:

`/api/rank?taskClass=structured-research&budget=0.10&acceptanceCriteria=valid%20structured%20result`

The API returns ranked providers with listed/live price, estimated success probability, expected attempts, latency and expected cost per success.

## Local test

```bash
npm test
```

## Immediate benchmark plan

1. Define 10 deterministic tasks in one repeatable task class.
2. Identify at least 3 comparable providers.
3. Record listed price, live price, attempt count, latency and pass/fail.
4. Calculate effective cost per successful outcome.
5. Test whether the ranking differs materially from cheapest/healthiest routing.

## Kill criteria

Stop the experiment if task-specific cost-per-success rarely changes provider selection, reliable ground truth cannot be obtained, a direct competitor already publishes the same post-purchase economics across third-party providers, or initial external testing produces no usage/willingness-to-pay signal.
