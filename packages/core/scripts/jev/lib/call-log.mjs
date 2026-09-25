// Per-session log of Jev calls, so a thread can report how many it made in
// its final reply instead of counting by hand. Appends one JSON line per
// call; scripts/jev/.cache/ is already gitignored, so no new ignore entry.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

// Read at call time, not module load — JEV_CALL_LOG can change per test/run
// within one process.
function defaultLogPath() {
  return process.env.JEV_CALL_LOG || "scripts/jev/.cache/jev-calls.ndjson";
}

export function logJevCall(entry, logPath = defaultLogPath()) {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  } catch (err) {
    console.error(`jev call log: ${err.message}`);
  }
}

export function countJevCalls(logPath = defaultLogPath()) {
  if (!existsSync(logPath)) return 0;
  return readFileSync(logPath, "utf8").split("\n").filter((line) => line.trim() !== "").length;
}
