import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withCloudMobileBootTimeout } from './boot-timeout.mjs';

describe('cloud-mobile boot', () => {
  it('withCloudMobileBootTimeout rejects when promise is slow', async () => {
    await assert.rejects(
      withCloudMobileBootTimeout(
        new Promise(function () {
          /* never resolves */
        }),
        20,
        'slow'
      ),
      /slow/
    );
  });

  it('withCloudMobileBootTimeout resolves fast promises', async () => {
    const value = await withCloudMobileBootTimeout(Promise.resolve('ok'), 200, 'slow');
    assert.equal(value, 'ok');
  });
});
