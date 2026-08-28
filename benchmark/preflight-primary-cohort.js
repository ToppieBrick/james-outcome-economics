'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parsePaymentHeaders, collectPaymentCandidates, normalizeUsd } = require('./preflight-quotes-v2');

const TASK_FILE = path.join(__dirname, 'structured-research.json');
const PROVIDER_FILE = path.join(__dirname, 'providers.observed.json');
const OUTPUT_FILE = path.join(__dirname, 'preflight.primary.latest.json');

const adapters = {
  'You.com': {
    build(provider, task) {
      const url = new URL(provider.endpoint);
      url.searchParams.set('query', task.query);
      url.searchParams.set('count', '5');
      return { url: url.toString(), options: { method: 'GET', headers: { accept: 'application/json' }, redirect: 'manual' } };
    },
  },
  Tavily: {
    build(provider, task) {
      return {
        url: provider.endpoint,
        options: {
          method: 'POST',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ query: task.query, search_depth: 'advanced', max_results: 5 }),
          redirect: 'manual',
        },
      };
    },
  },
};

function maybeJson(value) { try { return JSON.parse(value); } catch { return null; } }
function median(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

async function probe(provider, task) {
  const { url, options } = adapters[provider.provider].build(provider, task);
  const started = performance.now();
  let response = null;
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
  const parsedHeaders = parsePaymentHeaders(headers);
  const candidates = collectPaymentCandidates(maybeJson(text), []);
  for (const obj of parsedHeaders.objects) collectPaymentCandidates(obj, candidates);
  const liveQuoteUsd = candidates.map(normalizeUsd).find((v) => Number.isFinite(v) && v >= 0) ?? null;
  const recipients = [...new Set(candidates.map((c) => c.payTo).filter(Boolean).map(String))];
  const networks = [...new Set(candidates.map((c) => c.network).filter(Boolean).map(String))];
  const assets = [...new Set(candidates.map((c) => c.asset).filter(Boolean).map(String))];
  const valid402 = response?.status === 402 && liveQuoteUsd != null && candidates.length > 0;
  return {
    taskId: task.id,
    provider: provider.provider,
    endpoint: url,
    requestMethod: options.method,
    requestShape: provider.provider === 'You.com'
      ? { count: 5, livecrawl: false }
      : { search_depth: 'advanced', max_results: 5 },
    listedPriceUsd: provider.listedPriceUsd ?? null,
    httpStatus: response?.status ?? null,
    preflightLatencyMs: latencyMs,
    liveQuoteObserved: liveQuoteUsd != null,
    liveQuoteUsd,
    priceDriftUsd: liveQuoteUsd == null || !Number.isFinite(provider.listedPriceUsd)
      ? null
      : Number((liveQuoteUsd - provider.listedPriceUsd).toFixed(6)),
    protocolVersion: parsedHeaders.protocolVersion,
    paymentTransport: parsedHeaders.transport,
    recipients,
    networks,
    assets,
    eligibleForPaidBenchmark: valid402,
    paidExecutionObserved: false,
    attempts: 0,
    pass: null,
    effectiveCostPerAcceptableResultUsd: null,
    error,
    note: 'Zero-spend primary-cohort preflight. No payment signature is created or transmitted.',
  };
}

async function main() {
  const benchmarkRaw = fs.readFileSync(TASK_FILE, 'utf8');
  const providerRaw = fs.readFileSync(PROVIDER_FILE, 'utf8');
  const benchmark = JSON.parse(benchmarkRaw);
  const providerEvidence = JSON.parse(providerRaw);
  const providers = providerEvidence.providers.filter((p) => adapters[p.provider]);
  const observations = [];
  for (const task of benchmark.tasks) {
    for (const provider of providers) observations.push(await probe(provider, task));
  }
  const summary = providers.map((provider) => {
    const rows = observations.filter((r) => r.provider === provider.provider);
    const quoted = rows.filter((r) => r.liveQuoteObserved);
    return {
      provider: provider.provider,
      listedPriceUsd: provider.listedPriceUsd ?? null,
      tasksProbed: rows.length,
      http402Count: rows.filter((r) => r.httpStatus === 402).length,
      liveQuoteCount: quoted.length,
      quoteCoverage: rows.length ? Number((quoted.length / rows.length).toFixed(3)) : 0,
      paidBenchmarkEligibleCount: rows.filter((r) => r.eligibleForPaidBenchmark).length,
      medianPreflightLatencyMs: median(rows.map((r) => r.preflightLatencyMs)),
      distinctLiveQuotesUsd: [...new Set(quoted.map((r) => r.liveQuoteUsd))],
      errors: rows.filter((r) => r.error).length,
    };
  });
  const output = {
    observedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.benchmarkVersion,
    benchmarkContractSha256: crypto.createHash('sha256').update(benchmarkRaw).digest('hex'),
    providerEvidenceSha256: crypto.createHash('sha256').update(providerRaw).digest('hex'),
    taskClass: benchmark.taskClass,
    cohort: ['You.com', 'Tavily'],
    requestNormalization: {
      resultCount: 5,
      YouCom: 'GET /v1/search?query=...&count=5; no livecrawl',
      Tavily: 'POST /search {query, search_depth:"advanced", max_results:5}',
    },
    spendUsd: 0,
    paymentSignaturesCreated: 0,
    summary,
    observations,
  };
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
