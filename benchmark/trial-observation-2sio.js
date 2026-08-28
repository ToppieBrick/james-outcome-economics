'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { scoreSearchResult } = require('./score-search-result');

const TASK_FILE = path.join(__dirname, 'structured-research.json');
const OUTPUT_FILE = path.join(__dirname, 'trial-observation-2sio.latest.json');
const ENDPOINT = 'https://2s.io/api/search/web';

function normalize(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    results: items.map((item) => ({
      title: item?.title ?? '',
      url: item?.url ?? '',
      snippet: item?.description ?? '',
      domain: item?.siteName ?? null,
      age: item?.age ?? null,
      language: item?.language ?? null
    }))
  };
}

async function observe(task, criteria) {
  const url = new URL(ENDPOINT);
  url.searchParams.set('q', task.query);
  url.searchParams.set('count', '5');
  url.searchParams.set('trial', '1');

  const started = performance.now();
  let response;
  let payload = null;
  let error = null;

  try {
    response = await fetch(url, { headers: { accept: 'application/json' } });
    const text = await response.text();
    try { payload = JSON.parse(text); } catch { payload = null; }
  } catch (e) {
    error = e.message;
  }

  const latencyMs = Math.round(performance.now() - started);
  const scored = response?.status === 200 && payload
    ? scoreSearchResult(task, normalize(payload), criteria)
    : { pass: false, reasons: [error ? 'request_error' : `http_${response?.status ?? 'none'}`], metrics: {} };

  return {
    taskId: task.id,
    query: task.query,
    provider: '2s.io search.web',
    endpoint: ENDPOINT,
    observationType: 'free-trial-schema-relevance-latency',
    listedX402PriceUsd: 0.0225,
    listedPriceObservedAt: '2026-08-29',
    httpStatus: response?.status ?? null,
    latencyMs,
    pass: scored.pass,
    reasons: scored.reasons,
    metrics: scored.metrics,
    paidExecutionObserved: false,
    liveX402QuoteObserved: false,
    settledCostUsd: 0,
    eligibleForCostPerSuccessModel: false,
    error,
    note: 'Uses provider-documented free trial only. Trial observations may measure schema, deterministic relevance and latency, but must never be aggregated with paid x402 outcome economics or treated as a live 402 quote.'
  };
}

async function main() {
  const raw = fs.readFileSync(TASK_FILE, 'utf8');
  const benchmark = JSON.parse(raw);
  const benchmarkContractSha256 = crypto.createHash('sha256').update(raw).digest('hex');
  const observations = [];

  // Provider documents one free real call per endpoint per hour. Default to one task
  // to avoid consuming multiple calls that could be rejected by the free-trial limit.
  const requestedTaskId = process.env.TASK_ID;
  const task = requestedTaskId
    ? benchmark.tasks.find((candidate) => candidate.id === requestedTaskId)
    : benchmark.tasks[0];
  if (!task) throw new Error(`Unknown TASK_ID: ${requestedTaskId}`);
  observations.push(await observe(task, benchmark.acceptanceCriteria));

  const output = {
    observedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.benchmarkVersion,
    benchmarkContractSha256,
    provider: '2s.io search.web',
    endpoint: ENDPOINT,
    publicFreeQuota: 'one free real call per endpoint per hour (provider-documented)',
    x402ListedPriceUsd: 0.0225,
    spendUsd: 0,
    trialOnly: true,
    paidOutcomeRule: 'Do not use these observations for paid success probability, paid retries, live-quote evidence, settled cost, or effective cost per acceptable result.',
    observations
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
