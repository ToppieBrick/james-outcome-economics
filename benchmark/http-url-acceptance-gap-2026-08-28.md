# HTTP URL acceptance gap — 28 Aug 2026

## Finding

The structured-research contract sets `requireHttpUrls: true`, but the current scorer does not enforce URL protocol. It parses a URL and uses its hostname for domain matching. As a result, a syntactically valid non-HTTP URL using an authoritative hostname can be counted as an authoritative match even though the benchmark contract says HTTP URLs are required.

## Consequence

This can create a false pass and contaminate paid benchmark evidence. The issue should be fixed before paid outcome economics are trusted.

## Required fix

Reject any result whose parsed URL protocol is not `http:` or `https:` whenever `requireHttpUrls` is true. Add a distinct failure reason such as `invalid_or_non_http_url`. Ensure rejected URLs do not contribute to valid-result count, distinct-domain count, or authoritative-match count.

## Regression gate

Add a test where one result has an authoritative hostname but a non-HTTP protocol and the remaining results are valid HTTP results on non-authoritative domains. The benchmark must fail with zero authoritative matches.

This is a benchmark-integrity fix only. It does not change James's product direction and requires no spend.