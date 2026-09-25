import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker-app.mjs';

describe('worker default export — D1 overload', () => {
  it('responds 503 with Retry-After: 5 when a D1-overload error bubbles up unhandled', async () => {
    const env = {
      ASSETS: {
        fetch: async () => {
          throw new Error('D1_ERROR: D1 DB is overloaded');
        },
      },
    };
    const request = new Request('https://x/foo');
    const res = await worker.fetch(request, env);
    assert.equal(res.status, 503);
    assert.equal(res.headers.get('Retry-After'), '5');
    const body = await res.json();
    assert.equal(body.error, 'overloaded');
    assert.match(body.message, /overloaded/i);
  });

  it('still responds 500 internal_error for an unrelated unhandled error', async () => {
    const env = {
      ASSETS: {
        fetch: async () => {
          throw new Error('boom');
        },
      },
    };
    const request = new Request('https://x/foo');
    const res = await worker.fetch(request, env);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'internal_error');
  });
});
