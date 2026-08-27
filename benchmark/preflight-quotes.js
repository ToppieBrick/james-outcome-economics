const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const TASK_FILE = path.join(__dirname, 'structured-research.json');
const OUTPUT_FILE = path.join(__dirname, 'preflight.latest.json');

const providers = [
  { provider: 'Firecrawl', listedPriceUsd: 0.01, method: 'POST', url: 'https://api.firecrawl.dev/v2/x402/search', body: (q) => ({ query: q, limit: 5, sources: ['web'] }) },
  { provider: 'AgentUtility', listedPriceUsd: 0.01, method: 'POST', url: 'https://x402.agentutility.ai/search', body: (q) => ({ query: q }) },
  { provider: 'You.com', listedPriceUsd: 0.005, method: 'GET', url: (q) => `https://api.you.com/v1/search?query=${encodeURIComponent(q)}` },
];

function maybeJson(value) { try { return JSON.parse(value); } catch { return null; } }

function decodeBase64Json(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const compact = value.trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) return null;
  try {
    const decoded = Buffer.from(compact, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch { return null; }
}

function parsePaymentHeaders(headers) {
  const objects = [];
  let protocolVersion = null;
  let transport = null;
  for (const [rawName, value] of Object.entries(headers || {})) {
    const name = rawName.toLowerCase();
    if (!/payment|x402/i.test(name)) continue;
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
  if (Array.isArray(value)) { for (const item of value) collectPaymentCandidates(item, out); return out; }
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
  const raw = String(candidate.amount).replace(/[$,]/g, '');
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 1000 && /USDC|0x833589/i.test(String(candidate.asset || ''))) return n / 1e6;
  return n;
}
function normalizeRecipient(candidates) { const r = candidates.map((c) => c.payTo).find(Boolean); return r ? String(r).trim().toLowerCase() : null; }
function endpointHost(url) { try { return new URL(url).host.toLowerCase(); } catch { return null; } }
function providerCanonicalKey(url, paymentRecipient) { return `${endpointHost(url) || 'unknown-host'}|${paymentRecipient || 'unobserved-recipient'}`; }
function median(values) { const nums = values.filter(Number.isFinite).sort((a,b)=>a-b); if (!nums.length) return null; const m=Math.floor(nums.length/2); return nums.length%2?nums[m]:Math.round((nums[m-1]+nums[m])/2); }
function classifySellability({ response, candidates, liveQuoteUsd, error }) {
  if (error) return { sellability: 'unreachable', eligibleForPaidBenchmark: false };
  if (!response) return { sellability: 'no-response', eligibleForPaidBenchmark: false };
  if (response.status !== 402) return { sellability: response.status === 200 ? 'no-paywall' : `unexpected-http-${response.status}`, eligibleForPaidBenchmark: false };
  if (!candidates.length) return { sellability: 'unparseable-payment-challenge', eligibleForPaidBenchmark: false };
  if (liveQuoteUsd == null) return { sellability: 'challenge-without-normalized-price', eligibleForPaidBenchmark: false };
  return { sellability: 'payable-preflight', eligibleForPaidBenchmark: true };
}

async function preflight(provider, task) {
  const url = typeof provider.url === 'function' ? provider.url(task.query) : provider.url;
  const options = { method: provider.method, headers: { accept: 'application/json' }, redirect: 'manual' };
  if (provider.method === 'POST') { options.headers['content-type']='application/json'; options.body=JSON.stringify(provider.body(task.query)); }
  const started=performance.now(); let response; let text=''; let error=null;
  try { response=await fetch(url,options); text=await response.text(); } catch(e) { error=e.message; }
  const latencyMs=Math.round(performance.now()-started);
  const headers=response?Object.fromEntries(response.headers.entries()):{};
  const bodyJson=maybeJson(text);
  const parsedHeaders=parsePaymentHeaders(headers);
  const candidates=collectPaymentCandidates(bodyJson,[]);
  for (const obj of parsedHeaders.objects) collectPaymentCandidates(obj,candidates);
  const liveQuoteUsd=candidates.map(normalizeUsd).find((v)=>Number.isFinite(v)&&v>=0)??null;
  const paymentRecipient=normalizeRecipient(candidates);
  const canonicalKey=providerCanonicalKey(url,paymentRecipient);
  const priceDriftUsd=liveQuoteUsd==null?null:Number((liveQuoteUsd-provider.listedPriceUsd).toFixed(6));
  const sellability=classifySellability({response,candidates,liveQuoteUsd,error});
  return { taskId:task.id,intent:task.intent,query:task.query,provider:provider.provider,providerCanonicalKey:canonicalKey,endpoint:url,endpointHost:endpointHost(url),paymentRecipientObserved:paymentRecipient,protocolVersion:parsedHeaders.protocolVersion,paymentTransport:parsedHeaders.transport,listedPriceUsd:provider.listedPriceUsd,httpStatus:response?.status??null,preflightLatencyMs:latencyMs,liveQuoteObserved:liveQuoteUsd!=null,liveQuoteUsd,priceDriftUsd,paymentCandidates:candidates.slice(0,5),sellability:sellability.sellability,eligibleForPaidBenchmark:sellability.eligibleForPaidBenchmark,paidExecutionObserved:false,attempts:0,pass:null,effectiveCostPerAcceptableResultUsd:null,error,note:'Zero-spend preflight only. V2 PAYMENT-REQUIRED is base64-decoded before candidate extraction; legacy JSON payment headers remain supported. Preflight eligibility is not delivery-success evidence.' };
}

function summarize(observations) {
  return providers.map((provider)=>{ const rows=observations.filter((r)=>r.provider===provider.provider); const quoteRows=rows.filter((r)=>r.liveQuoteObserved); const driftRows=quoteRows.filter((r)=>r.priceDriftUsd!==0); const eligibleRows=rows.filter((r)=>r.eligibleForPaidBenchmark); return {provider:provider.provider,canonicalProviderKeys:[...new Set(rows.map((r)=>r.providerCanonicalKey).filter(Boolean))],endpointHosts:[...new Set(rows.map((r)=>r.endpointHost).filter(Boolean))],observedPaymentRecipients:[...new Set(rows.map((r)=>r.paymentRecipientObserved).filter(Boolean))],protocolVersions:[...new Set(rows.map((r)=>r.protocolVersion).filter((v)=>v!=null))],paymentTransports:[...new Set(rows.map((r)=>r.paymentTransport).filter(Boolean))],tasksProbed:rows.length,http402Count:rows.filter((r)=>r.httpStatus===402).length,quoteObservedCount:quoteRows.length,quoteCoverage:rows.length?Number((quoteRows.length/rows.length).toFixed(3)):0,benchmarkEligibleCount:eligibleRows.length,benchmarkEligibilityRate:rows.length?Number((eligibleRows.length/rows.length).toFixed(3)):0,sellabilityOutcomes:rows.reduce((a,r)=>{a[r.sellability]=(a[r.sellability]||0)+1;return a;},{}),medianPreflightLatencyMs:median(rows.map((r)=>r.preflightLatencyMs)),listedPriceUsd:provider.listedPriceUsd,distinctLiveQuotesUsd:[...new Set(quoteRows.map((r)=>r.liveQuoteUsd))],priceDriftObservationCount:driftRows.length,errors:rows.filter((r)=>r.error).length}; });
}

async function main(){ const benchmarkRaw=fs.readFileSync(TASK_FILE,'utf8'); const benchmark=JSON.parse(benchmarkRaw); const benchmarkContractSha256=crypto.createHash('sha256').update(benchmarkRaw).digest('hex'); const observations=[]; for(const task of benchmark.tasks){for(const provider of providers) observations.push(await preflight(provider,task));} const output={observedAt:new Date().toISOString(),benchmarkVersion:benchmark.benchmarkVersion,benchmarkContractSha256,taskClass:benchmark.taskClass,tasksProbed:benchmark.tasks.length,providersProbed:providers.length,totalPreflightRequests:observations.length,spendUsd:0,contractIntegrityRule:'Never aggregate or compare observations produced under different benchmarkContractSha256 values without an explicit migration/regrade step.',identityRule:'Do not aggregate provider traction or outcomes by directory listing ID or brand name alone. Canonicalize by endpoint host + observed payment recipient.',paidBenchmarkGate:'Only rows with eligibleForPaidBenchmark=true may progress to controlled paid execution.',summary:summarize(observations),observations}; fs.writeFileSync(OUTPUT_FILE,JSON.stringify(output,null,2)+'\n'); console.log(JSON.stringify(output,null,2)); }

if (require.main === module) main().catch((error)=>{console.error(error);process.exitCode=1;});
module.exports={decodeBase64Json,parsePaymentHeaders,collectPaymentCandidates,normalizeUsd,normalizeRecipient,providerCanonicalKey};
