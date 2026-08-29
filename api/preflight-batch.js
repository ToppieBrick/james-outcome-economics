'use strict';

const DEFAULT_PROVIDERS = ['Tavily', 'You.com', 'agentutility', 'Firecrawl'];
const DEFAULT_TASKS = ['sr-01'];
const MAX_OBSERVATIONS = 20;

function csv(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function originFor(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) throw new Error('host_unavailable');
  return `${proto}://${host}`;
}

async function observe(origin, provider, task) {
  const url = new URL('/api/preflight', origin);
  url.searchParams.set('provider', provider);
  url.searchParams.set('task', task);

  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}

    return {
      provider,
      task,
      batchRequestLatencyMs: Date.now() - started,
      preflightHttpStatus: response.status,
      observation: body,
      batchError: body ? null : 'non_json_preflight_response',
    };
  } catch (error) {
    return {
      provider,
      task,
      batchRequestLatencyMs: Date.now() - started,
      preflightHttpStatus: null,
      observation: null,
      batchError: error.message,
    };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const providers = csv(req.query.providers, DEFAULT_PROVIDERS);
  const tasks = csv(req.query.tasks, DEFAULT_TASKS);
  const combinations = [];
  for (const provider of providers) {
    for (const task of tasks) combinations.push({ provider, task });
  }

  if (!combinations.length || combinations.length > MAX_OBSERVATIONS) {
    return res.status(400).json({
      error: 'invalid_batch_size',
      maximumObservations: MAX_OBSERVATIONS,
      requestedObservations: combinations.length,
    });
  }

  let origin;
  try { origin = originFor(req); }
  catch (error) { return res.status(500).json({ error: error.message }); }

  const batchStartedAt = new Date().toISOString();
  const batchStarted = Date.now();
  const observations = await Promise.all(
    combinations.map(({ provider, task }) => observe(origin, provider, task))
  );

  const liveQuotesObserved = observations.filter((item) => item.observation?.liveQuoteObserved).length;
  const upstream402s = observations.filter((item) => item.observation?.httpStatus === 402).length;
  const errors = observations.filter((item) => item.batchError || item.observation?.error).length;

  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({
    model: 'outcome-economics-preflight-batch-v1',
    evidenceType: 'runtime-zero-spend-observation-batch',
    spendUsd: 0,
    paymentAuthorizationCreated: false,
    paidExecutionObserved: false,
    batchStartedAt,
    batchCompletedAt: new Date().toISOString(),
    batchLatencyMs: Date.now() - batchStarted,
    requestedObservations: combinations.length,
    liveQuotesObserved,
    upstream402s,
    errors,
    observations,
    note: 'Batch wrapper around /api/preflight. It performs unsigned requests only and never signs or submits payment. Provider PASS/FAIL and effective cost remain null until paid benchmark execution is observed.',
  });
};
