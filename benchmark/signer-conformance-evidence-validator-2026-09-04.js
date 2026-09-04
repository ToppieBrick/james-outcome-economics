#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');

function deny(reason, details = {}) {
  const out = { decision: 'DENY', reason, ...details };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  process.exitCode = 1;
}

const path = process.argv[2];
if (!path) return deny('EVIDENCE_PATH_REQUIRED');
let raw;
try { raw = fs.readFileSync(path, 'utf8'); } catch { return deny('EVIDENCE_UNREADABLE'); }
let e;
try { e = JSON.parse(raw); } catch { return deny('EVIDENCE_INVALID_JSON'); }

const forbiddenKeys = /(private.?key|seed.?phrase|mnemonic|secret|credential|api.?key)/i;
function scan(v, p = '$') {
  if (Array.isArray(v)) return v.flatMap((x,i) => scan(x, `${p}[${i}]`));
  if (!v || typeof v !== 'object') return [];
  return Object.entries(v).flatMap(([k,val]) => forbiddenKeys.test(k) && val ? [`${p}.${k}`] : scan(val, `${p}.${k}`));
}
const leaked = scan(e);
if (leaked.length) return deny('SECRET_BEARING_FIELDS_PRESENT', { paths: leaked });

const cases = e.controls || e.cases || e.tests;
if (!Array.isArray(cases)) return deny('CONTROL_ARRAY_MISSING');
const expected = Array.from({length:12}, (_,i) => `C${String(i+1).padStart(2,'0')}`);
const byId = new Map(cases.map(c => [String(c.control_id || c.id || '').toUpperCase(), c]));
const missing = expected.filter(id => !byId.has(id));
if (missing.length) return deny('CONTROLS_MISSING', { missing });

for (const id of expected) {
  const c = byId.get(id);
  const status = String(c.status || c.decision || '').toUpperCase();
  if (status !== 'PASS') return deny('CONTROL_NOT_PASS', { control_id: id, observed: status || 'UNSET' });
  if (c.funds_moved === true) return deny('FUNDS_MOVED_DURING_ZERO_BALANCE_CONFORMANCE', { control_id: id });
  if (c.secret_exposure === true) return deny('SECRET_EXPOSURE_RECORDED', { control_id: id });
  for (const field of ['timestamp','request_fingerprint','policy_hash','observed_http_or_adapter_result','redacted_log_digest']) {
    if (!c[field]) return deny('REQUIRED_EVIDENCE_FIELD_MISSING', { control_id: id, field });
  }
}

const startBalance = e.starting_balance ?? e.wallet_balance ?? e.environment?.starting_balance;
if (Number(startBalance) !== 0) return deny('STARTING_BALANCE_NOT_ZERO_OR_UNPROVEN', { observed: startBalance ?? null });
if (e.synthetic === true || e.mock === true) return deny('SYNTHETIC_OR_MOCK_EVIDENCE_FORBIDDEN');

const digest = crypto.createHash('sha256').update(raw).digest('hex');
process.stdout.write(JSON.stringify({
  decision: 'PASS_FOR_RELAY_REVIEW',
  controls: expected.length,
  evidence_sha256: digest,
  commercial_effect: 'NONE',
  funding_permitted: false,
  paid_benchmark_permitted: false,
  checkout: 'DENY_UNTIL_INDEPENDENT_APPROVED_FOR_LIMITED_PILOT'
}, null, 2) + '\n');
