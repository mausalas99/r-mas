// Pure helpers for scripts/jev/screen-batch.mjs — kept separate from the
// SDK-calling CLI so the concurrency and formatting logic has real tests.

// Runs `worker` over `items` with at most `cap` in flight at once, preserving
// input order in the result array. Jev grounded this over unbounded
// Promise.all (confidence 1.00): batches here run up to ~700 files with no
// documented TypeSafe rate limit and no concurrency-limit dependency already
// in the repo, so a small hand-rolled cap avoids firing hundreds of
// simultaneous requests at an external API.
export async function runCapped(items, worker, cap) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(cap, items.length) }, runner));
  return results;
}

// Each row already reads as the file's one-line summary (path, probability,
// verdict, note) — the noul question type has no separate free-text field to
// generate prose from.
export function buildRows(results) {
  const sorted = [...results].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1));
  const header = "file\tprobability\tverdict\tnote";
  const lines = sorted.map((r) =>
    [r.file, r.probability === null ? "" : r.probability.toFixed(2), r.verdict, r.note].join("\t")
  );
  return [header, ...lines].join("\n") + "\n";
}
