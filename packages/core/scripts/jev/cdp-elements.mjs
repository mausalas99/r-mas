#!/usr/bin/env node
// Read a live Electron/Chromium page over the Chrome DevTools Protocol and emit an
// elements.json shaped like ax-to-elements.mjs does from AX text — but sourced from
// the real DOM, not the accessibility tree, so it doesn't miss what AX misses (see
// R+'s "Sesion clinica bloqueada" modal, which AX gave almost nothing about).
// Needs the target launched with --remote-debugging-port=<port>.
// Usage: node scripts/jev/cdp-elements.mjs [outFile] [--port 9222]
import { writeFileSync } from "node:fs";
import { connectCdp } from "./lib/cdp.mjs";
import { extractElements } from "./lib/extract-elements.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const outFile = args[0] && !args[0].startsWith("--") ? args[0] : null;
const port = Number(flag("--port") ?? 9222);

const cdp = await connectCdp(port);
const elements = await extractElements(cdp);
cdp.close();

const json = JSON.stringify(elements, null, 2);
if (outFile) writeFileSync(outFile, json);
else console.log(json);
console.error(`${Object.keys(elements).length} elements`);
