# Competitive Watch — Rights-Aware Procurement — 28 Aug 2026

## Question
Does adding downstream rights/provenance to James's execution-time procurement decision create a credible differentiator without changing the core product?

## Fresh evidence

### Search benchmark competition is expanding
Perplexity's public `search_evals` framework now provides reproducible provider harnesses, benchmark datasets, graders, cost accounting, resumable runs, and per-task traces across Perplexity, OpenAI, Anthropic, Exa and Parallel. This reinforces the earlier Verging Labs finding: generic search-provider benchmarking is becoming commodity infrastructure.

Source: https://github.com/perplexityai/search_evals/

### Rights/provenance is commercially real, but mostly adjacent
Observed current products include:

- Souma: real-time copyright, licensing and ToS checks on AI outputs, with provenance and audit evidence. https://www.souma.ai/
- Deontic Data: transforms market-data licence documents into actionable permissions: what data is bought, who may use it, and what they may do with it. https://www.deonticdata.com/
- DataOrigin: sells provenance-tracked, rights-cleared AI-ready datasets with commercial scope, exclusivity and refresh terms agreed up front. https://dataorigin.ai/
- ipto.ai positions provenance-backed access to private/licensed data as complementary to public-web agentic search. https://www.ipto.ai/articles/ipto-vs-parallel/

These validate rights/provenance as a buyer problem. They do **not**, from this review, establish a direct competitor that combines live provider quote + observed task performance + downstream-use rights into an execution-time procurement ranking.

## Implication for James
Do not pivot into licence-management or data-resale software.

Add rights as a procurement constraint/attribute only after core paid observations are available. Candidate decision fields:

- `commercialUse`: allowed / prohibited / unknown
- `redistribution`: allowed / prohibited / unknown
- `derivativeUse`: allowed / prohibited / unknown
- `attributionRequired`: boolean / unknown
- `rightsEvidenceUrl`: source contract/terms URL
- `rightsObservedAt`: timestamp
- `rightsConfidence`: explicit / inferred / unknown

Candidate future metric:

**expected cost per acceptable, rights-compatible result**

This should remain secondary to observed quality/cost/latency until the paid benchmark works.

## Competitive gate
The rights-aware feature is worth preserving as a differentiation hypothesis if James can later demonstrate all three:

1. a task specifies a downstream-use requirement;
2. provider choice changes because of that requirement; and
3. James selects a rights-compatible provider without worsening effective cost per acceptable result beyond a defined tolerance.

If provider selection never changes, rights-awareness is compliance metadata rather than procurement differentiation.

## Status
**WATCH / TEST LATER — no roadmap change.**

No paid-call result is claimed. No legal conclusion about any provider licence is claimed. Specific provider rights must be derived from authoritative terms/licence evidence before being used in a procurement decision.