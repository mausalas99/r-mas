import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logJevCall, countJevCalls } from "./call-log.mjs";

function withTempLog(fn) {
  const dir = mkdtempSync(join(tmpdir(), "jev-call-log-"));
  const logPath = join(dir, "nested", "jev-calls.ndjson");
  const prev = process.env.JEV_CALL_LOG;
  process.env.JEV_CALL_LOG = logPath;
  try {
    fn(logPath);
  } finally {
    if (prev === undefined) delete process.env.JEV_CALL_LOG;
    else process.env.JEV_CALL_LOG = prev;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("countJevCalls is 0 before any call is logged", () => {
  withTempLog((logPath) => {
    assert.equal(countJevCalls(logPath), 0);
  });
});

test("logJevCall appends one line per call, creating parent dirs as needed", () => {
  withTempLog((logPath) => {
    logJevCall({ script: "screen-batch.mjs", file: "a.mjs" });
    logJevCall({ script: "screen-batch.mjs", file: "b.mjs" });
    assert.equal(countJevCalls(logPath), 2);
  });
});
