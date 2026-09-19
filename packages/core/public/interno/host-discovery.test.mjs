import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInternoPath,
  salaKeyFromSlug,
  isCloudInternoShell,
  resolveInternoApiBase,
} from './host-discovery.mjs';

test('parseInternoPath accepts cloud sala slugs', () => {
  assert.equal(parseInternoPath('/interno/sala-1'), 'sala-1');
  assert.equal(parseInternoPath('/interno/torre-hu?t=abc'), 'torre-hu');
  assert.equal(parseInternoPath('/interno/not-a-sala'), '');
});

test('salaKeyFromSlug maps all cloud wards', () => {
  assert.equal(salaKeyFromSlug('torre-hu'), 'Torre HU');
  assert.equal(salaKeyFromSlug('interconsultas'), 'Interconsultas');
});

test('isCloudInternoShell reads global flag', () => {
  const prev = globalThis.__RPC_CLOUD_INTERNO__;
  globalThis.__RPC_CLOUD_INTERNO__ = true;
  try {
    assert.equal(isCloudInternoShell(), true);
  } finally {
    globalThis.__RPC_CLOUD_INTERNO__ = prev;
  }
});

test('resolveInternoApiBase uses the page origin', async () => {
  const prev = globalThis.window;
  globalThis.window = { location: { origin: 'https://rplus-sync.example' } };
  try {
    assert.equal(await resolveInternoApiBase(), 'https://rplus-sync.example');
  } finally {
    globalThis.window = prev;
  }
});
