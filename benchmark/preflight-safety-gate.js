'use strict';

const fs = require('node:fs');
const path = require('node:path');

function executableHttp(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && url.hostname !== 'example' && !url.hostname.endsWith('.example');
  } catch {
    return false;
  }
}

function evaluateSafetyGate(evidence, quarantine) {
  const blocked = new Map((quarantine.providers || []).map((entry) => [String(entry.provider || '').trim().toLowerCase(), entry]));
  const unsafe = (evidence.providers || []).filter((provider) => {
    const entry = blocked.get(String(provider.provider || '').trim().toLowerCase());
    return entry && executableHttp(provider.endpoint);
  });
  return { blocked, unsafe };
}

function run(providerFile = process.env.JAMES_PROVIDER_FILE || path.join(__dirname, 'providers.observed.json'), quarantineFile = process.env.JAMES_QUARANTINE_FILE || path.join(__dirname, 'provider-quarantine.json')) {
  const evidence = JSON.parse(fs.readFileSync(providerFile, 'utf8'));
  const quarantine = JSON.parse(fs.readFileSync(quarantineFile, 'utf8'));
  const { blocked, unsafe } = evaluateSafetyGate(evidence, quarantine);

  if (unsafe.length) {
    console.error(JSON.stringify({
      status: 'blocked-stale-provider-evidence',
      message: 'Preflight stopped fail-closed: a quarantined provider still has an executable endpoint in providers.observed.json.',
      providers: unsafe.map((provider) => ({
        provider: provider.provider,
        endpoint: provider.endpoint,
        quarantine: blocked.get(String(provider.provider || '').trim().toLowerCase()),
      })),
      remedy: 'Re-observe and explicitly release the provider, or replace/remove the stale executable endpoint before preflight.',
    }, null, 2));
    return 2;
  }

  console.log(JSON.stringify({ status: 'preflight-safety-gate-pass', quarantinedProviders: [...blocked.keys()] }));
  return 0;
}

if (require.main === module) process.exitCode = run();

module.exports = { executableHttp, evaluateSafetyGate, run };
