# James x402 Payment Boundary

Status: required before any paid benchmark execution.

## Principle
James must never receive or expose a raw wallet private key in model context, prompts, logs, GitHub, Airtable, or Drive. The agent receives a purpose-limited x402 purchase capability only.

## Preferred Phase-1 implementation
Use Coinbase Agentic Wallet MCP rather than the more permissive Agentic Wallet CLI. Coinbase documents that MCP agents can discover x402 services and make x402 requests, while only the human can set spending limits, transfer funds, or add funds. The agent cannot change those limits or make arbitrary USDC transfers.

Official references:
- https://docs.cdp.coinbase.com/agentic-wallet/mcp/welcome
- https://docs.cdp.coinbase.com/agentic-wallet/mcp/mcp-tools/overview
- https://docs.cdp.coinbase.com/agentic-wallet/mcp/mcp-tools/make-x402-request
- https://docs.cdp.coinbase.com/agentic-wallet/mcp/quickstart

## Initial benchmark policy
- Dedicated James benchmark wallet; never connect Founder/personal/treasury wallets.
- Base + USDC only for this experiment.
- Fund only the experiment allowance: target US$1 initially.
- Max per call: US$0.025.
- Max session: US$1.
- Provider allowlist limited to the locked benchmark cohort.
- No arbitrary transfers, swaps, bridges, token approvals, or onramp actions exposed to James.
- Check payment requirements before purchase and reject any quote above policy.
- Record task ID, provider, endpoint, request configuration, listed price, live quote, settled cost, transaction reference, latency, attempts, acceptance result, and failure reason.
- Paid failures count toward attempts and total cost.
- Stop immediately on unexpected network, asset, recipient, quote increase, malformed payment requirement, or repeated payment/delivery failure.

## Security validation before mainnet
1. Confirm James cannot change max-per-call or max-session limits.
2. Confirm James cannot transfer USDC to an arbitrary address.
3. Confirm no private key/seed phrase is available to model context or logs.
4. Confirm an above-limit x402 request is rejected before payment.
5. Confirm transaction history is visible to the Founder.
6. Run a testnet rehearsal where supported before funding the mainnet benchmark wallet.

## Important implementation choice
Do not expose Coinbase Agentic Wallet CLI `send` or `trade` commands to James. The MCP product is preferred because Coinbase explicitly documents that transfer, funding, and spending-limit controls are human-only while x402 service payment remains agent-accessible.

## Benchmark execution gate
Paid benchmarking may start only after all security validation items pass. Until then, the zero-spend preflight harness may collect live HTTP 402 quote and latency evidence, but must keep `paidExecutionObserved=false`, `pass=null`, and `effectiveCostPerAcceptableResultUsd=null`.
