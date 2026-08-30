'use strict';

const benchmark = require('../benchmark/structured-research.json');
const evidence = require('../benchmark/providers.observed.json');
const preflightWatch = require('../benchmark/preflight-watch.observed.json');
const { parsePaymentHeaders, collectPaymentCandidates, normalizeUsd } = require('../benchmark/preflight-quotes-v2');
const { validateRequestEquivalence } = require('../benchmark/validate-request-equivalence');

const adapters = {
  Firecrawl(provider, task) {
    return {
      url: provider.endpoint,
      options: {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ query: task.query, limit: 5, sources: ['web'] }),
        redirect: 'manual',
      },
    };
  },
  agentutility(provider, task) {
    return {
      url: provider.endpoint,
      options: {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ query: task.query }),
        redirect: 'manual',
      },
    };
  },
  'You.com'(provider, task) {
    const url = new URL(provider.endpoint);
    url.searchParams.set('query', task.query);
    url.searchParams.set('count', '5');
    return {
      url: url.toString(),
      options: { method: 'GET', headers: { accept: 'application/json' }, redirect: 'manual' },
    };
  },
  Tavily(provider, task) {
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
  scrape402(provider, task) {
    const url = new URL(provider.endpoint);
    url.searchParams.set('q', task.query);
    url.searchParams.set('count', '5');
    return {
      url: url.toString(),
      options: { method: 'GET', headers: { accept: 'application/json' }, redirect: 'manual' },
    };
  },
};

function maybeJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function safeHeaders(headers) {
  const allowed = ['payment-required', 'x-payment-required', 'x402-version', 'content-type'];
  const output = {};
  for (const key of allowed) {
    const value = headers.get(key);
    if (value) output[key] = value;
  }
  return output;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const providerName = String(req.query.provider || 'Tavily');
  const taskId = String(req.query.task || 'sr-01');
  const observedProviders = [
    ...(Array.isArray(evidence.providers) ? evidence.providers : []),
    ...(Array.isArray(preflightWatch.providers) ? preflightWatch.providers : []),
  ];
  const provider = observedProviders.find((item) => item.provider === providerName);
  const task = benchmark.tasks.find((item) => item.id === taskId);
  const adapter = adapters[providerName];

  if (!provider || !task || !adapter) {
    return res.status(400).json({
      error: 'unsupported_preflight_target',
      supportedProviders: Object.keys(adapters),
      supportedTasks: benchmark.tasks.map((item) => item.id),
    });
  }

  const request = adapter(provider, task);
  const requestEquivalence = validateRequestEquivalence({
    task,
    provider: providerName,
    url: request.url,
    options: request.options,
  });

  const started = Date.now();
  let response;
  let text = '';
  let error = null;

  try {
    response = await fetch(request.url, request.options);
    text = await response.text();
  } catch (e) {
    error = e.message;
  }

  const observedAt = new Date().toISOString();
  const latencyMs = Date.now() - started;
  const headers = response ? Object.fromEntries(response.headers.entries()) : {};
  const parsedHeaders = parsePaymentHeaders(headers);
  const candidates = collectPaymentCandidates(maybeJson(text), []);
  for (const object of parsedHeaders.objects) collectPaymentCandidates(object, candidates);

  const normalized = candidates
    .map((candidate) => ({ ...candidate, normalizedUsd: normalizeUsd(candidate) }))
    .filter((candidate) => Number.isFinite(candidate.normalizedUsd));
  const liveQuoteUsd = normalized.length ? normalized[0].normalizedUsd : null;
  const liveQuoteObserved = liveQuoteUsd != null;
  const benchmarkEligibleQuote = liveQuoteObserved && requestEquivalence.ok;

  return res.status(200).json({
    model: 'outcome-economics-preflight-v2',
    evidenceType: requestEquivalence.ok
      ? 'runtime-zero-spend-observation'
      : 'runtime-zero-spend-discovery-diagnostic',
    spendUsd: 0,
    paymentAuthorizationCreated: false,
    task: { id: task.id, query: task.query, intent: task.intent },
    provider: provider.provider,
    endpoint: request.url,
    method: request.options.method,
    requestEquivalence,
    requestEquivalent: requestEquivalence.ok,
    listedPriceUsd: provider.listedPriceUsd ?? null,
    observedAt,
    latencyMs,
    httpStatus: response?.status ?? null,
    liveQuoteObserved,
    benchmarkEligibleQuote,
    liveQuoteUsd,
    priceDriftUsd: liveQuoteUsd == null || !Number.isFinite(provider.listedPriceUsd)
      ? null
      : Number((liveQuoteUsd - provider.listedPriceUsd).toFixed(6)),
    protocolVersion: parsedHeaders.protocolVersion,
    paymentTransport: parsedHeaders.transport,
    paymentCandidates: normalized.slice(0, 5),
    paymentHeaders: response ? safeHeaders(response.headers) : {},
    error,
    paidExecutionObserved: false,
    attempts: 0,
    pass: null,
    effectiveCostPerAcceptableResultUsd: null,
    note: requestEquivalence.ok
      ? 'Unsigned live preflight only. Request equivalence passed, but this endpoint never signs or submits a payment. A fresh runtime 402 remains authoritative before any future paid benchmark call.'
      : 'Unsigned discovery diagnostic only. Request equivalence failed, so any observed quote is excluded from benchmark evidence until the adapter contract is corrected.',
  });
};
