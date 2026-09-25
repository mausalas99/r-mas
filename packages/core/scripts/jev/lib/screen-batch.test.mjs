import test from "node:test";
import assert from "node:assert/strict";
import { runCapped, buildRows } from "./screen-batch.mjs";

test("runCapped runs every item and preserves input order in results", async () => {
  const items = [1, 2, 3, 4, 5];
  const results = await runCapped(items, async (n) => n * 10, 2);
  assert.deepEqual(results, [10, 20, 30, 40, 50]);
});

test("runCapped never has more than `cap` workers in flight at once", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const items = Array.from({ length: 9 }, (_, i) => i);
  await runCapped(
    items,
    async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return n;
    },
    3
  );
  assert.ok(maxInFlight <= 3, `expected at most 3 in flight, saw ${maxInFlight}`);
});

test("runCapped handles an empty item list", async () => {
  const results = await runCapped([], async (n) => n, 8);
  assert.deepEqual(results, []);
});

test("buildRows ranks by probability descending and formats each row as a one-line summary", () => {
  const tsv = buildRows([
    { file: "b.mjs", probability: 0.4, verdict: "skip", note: "0.40 skip" },
    { file: "a.mjs", probability: 0.9, verdict: "pass", note: "0.90 pass" },
    { file: "c.mjs", probability: null, verdict: "skipped-phi", note: "suspected PHI, not sent to Jev" },
  ]);
  const lines = tsv.trim().split("\n");
  assert.equal(lines[0], "file\tprobability\tverdict\tnote");
  assert.equal(lines[1], "a.mjs\t0.90\tpass\t0.90 pass");
  assert.equal(lines[2], "b.mjs\t0.40\tskip\t0.40 skip");
  assert.equal(lines[3], "c.mjs\t\tskipped-phi\tsuspected PHI, not sent to Jev");
});
