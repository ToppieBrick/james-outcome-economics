'use strict';

const fs = require('node:fs');
const path = require('node:path');

const providerFile = path.join(__dirname, 'providers.observed.json');
const quarantineFile = path.join(__dirname, 'provider-quarantine.json');

function executableHttp(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.hostname.endsWith('.example');
  } catch {
    return false;
  }
}

const evidence = JSON.parse(fs.readFileSync(providerFile, 'utf8'));
const quarantine = JSON.parse(fs.readFileSync(quarantineFile, 'utf8'));
const blocked = new Map(quarantine.providers.map((entry) => [entry.provider.toLowerCase(), entry]));

const unsafe = evidence.providers.filter((provider) => {
  const entry = blocked.get(String(provider.provider || '').toLowerCase());
  return entry && executableHttp(provider.endpoint);
});

if (unsafe.length) {
  console.error(JSON.stringify({
    status: 'blocked-stale-provider-evidence',
    message: 'Preflight stopped fail-closed: a quarantined provider still has an executable endpoint in providers.observed.json.',
    providers: unsafe.map((provider) => ({
      provider: provider.provider,
      endpoint: provider.endpoint,
      quarantine: blocked.get(String(provider.provider).toLowerCase()),
    })),
    remedy: 'Re-observe and explicitly release the provider, or replace/remove the stale executable endpoint before preflight.',
  }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({ status: 'preflight-safety-gate-pass', quarantinedProviders: [...blocked.keys()] }));
