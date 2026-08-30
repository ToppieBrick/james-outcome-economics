# 402Pilot rights/provenance gate — 2026-08-31

## Why this matters

402Pilot is the closest observed competitor to the surviving Outcome Economics hypothesis: buyer-side provider selection under wallet pressure using chosen-only post-payment feedback. Before using its benchmark, code, frozen responses, or task artifacts as implementation inputs, the reuse boundary must be explicit.

## Observed first-party evidence

Source repository: `MCCodeAI/402Pilot`.

### Project license

The repository LICENSE is a custom **Research and Educational Use License**. It grants use/copy/reproduction/modification of the software and accompanying artifacts for non-commercial research, educational use, and personal study, provided the notice/license are retained. It states that **commercial use requires prior written permission from the copyright holder**.

Operational consequence for James: do **not** copy, vendor, modify into, or redistribute 402Pilot software or accompanying artifacts as part of a commercial Outcome Economics product without separate permission. This is a provenance gate, not a legal opinion.

### Benchmark data provenance

`data/ATTRIBUTION.md` states that the committed task subset combines four upstream datasets and that upstream terms continue to apply:

- HumanEval — MIT
- HotpotQA — CC BY-SA 4.0
- TriviaQA — Apache-2.0
- OpenAssistant OASST1 — Apache-2.0

It also states that frozen responses under `data/pregen/` were generated for 402Pilot from those task records, and that redistributors/modifiers should review upstream licenses and preserve required notices/attribution.

Operational consequence: do not import 402Pilot's committed benchmark subset or frozen provider responses into James's commercial benchmark corpus by default. If a future benchmark needs similar task classes, source independently from upstream datasets under their own terms and preserve required attribution/notices; keep James-generated observations and acceptance artifacts independently produced.

## Differentiation implication

402Pilot materially occupies the algorithmic concept of contextual/adaptive buyer-side provider selection, wallet-aware routing, and learning from chosen-only post-payment feedback. Its published benchmark, however, is frozen replay; its x402 witness is explicitly separate from the reported benchmark.

Therefore the surviving Outcome Economics claim should remain narrower and evidence-led:

1. live third-party payable-provider execution rather than frozen replay;
2. canonical provider/endpoint/payTo identity and execution-time quote/settlement evidence;
3. deterministic identical-task acceptance;
4. retries, paid failures and paid latency retained in observed economics;
5. effective settled cost per acceptable result; and
6. proof that this live evidence changes provider choice versus the pre-registered baseline.

Do not claim novelty for adaptive provider selection, Thompson-sampling-style learning, wallet-pressure routing, or post-payment learning generally.

## Decision

**PROVENANCE GATE: PASS ONLY WITH INDEPENDENT IMPLEMENTATION / INDEPENDENT EVIDENCE.**

No 402Pilot code, frozen responses, benchmark artifacts, or task subset should be incorporated into a commercial James deliverable without an explicit rights review/permission path. Public facts and research findings may be used as competitor evidence; implementation and validation artifacts should be independently produced.

## Sources checked

- `https://github.com/MCCodeAI/402Pilot/blob/main/LICENSE` — observed 2026-08-31.
- `https://github.com/MCCodeAI/402Pilot/blob/main/data/ATTRIBUTION.md` — observed 2026-08-31.
- `https://github.com/MCCodeAI/402Pilot` — README describes frozen replay benchmark and separate local x402 integration witness; observed 2026-08-31.

No paid call, secret, credential, wallet operation, signature, or legal/contractual commitment was made in producing this artifact.
