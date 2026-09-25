#!/usr/bin/env node
// Skip rebuilding elements.json when the screen text hasn't changed since the last
// read for this --key, and flag reads where the AX walk came back suspiciously
// empty (window chrome only: close/fullscreen/minimize, nothing else) — that is
// exactly what R+'s "Sesion clinica bloqueada" modal looks like: a real button on
// screen the app never told the OS about. A flagged read gets one synthetic
// low_confidence_guess entry so act.mjs can still pick "click the middle of the
// screen" instead of stalling on an empty list — caller treats it as a guess, not
// a confirmed element.
// Usage: node scripts/jev/watch.mjs <ax-summary.txt|elements.json> --key <name> --out <elements.json> [--window WxH] [--source ax|cdp]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAx } from "./lib/parse-ax.mjs";

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), ".cache");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const inFile = args[0];
const key = flag("--key");
const outFile = flag("--out");
const windowSize = flag("--window");
const source = flag("--source") ?? "ax";

if (!inFile || !key || !outFile) {
  console.error(
    "Usage: node scripts/jev/watch.mjs <ax-summary.txt|elements.json> --key <name> --out <elements.json> [--window WxH] [--source ax|cdp]"
  );
  process.exit(1);
}

const text = readFileSync(inFile, "utf8");
const hash = createHash("sha256").update(text).digest("hex");

mkdirSync(CACHE_DIR, { recursive: true });
const hashFile = join(CACHE_DIR, `${key}.sha`);
const previousHash = existsSync(hashFile) ? readFileSync(hashFile, "utf8").trim() : null;

if (hash === previousHash && existsSync(outFile)) {
  console.log("unchanged, reused existing elements.json");
  process.exit(0);
}

const elements = source === "cdp" ? JSON.parse(text) : parseAx(text);
const count = Object.keys(elements).length;

// The low-AX-count guess only makes sense for AX: CDP reads the real DOM
// directly, so a low count there means the screen genuinely has few controls,
// not that the app hid them from the OS the way it hides them from AX.
if (source === "ax") {
  // window chrome only means the app told the OS nothing about its own content —
  // the locked-session modal had exactly this signature (3 elements, all chrome).
  const LOW_AX_THRESHOLD = 3;
  if (count <= LOW_AX_THRESHOLD) {
    let frame = null;
    if (windowSize) {
      const [w, h] = windowSize.split("x").map(Number);
      // ponytail: fixed ratio guessed from one observed case (R+'s reactivate
      // button), no real detection — replace with a screenshot check if this
      // guess keeps missing.
      frame = [Math.round(w * 0.43), Math.round(h * 0.54), Math.round(w * 0.14), Math.round(h * 0.04)];
    }
    elements.low_confidence_guess = {
      role: "unknown",
      title:
        "AX gave almost nothing back - could be a modal with a big centered button, like R+'s session-lock reactivate prompt",
      frame,
      guess: true,
    };
  }
}

writeFileSync(outFile, JSON.stringify(elements, null, 2));
writeFileSync(hashFile, hash);
console.log(`rebuilt (${count} elements${source === "ax" && count <= 3 ? ", low confidence" : ""})`);
