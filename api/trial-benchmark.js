'use strict';

const benchmark = require('../benchmark/structured-research.json');

const PROVIDER = {
  name: '2s.io search.web',
  endpoint: 'https://2s.io/api/search/web',
  method: 'GET',
  listedPriceUsd: 0.009,
  trialMechanism: 'trial=1',
  trialLimit: 'one free real call per endpoint per hour',
};

function csv(value, fallback) {
  if (!value) return fallback;
  return String(value).split(',').map((v) => v.trim()).filter(Boolean);
}

function normalizeResults(body) {
  const candidates = [
    body?.results,
    body?.data?.results,
    body?.data,
    body?.organic,
    body?.items,
  ];
  const array = candidates.find(Array.isArray) || [];
  return array.map((item) => ({
    title: typeof item?.title === 'string' ? item.title : null,
    url: typeof item?.url === 'string' ? item.url : (typeof item?.link === 'string' ? item.link : null),
    snippet: typeof item?.description === 'string' ? item.description : (typeof item?.snippet === 'string' ? item.snippet : null),
  }));
}

function hostname(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return null; }
}

function matchesDomain(host, domain) {
  const d = String(domain).toLowerCase().replace(/^www\./, '');
  return host === d || host?.endsWith(`.${d}`);
}

function evaluate(task, results) {
  const criteria = benchmark.acceptanceCriteria;
  const failures = [];

  if (results.length < criteria.minimumResults) failures.push('fewer_than_minimum_results');

  for (const result of results) {
    for (const field of criteria.requiredFieldsPerResult) {
      if (!result[field]) {
        failures.push('missing_required_fields');
        break;
      }
    }
    if (criteria.requireHttpUrls && result.url) {
      try {
        const parsed = new URL(result.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) failures.push('invalid_or_non_http_url');
      } catch {
        failures.push('invalid_or_non_http_url');
      }
    }
  }

  const domains = [...new Set(results.map((r) => hostname(r.url)).filter(Boolean))];
  if (domains.length < criteria.minimumDistinctDomains) failures.push('fewer_than_minimum_distinct_domains');

  const authoritativeMatches = results.filter((result) => {
    const host = hostname(result.url);
    if (!host) return false;
    const domainOk = (task.authoritativeDomains || []).some((domain) => matchesDomain(host, domain));
    const termOk = !task.requiredUrlTerms?.length || task.requiredUrlTerms.every((term) => result.url.toLowerCase().includes(String(term).toLowerCase()));
    return domainOk && termOk;
  });
  if (authoritativeMatches.length < criteria.minimumAuthoritativeMatches) failures.push('no_authoritative_match');

  const uniqueFailures = [...new Set(failures)];
  return {
    pass: uniqueFailures.length === 0,
    failures: uniqueFailures,
    resultCount: results.length,
    distinctDomains: domains.length,
    authoritativeMatches: authoritativeMatches.length,
  };
}

async function runTask(task) {
  const url = new URL(PROVIDER.endpoint);
  url.searchParams.set('q', task.query);
  url.searchParams.set('count', '5');
  url.searchParams.set('trial', '1');

  const started = Date.now();
  let response = null;
  let text = '';
  let error = null;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    text = await response.text();
  } catch (e) {
    error = e.message;
  }
  const latencyMs = Date.now() - started;

  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  const results = body ? normalizeResults(body) : [];
  const acceptance = response?.ok ? evaluate(task, results) : {
    pass: false,
    failures: [error ? 'request_error' : `http_${response?.status ?? 'unknown'}`],
    resultCount: results.length,
    distinctDomains: 0,
    authoritativeMatches: 0,
  };

  return {
    taskId: task.id,
    query: task.query,
    provider: PROVIDER.name,
    endpoint: PROVIDER.endpoint,
    method: PROVIDER.method,
    listedPriceUsd: PROVIDER.listedPriceUsd,
    trialMechanism: PROVIDER.trialMechanism,
    observedAt: new Date().toISOString(),
    httpStatus: response?.status ?? null,
    latencyMs,
    attempts: 1,
    trialExecutionObserved: Boolean(response?.ok),
    trialAcceptancePass: response?.ok ? acceptance.pass : false,
    acceptance,
    resultSample: results.slice(0, 5),
    error,
    spendUsd: 0,
    paidExecutionObserved: false,
    paidPass: null,
    liveQuotedPriceUsd: null,
    effectiveCostPerAcceptableResultUsd: null,
    rankingEligible: false,
    note: 'This is a provider-documented free real trial call. It can establish observed response quality and request latency, but it is not a paid x402 outcome, does not establish a live 402 quote, and is excluded from paid outcome-economics ranking.',
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const taskIds = csv(req.query.tasks, ['sr-01']);
  const tasks = taskIds.map((id) => benchmark.tasks.find((task) => task.id === id));
  if (tasks.some((task) => !task) || tasks.length > 10) {
    return res.status(400).json({
      error: 'invalid_tasks',
      supportedTasks: benchmark.tasks.map((task) => task.id),
      maximumTasks: 10,
    });
  }

  const observations = [];
  for (const task of tasks) observations.push(await runTask(task));

  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({
    model: 'outcome-economics-zero-spend-trial-v1',
    taskClass: benchmark.taskClass,
    provider: PROVIDER,
    observations,
    summary: {
      attempted: observations.length,
      observedExecutions: observations.filter((o) => o.trialExecutionObserved).length,
      acceptableTrialResults: observations.filter((o) => o.trialAcceptancePass).length,
      spendUsd: 0,
      paidOutcomes: 0,
      rankingEligibleOutcomes: 0,
    },
    guardrail: 'No wallet, signing, payment authorization, X-PAYMENT/PAYMENT-SIGNATURE header, or paid retry exists in this endpoint.',
  });
};
