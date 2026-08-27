# x402 V2 Compatibility Gate — 28 Aug 2026

## Material finding

The current zero-spend preflight harness searches JSON response bodies and JSON-decodable payment-related headers for payment candidates. That was appropriate for early x402/V1-style responses, but the x402 V2 protocol materially changes the transport contract.

Official x402 V2 announcement (11 Dec 2025; page updated 24 Jun 2026): https://x402.org/x402-v2-launch/

Observed protocol changes relevant to James:

- V2 moves payment data to HTTP headers and standardizes `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, and `PAYMENT-RESPONSE`.
- V2 supports dynamic `payTo` routing and dynamic pricing.
- V2 uses CAIP-style network/asset identifiers and is multi-chain by default.
- V2 introduces reusable wallet-controlled access/session patterns.
- Discovery lets sellers expose structured endpoint metadata so facilitators can index endpoints/pricing/routes automatically.
- Reference SDKs remain backward-compatible with V1.

The current James harness already inspects headers containing `payment`/`x402`, which is directionally correct, but it only treats a header value as usable when `JSON.parse(value)` succeeds. It therefore has no explicit evidence that it correctly handles the canonical V2 `PAYMENT-REQUIRED` serialization/decoding path, CAIP identifiers, dynamic recipients, or session/discovery semantics.

## Consequence

Before any paid benchmark is treated as representative of the current x402 market, James must pass a V2 compatibility gate. Otherwise a valid modern seller could be misclassified as `unparseable-payment-challenge`, causing selection bias in the provider cohort.

## Required gate

1. Add explicit V1 + V2 payment-challenge decoding using the current x402 reference SDK/spec rather than assuming raw JSON header values.
2. Add fixtures/tests for canonical V2 `PAYMENT-REQUIRED` responses.
3. Preserve dynamic `payTo` as part of canonical provider identity; never assume one recipient per host.
4. Normalize CAIP network/asset identifiers before enforcing Base + USDC policy.
5. Record protocol version/transport variant in each observation.
6. Do not treat reusable sessions or batch settlement as equivalent to one-call exact-payment economics; record settlement scheme separately.
7. Re-run zero-spend preflight after compatibility is proven and compare cohort eligibility before/after the parser change.

## Decision rule

Paid execution should remain blocked for any provider whose challenge cannot be parsed through a tested V1/V2-compatible path. A parser failure is a James compatibility failure until proven to be a malformed seller response; it is not automatically evidence that the provider is unsellable.

## Why this is high value

This does not broaden James's mission. It protects the core experiment from protocol-version bias immediately before real money is introduced, while preserving the existing safety boundary and provider-identity work.
