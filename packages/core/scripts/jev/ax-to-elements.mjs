#!/usr/bin/env node
// Turn a computer-use AX summary dump (app_screenshot / app_ax_find output) into the
// elements.json that scripts/jev/act.mjs takes as --elements. Each entry keeps role,
// title, and frame so a picked target's click coordinate is frame center — no manual
// re-reading of the screenshot needed.
// Usage: node scripts/jev/ax-to-elements.mjs <ax-summary.txt> [out.json]
import { writeFileSync, readFileSync } from "node:fs";
import { parseAx } from "./lib/parse-ax.mjs";

const [inFile, outFile] = process.argv.slice(2);
if (!inFile) {
  console.error("Usage: node scripts/jev/ax-to-elements.mjs <ax-summary.txt> [out.json]");
  process.exit(1);
}

const json = JSON.stringify(parseAx(readFileSync(inFile, "utf8")), null, 2);
if (outFile) writeFileSync(outFile, json);
else console.log(json);
