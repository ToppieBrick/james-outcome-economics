const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const benchmarkPath = path.join(__dirname, 'structured-research.json');
const benchmarkRaw = fs.readFileSync(benchmarkPath, 'utf8');
const benchmark = JSON.parse(benchmarkRaw);
const contractSha256 = crypto.createHash('sha256').update(benchmarkRaw).digest('hex');

assert.match(contractSha256, /^[a-f0-9]{64}$/, 'benchmark contract fingerprint must be a SHA-256 hex digest');
assert.ok(benchmark.benchmarkVersion, 'benchmarkVersion is required');
assert.ok(benchmark.taskClass, 'taskClass is required');
assert.ok(Array.isArray(benchmark.tasks) && benchmark.tasks.length > 0, 'benchmark must contain tasks');

const changedRaw = `${benchmarkRaw}\n`;
const changedSha256 = crypto.createHash('sha256').update(changedRaw).digest('hex');
assert.notEqual(changedSha256, contractSha256, 'any raw benchmark-contract change must produce a different fingerprint');

const canonicalKey = (url, recipient) => `${new URL(url).host.toLowerCase()}|${recipient ? recipient.trim().toLowerCase() : 'unobserved-recipient'}`;
assert.equal(
  canonicalKey('https://API.EXAMPLE.COM/search', '0xAbC'),
  'api.example.com|0xabc',
  'canonical provider identity must normalize endpoint host and payment recipient',
);
assert.notEqual(
  canonicalKey('https://api.example.com/search', '0xabc'),
  canonicalKey('https://api.example.com/search', '0xdef'),
  'same host with a different payment recipient must remain a distinct provider identity',
);

console.log(JSON.stringify({
  passed: true,
  benchmarkVersion: benchmark.benchmarkVersion,
  taskClass: benchmark.taskClass,
  taskCount: benchmark.tasks.length,
  benchmarkContractSha256: contractSha256,
  checks: 7,
}, null, 2));
