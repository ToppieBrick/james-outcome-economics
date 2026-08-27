# x402 V2 Parser Implementation Note — 28 Aug 2026

## Verified implementation detail

The current official Coinbase/x402 TypeScript reference implementation does **not** JSON-parse the canonical V2 `PAYMENT-REQUIRED` header directly. `encodePaymentRequiredHeader()` base64-encodes `JSON.stringify(paymentRequired)`, and `decodePaymentRequiredHeader()` validates base64, decodes it, then JSON-parses the decoded bytes.

Reference source: `typescript/packages/core/src/http/index.ts` in `coinbase/x402` main branch, inspected 28 Aug 2026.

## Concrete patch requirement

In `benchmark/preflight-quotes.js`, the current path:

```js
.filter(([k]) => /payment|x402/i.test(k))
.map(([, v]) => maybeJson(v))
```

will discard a canonical V2 `PAYMENT-REQUIRED` header because its value is base64 rather than raw JSON.

Implement an explicit decoder with this precedence:

1. If header name is `payment-required`, base64-decode then JSON-parse.
2. Preserve legacy raw-JSON payment-header parsing as fallback for V1/older sellers.
3. Record `protocolVersion` from decoded `x402Version` where present.
4. Record transport as `v2-payment-required-base64` or `legacy-json-payment-header`.
5. Feed the decoded object through the existing candidate collector so dynamic `payTo`, amount, network, asset and scheme remain observable.

## Required fixture

A test fixture should construct a representative V2 PaymentRequired object, base64-encode its JSON exactly as the reference SDK does, pass it through the parser, and assert:

- V2 is identified;
- candidate extraction succeeds;
- dynamic `payTo` survives canonicalization;
- price is observable;
- malformed/non-base64 `PAYMENT-REQUIRED` fails closed;
- legacy JSON header remains supported.

## Why this is now evidence, not speculation

The prior compatibility gate identified a protocol risk. The official reference code now confirms the exact failure mode and the minimum implementation needed to close it. This should be the next harness change before interpreting provider eligibility or introducing paid execution.
