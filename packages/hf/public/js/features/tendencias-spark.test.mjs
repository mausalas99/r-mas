import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM stub for getElementById
const canvases = new Map();
globalThis.document = {
  getElementById(id) {
    return canvases.get(id) || null;
  },
};

const { tendStore, trendSparkDomId, trendSparkChartKey } = await import('./tendencias-state.mjs');
const spark = await import('./tendencias-spark.mjs');

function makeCanvas(id) {
  const el = { id, nodeType: 1 };
  canvases.set(id, el);
  return el;
}

describe('tendencias-spark mount safety', () => {
  it('destroys prior chart before reusing a canvas', () => {
    tendStore.sparkMountGen = 1;
    Object.keys(tendStore.sparkCharts).forEach((k) => delete tendStore.sparkCharts[k]);
    const sk = 'QS';
    const fk = 'eTFG';
    const id = trendSparkDomId(sk, fk);
    const canvas = makeCanvas(id);
    const ck = trendSparkChartKey(sk, fk);

    let live = 0;
    const instances = new WeakMap();
    function Chart(canvasEl) {
      if (instances.has(canvasEl)) {
        throw new Error('Canvas is already in use');
      }
      live += 1;
      instances.set(canvasEl, this);
      this.canvas = canvasEl;
      this.destroy = () => {
        instances.delete(canvasEl);
        live -= 1;
      };
    }
    Chart.getChart = (canvasEl) => instances.get(canvasEl) || null;

    const job = {
      sk2: sk,
      fk2: fk,
      setsDesc2: [],
      labels2: ['a', 'b'],
      values2: [1, 2],
    };
    const history = [];

    spark.mountOneTrendSparkChart(job, history, false, Chart, 1);
    assert.equal(live, 1);
    spark.mountOneTrendSparkChart(job, history, false, Chart, 1);
    assert.equal(live, 1, 'second mount must replace, not stack');
    assert.ok(tendStore.sparkCharts[ck]);
  });

  it('ignores stale mountGen batches', () => {
    tendStore.sparkMountGen = 5;
    Object.keys(tendStore.sparkCharts).forEach((k) => delete tendStore.sparkCharts[k]);
    const sk = 'GASES';
    const fk = 'AG';
    makeCanvas(trendSparkDomId(sk, fk));
    let created = 0;
    function Chart() {
      created += 1;
      this.destroy = () => {};
    }
    Chart.getChart = () => null;
    spark.mountOneTrendSparkChart(
      { sk2: sk, fk2: fk, setsDesc2: [], labels2: [], values2: [] },
      [],
      false,
      Chart,
      4
    );
    assert.equal(created, 0);
  });
});
