'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const harnessPath = path.join(__dirname, '..', 'benchmark', 'trial-observation-2sio.js');
const source = fs.readFileSync(harnessPath, 'utf8');

test('2s.io trial harness is structurally incapable of becoming paid evidence', () => {
  assert.match(source, /url\.searchParams\.set\('trial', '1'\)/);
  assert.match(source, /paidExecutionObserved:\s*false/);
  assert.match(source, /liveX402QuoteObserved:\s*false/);
  assert.match(source, /settledCostUsd:\s*0/);
  assert.match(source, /eligibleForCostPerSuccessModel:\s*false/);
  assert.match(source, /trialOnly:\s*true/);
  assert.match(source, /spendUsd:\s*0/);
});

test('2s.io trial harness pins the comparable request shape', () => {
  assert.match(source, /const ENDPOINT = 'https:\/\/2s\.io\/api\/search\/web'/);
  assert.match(source, /url\.searchParams\.set\('q', task\.query\)/);
  assert.match(source, /url\.searchParams\.set\('count', '5'\)/);
  assert.match(source, /observationType: 'free-trial-schema-relevance-latency'/);
});

test('2s.io trial harness binds output to the benchmark contract', () => {
  assert.match(source, /createHash\('sha256'\)\.update\(raw\)\.digest\('hex'\)/);
  assert.match(source, /benchmarkContractSha256/);
  assert.match(source, /scoreSearchResult\(task, normalize\(payload\), criteria\)/);
});
