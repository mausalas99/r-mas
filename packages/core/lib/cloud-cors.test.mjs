import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin, makeApplyCors, corsPreflight } from './cloud-cors.mjs';
import { applyCors as syncCors } from '../cloud/sync-worker/src/cors.js';
import { applyCors as equiposCors } from '../cloud/equipos-worker/src/cors.js';

const req = (origin) => new Request('https://w.example/x', { headers: origin ? { Origin: origin } : {} });

test('allowed origins', () => {
  const r = req();
  for (const o of ['app://rplus', 'http://localhost:3738', 'http://127.0.0.1:5173', 'https://w.example']) assert.equal(isAllowedOrigin(o, r), true, o);
  for (const o of ['https://evil.example', 'http://localhost.evil.example', 'not a url']) assert.equal(isAllowedOrigin(o, r), false, o);
});

test('applyCors sets origin, vary and the given header list', () => {
  const res = makeApplyCors('A, B')(req('app://rplus'), new Response('x'));
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'app://rplus');
  assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'A, B');
  assert.equal(res.headers.get('Vary'), 'Origin');
  assert.equal(makeApplyCors('A')(req(), new Response('x')).headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(makeApplyCors('A')(req('https://evil.example'), new Response('x')).headers.get('Access-Control-Allow-Origin'), null);
});

test('websocket responses pass through untouched', () => {
  const ws = { webSocket: {} };
  assert.equal(makeApplyCors('A')(req(), ws), ws);
});

test('worker wrappers keep their header lists; preflight', async () => {
  assert.equal(syncCors(req(), new Response('')).headers.get('Access-Control-Allow-Headers'), 'Content-Type, Authorization, X-Sync-Admin-Key, Accept');
  assert.equal(equiposCors(req(), new Response('')).headers.get('Access-Control-Allow-Headers'), 'Content-Type, X-Equipos-Token, X-Equipos-Admin-Key');
  assert.equal(corsPreflight(new Request('https://w.example/', { method: 'GET' })), null);
  assert.equal(corsPreflight(new Request('https://w.example/', { method: 'OPTIONS' })).status, 204);
});
