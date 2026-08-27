const fs = require('node:fs');
const path = require('node:path');

const TASK_FILE = path.join(__dirname, 'structured-research.json');
const OUTPUT_FILE = path.join(__dirname, 'preflight.latest.json');

const providers = [
  {
    provider: 'Firecrawl',
    listedPriceUsd: 0.01,
    method: 'POST',
    url: 'https://api.firecrawl.dev/v2/x402/search',
    body: (q) => ({ query: q, limit: 5, sources: ['web'] }),
  },
  {
    provider: 'AgentUtility',
    listedPriceUsd: 0.01,
    method: 'POST',
    url: 'https://x402.agentutility.ai/search',
    body: (q) => ({ query: q }),
  },
  {
    provider: 'You.com',
    listedPriceUsd: 0.005,
    method: 'GET',
    url: (q) => `https://api.you.com/v1/search?query=${encodeURIComponent(q)}`,
  },
];

function maybeJson(value) {
  try { return JSON.parse(value); } catch { return null; }
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
  if (amount != null || network || asset || payTo) {
    out.push({ amount, network, asset, payTo, scheme: value.scheme });
  }
  for (const child of Object.values(value)) collectPaymentCandidates(child, out);
  return out;
}

function normalizeUsd(candidate) {
  if (!candidate || candidate.amount == null) return null;
  const raw = String(candidate.amount).replace(/[$,]/g, '');
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 1000 && /USDC|0x833589/i.test(String(candidate.asset || ''))) return n / 1e6;
  return n;
}

function median(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

async function preflight(provider, task) {
  const url = typeof provider.url === 'function' ? provider.url(task.query) : provider.url;
  const options = {
    method: provider.method,
    headers: { accept: 'application/json' },
    redirect: 'manual',
  };
  if (provider.method === 'POST') {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(provider.body(task.query));
  }

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
  const headerObjects = Object.entries(headers)
    .filter(([k]) => /payment|x402/i.test(k))
    .map(([, v]) => maybeJson(v))
    .filter(Boolean);
  const candidates = collectPaymentCandidates(bodyJson, []);
  for (const obj of headerObjects) collectPaymentCandidates(obj, candidates);
  const liveQuoteUsd = candidates.map(normalizeUsd).find((v) => Number.isFinite(v) && v >= 0) ?? null;
  const priceDriftUsd = liveQuoteUsd == null ? null : Number((liveQuoteUsd - provider.listedPriceUsd).toFixed(6));

  return {
    taskId: task.id,
    intent: task.intent,
    query: task.query,
    provider: provider.provider,
    endpoint: url,
    listedPriceUsd: provider.listedPriceUsd,
    httpStatus: response?.status ?? null,
    preflightLatencyMs: latencyMs,
    liveQuoteObserved: liveQuoteUsd != null,
    liveQuoteUsd,
    priceDriftUsd,
    paymentCandidates: candidates.slice(0, 5),
    paidExecutionObserved: false,
    attempts: 0,
    pass: null,
    effectiveCostPerAcceptableResultUsd: null,
    error,
    note: 'Zero-spend preflight only. HTTP 402 quote/latency is not a paid outcome and must not be used as success evidence.',
  };
}

function summarize(observations) {
  return providers.map((provider) => {
    const rows = observations.filter((row) => row.provider === provider.provider);
    const quoteRows = rows.filter((row) => row.liveQuoteObserved);
    const driftRows = quoteRows.filter((row) => row.priceDriftUsd !== 0);
    return {
      provider: provider.provider,
      tasksProbed: rows.length,
      http402Count: rows.filter((row) => row.httpStatus === 402).length,
      quoteObservedCount: quoteRows.length,
      quoteCoverage: rows.length ? Number((quoteRows.length / rows.length).toFixed(3)) : 0,
      medianPreflightLatencyMs: median(rows.map((row) => row.preflightLatencyMs)),
      listedPriceUsd: provider.listedPriceUsd,
      distinctLiveQuotesUsd: [...new Set(quoteRows.map((row) => row.liveQuoteUsd))],
      priceDriftObservationCount: driftRows.length,
      errors: rows.filter((row) => row.error).length,
    };
  });
}

async function main() {
  const benchmark = JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
  const observations = [];
  for (const task of benchmark.tasks) {
    for (const provider of providers) observations.push(await preflight(provider, task));
  }

  const output = {
    observedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.benchmarkVersion,
    taskClass: benchmark.taskClass,
    tasksProbed: benchmark.tasks.length,
    providersProbed: providers.length,
    totalPreflightRequests: observations.length,
    spendUsd: 0,
    summary: summarize(observations),
    observations,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
