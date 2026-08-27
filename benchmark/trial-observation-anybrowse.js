'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { scoreSearchResult } = require('./score-search-result');

const TASK_FILE = path.join(__dirname, 'structured-research.json');
const OUTPUT_FILE = path.join(__dirname, 'trial-observation-anybrowse.latest.json');
const ENDPOINT = 'https://anybrowse.dev/serp/search';

async function observe(task, criteria) {
  const started = performance.now();
  let response;
  let payload = null;
  let error = null;

  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: task.query, num: 5 })
    });
    const text = await response.text();
    try { payload = JSON.parse(text); } catch { payload = null; }
  } catch (e) {
    error = e.message;
  }

  const latencyMs = Math.round(performance.now() - started);
  const scored = response?.status === 200 && payload
    ? scoreSearchResult(task, payload, criteria)
    : { pass: false, reasons: [error ? 'request_error' : `http_${response?.status ?? 'none'}`], metrics: {} };

  return {
    taskId: task.id,
    query: task.query,
    provider: 'anybrowse',
    endpoint: ENDPOINT,
    observationType: 'free-trial-schema-validation',
    listedX402PriceUsd: 0.002,
    httpStatus: response?.status ?? null,
    latencyMs,
    pass: scored.pass,
    reasons: scored.reasons,
    metrics: scored.metrics,
    paidExecutionObserved: false,
    settledCostUsd: 0,
    eligibleForCostPerSuccessModel: false,
    error,
    note: 'This uses anybrowse free quota only to validate response shape and the deterministic acceptance scorer. It must never be aggregated with paid outcome economics.'
  };
}

async function main() {
  const raw = fs.readFileSync(TASK_FILE, 'utf8');
  const benchmark = JSON.parse(raw);
  const benchmarkContractSha256 = crypto.createHash('sha256').update(raw).digest('hex');
  const observations = [];
  for (const task of benchmark.tasks) observations.push(await observe(task, benchmark.acceptanceCriteria));

  const output = {
    observedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.benchmarkVersion,
    benchmarkContractSha256,
    provider: 'anybrowse',
    endpoint: ENDPOINT,
    publicFreeQuota: '10 searches/day without signup (provider-documented)',
    x402ListedPriceUsd: 0.002,
    spendUsd: 0,
    trialOnly: true,
    paidOutcomeRule: 'Do not use these observations for paid success probability, retries, or effective cost per acceptable result.',
    observations
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
