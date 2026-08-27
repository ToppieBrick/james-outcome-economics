'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const TASK_FILE = path.join(__dirname, 'structured-research.json');
const PROVIDER_FILE = path.join(__dirname, 'providers.observed.json');
const OUTPUT_FILE = path.join(__dirname, 'preflight.latest.json');

const adapters = {
  Firecrawl: {
    build: (provider, q) => ({
      url: provider.endpoint,
      options: {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 5, sources: ['web'] }),
        redirect: 'manual',
      },
    }),
  },
  agentutility: {
    build: (provider, q) => ({
      url: provider.endpoint,
      options: {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ query: q }),
        redirect: 'manual',
      },
    }),
  },
  'You.com': {
    build: (provider, q) => ({
      url: `${provider.endpoint}?query=${encodeURIComponent(q)}`,
      options: { method: 'GET', headers: { accept: 'application/json' }, redirect: 'manual' },
    }),
  },
};

function maybeJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function decodeBase64Json(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const compact = value.trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) return null;
  try { return JSON.parse(Buffer.from(compact, 'base64').toString('utf8')); } catch { return null; }
}

function parsePaymentHeaders(headers) {
  const objects = [];
  let protocolVersion = null;
  let transport = null;
  for (const [rawName, value] of Object.entries(headers || {})) {
    const name = rawName.toLowerCase();
    if (!/payment|x402/.test(name)) continue;
    let parsed = null;
    let parsedTransport = null;
    if (name === 'payment-required') {
      parsed = decodeBase64Json(value);
      if (parsed) parsedTransport = 'v2-payment-required-base64';
    }
    if (!parsed) {
      parsed = maybeJson(value);
      if (parsed) parsedTransport = 'legacy-json-payment-header';
    }
    if (!parsed) continue;
    objects.push(parsed);
    if (protocolVersion == null && parsed.x402Version != null) protocolVersion = parsed.x402Version;
    if (!transport) transport = parsedTransport;
  }
  return { objects, protocolVersion, transport };
}

function collectPaymentCandidates(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectPaymentCandidates(item, out);
    return out;
  }
  const amount = value.amount ?? value.maxAmountRequired ?? value.maxAmount ?? value.price;
  const network = value.network;
  const asset = value.asset;
  const payTo = value.payTo ?? value.recipient;
  if (amount != null || network || asset || payTo) out.push({ amount, network, asset, payTo, scheme: value.scheme });
  for (const child of Object.values(value)) collectPaymentCandidates(child, out);
  return out;
}

function normalizeUsd(candidate) {
  if (!candidate || candidate.amount == null) return null;
  const n = Number(String(candidate.amount).replace(/[$,]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (n > 1000 && /USDC|0x833589/i.test(String(candidate.asset || ''))) return n / 1e6;
  return n;
}

function endpointHost(url) {
  try { return new URL(url).host.toLowerCase(); } catch { return null; }
}

function normalizeRecipient(candidates) {
  const recipient = candidates.map((c) => c.payTo).find(Boolean);
  return recipient ? String(recipient).trim().toLowerCase() : null;
}

function providerCanonicalKey(url, recipient) {
  return `${endpointHost(url) || 'unknown-host'}|${recipient || 'unobserved-recipient'}`;
}

function median(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const m = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[m] : Math.round((nums[m - 1] + nums[m]) / 2);
}

function classifySellability({ response, candidates, liveQuoteUsd, error }) {
  if (error) return { sellability: 'unreachable', eligibleForPaidBenchmark: false };
  if (!response) return { sellability: 'no-response', eligibleForPaidBenchmark: false };
  if (response.status !== 402) {
    return {
      sellability: response.status === 200 ? 'no-paywall' : `unexpected-http-${response.status}`,
      eligibleForPaidBenchmark: false,
    };
  }
  if (!candidates.length) return { sellability: 'unparseable-payment-challenge', eligibleForPaidBenchmark: false };
  if (liveQuoteUsd == null) return { sellability: 'challenge-without-normalized-price', eligibleForPaidBenchmark: false };
  return { sellability: 'payable-preflight', eligibleForPaidBenchmark: true };
}

function runnableProviders(providerEvidence) {
  return providerEvidence.providers
    .filter((provider) => adapters[provider.provider])
    .filter((provider) => endpointHost(provider.endpoint))
    .map((provider) => ({ ...provider, adapter: adapters[provider.provider] }));
}

async function preflight(provider, task) {
  const { url, options } = provider.adapter.build(provider, task.query);
  const started = performance.now();
  let response;
  let text = '';
  let error = null;
  try {
    response = await fetch(url, options);
    text = await response.text();
  } catch (e) {
    error = e.message;
  }
  const latencyMs = Math.round(performance.now() - started);
  const headers = response ? Object.fromEntries(response.headers.entries()) : {};
  const bodyJson = maybeJson(text);
  const parsedHeaders = parsePaymentHeaders(headers);
  const candidates = collectPaymentCandidates(bodyJson, []);
  for (const obj of parsedHeaders.objects) collectPaymentCandidates(obj, candidates);
  const liveQuoteUsd = candidates.map(normalizeUsd).find((v) => Number.isFinite(v) && v >= 0) ?? null;
  const paymentRecipient = normalizeRecipient(candidates);
  const listedPriceUsd = Number.isFinite(provider.listedPriceUsd) ? provider.listedPriceUsd : null;
  const priceDriftUsd = liveQuoteUsd == null || listedPriceUsd == null
    ? null
    : Number((liveQuoteUsd - listedPriceUsd).toFixed(6));
  const sellability = classifySellability({ response, candidates, liveQuoteUsd, error });

  return {
    taskId: task.id,
    intent: task.intent,
    query: task.query,
    provider: provider.provider,
    providerEvidenceObservedAt: provider.__providerEvidenceObservedAt,
    listedPriceUsd,
    listedPriceStatus: provider.listedPriceStatus ?? null,
    endpoint: url,
    endpointHost: endpointHost(url),
    paymentRecipientObserved: paymentRecipient,
    providerCanonicalKey: providerCanonicalKey(url, paymentRecipient),
    protocolVersion: parsedHeaders.protocolVersion,
    paymentTransport: parsedHeaders.transport,
    httpStatus: response?.status ?? null,
    preflightLatencyMs: latencyMs,
    liveQuoteObserved: liveQuoteUsd != null,
    liveQuoteUsd,
    priceDriftUsd,
    paymentCandidates: candidates.slice(0, 5),
    sellability: sellability.sellability,
    eligibleForPaidBenchmark: sellability.eligibleForPaidBenchmark,
    paidExecutionObserved: false,
    attempts: 0,
    pass: null,
    effectiveCostPerAcceptableResultUsd: null,
    error,
    note: 'Zero-spend preflight only. Listed price is sourced from providers.observed.json; live 402 quote remains runtime source of truth for payment economics.',
  };
}

function summarize(observations, providers) {
  return providers.map((provider) => {
    const rows = observations.filter((row) => row.provider === provider.provider);
    const quoteRows = rows.filter((row) => row.liveQuoteObserved);
    const driftRows = quoteRows.filter((row) => row.priceDriftUsd != null && row.priceDriftUsd !== 0);
    const eligibleRows = rows.filter((row) => row.eligibleForPaidBenchmark);
    return {
      provider: provider.provider,
      listedPriceUsd: Number.isFinite(provider.listedPriceUsd) ? provider.listedPriceUsd : null,
      tasksProbed: rows.length,
      http402Count: rows.filter((row) => row.httpStatus === 402).length,
      quoteObservedCount: quoteRows.length,
      quoteCoverage: rows.length ? Number((quoteRows.length / rows.length).toFixed(3)) : 0,
      benchmarkEligibleCount: eligibleRows.length,
      benchmarkEligibilityRate: rows.length ? Number((eligibleRows.length / rows.length).toFixed(3)) : 0,
      medianPreflightLatencyMs: median(rows.map((row) => row.preflightLatencyMs)),
      distinctLiveQuotesUsd: [...new Set(quoteRows.map((row) => row.liveQuoteUsd))],
      priceDriftObservationCount: driftRows.length,
      canonicalProviderKeys: [...new Set(rows.map((row) => row.providerCanonicalKey).filter(Boolean))],
      errors: rows.filter((row) => row.error).length,
    };
  });
}

async function main() {
  const benchmarkRaw = fs.readFileSync(TASK_FILE, 'utf8');
  const benchmark = JSON.parse(benchmarkRaw);
  const providerRaw = fs.readFileSync(PROVIDER_FILE, 'utf8');
  const providerEvidence = JSON.parse(providerRaw);
  const providers = runnableProviders(providerEvidence).map((provider) => ({
    ...provider,
    __providerEvidenceObservedAt: providerEvidence.observedAt,
  }));
  const benchmarkContractSha256 = crypto.createHash('sha256').update(benchmarkRaw).digest('hex');
  const providerEvidenceSha256 = crypto.createHash('sha256').update(providerRaw).digest('hex');
  const observations = [];
  for (const task of benchmark.tasks) {
    for (const provider of providers) observations.push(await preflight(provider, task));
  }
  const excludedProviders = providerEvidence.providers
    .filter((provider) => !providers.some((runnable) => runnable.provider === provider.provider))
    .map((provider) => ({ provider: provider.provider, endpoint: provider.endpoint, reason: adapters[provider.provider] ? 'invalid-or-placeholder-endpoint' : 'no-request-adapter' }));

  const output = {
    observedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.benchmarkVersion,
    benchmarkContractSha256,
    providerEvidenceObservedAt: providerEvidence.observedAt,
    providerEvidenceSha256,
    providerPricingSource: 'benchmark/providers.observed.json',
    liveQuoteRule: 'Runtime 402 quote overrides public/listed price for any eventual paid authorization.',
    taskClass: benchmark.taskClass,
    tasksProbed: benchmark.tasks.length,
    providersProbed: providers.length,
    excludedProviders,
    totalPreflightRequests: observations.length,
    spendUsd: 0,
    paidBenchmarkGate: 'Only eligibleForPaidBenchmark=true rows may progress to controlled paid execution.',
    summary: summarize(observations, providers),
    observations,
  };
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { decodeBase64Json, parsePaymentHeaders, collectPaymentCandidates, normalizeUsd, runnableProviders };
