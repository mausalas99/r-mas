#!/usr/bin/env node
// Runs the adversarial UI audit as one loop: pull elements over CDP, ask Jev what
// to click, click it over CDP directly — no per-step computer-use round trip, no
// per-step node/CDP-handshake respawn. One process runs the whole goal list.
//
// Safety, not just speed: two hard filters, applied before Jev ever sees a
// candidate, not just in the prompt wording (a prompt is a suggestion; a filter
// on the actual candidate pool is a guarantee) —
//   1. multi-patient screens (Censo, Sala, patient search, etc.) are never in the
//      candidate pool, so a real patient's data can never reach this process.
//   2. data-mutating controls (guardar, confirmar, descartar, eliminar, actualizar
//      labs, importar, procesar, archivar...) are excluded too, so an adversarial
//      pass can't accidentally save, discard, or delete anything.
// Only CLICK is ever executed; TYPE_TEXT/SELECT/SCROLL are logged but skipped —
// this is a navigation/bug-hunting pass, not a data-entry one.
//
// Loop stop, paired with step verification (not a separate mechanism): after
// each executed click, ask Jev whether the screen actually settled the way the
// goal expected. Two stalls in a row (a click that didn't help, or a goal
// skipped outright) stop the batch instead of burning the rest of the goal
// list on a screen that stopped responding.
//
// Usage: node scripts/jev/audit.mjs [--port 9222] [--goals goals.json] [--allow-multi-patient] [--allow-open-dialogs] [--allow-unsafe] [--no-settle]
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { connectCdp } from "./lib/cdp.mjs";
import { extractElements } from "./lib/extract-elements.mjs";
import { pickAction } from "./lib/jev-act.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const port = Number(flag("--port") ?? 9222);
const goalsFile = flag("--goals");
const allowMultiPatient = args.includes("--allow-multi-patient");

// PHI guard, on by default: multi-patient screens (Censo, Sala, patient search) show
// real patient names/lists, so they never enter the candidate pool unless the caller
// explicitly opts in with --allow-multi-patient (only safe with a synthetic/test patient).
const MULTI_PATIENT_TERMS = [
  "censo", "^sala$", "interconsulta", "guardia", "livesync", "lan y",
  "buscar por", "ir a sección", "seleccionar varios pacientes",
];

// Always blocked, regardless of --allow-multi-patient: data mutation and irreversible
// app-update/reinstall actions. This is a navigation/bug-hunting pass, never a
// data-entry or install-touching one.
const ALWAYS_BLOCKED_TERMS = [
  "confirmar", "descartar", "eliminar", "borrar", "^guardar", "actualizar labs",
  "enviar a estado", "importar", "procesar", "archivar", "generico a casoav",
  "^limpiar$",
  "reinstalar", "restaurar", "instalador", "actualiz", "telemetr", "exportar",
  "copia de seguridad", "revisar duplicados", "abrir\\.\\.\\.", "abrir…",
  // Nube/team admin mutations: creates or changes a real cloud room, key, or
  // membership — never something an adversarial-nav pass should trigger.
  "crear equipo", "forzar sync", "restablecer clave", "unirte con código",
  "únete a un equipo", "entrar y sincronizar", "invitar", "revocar", "rotar código",
  // The top-bar "Censo" button isn't a list view — it's a direct "Exportar censo
  // (PDF)" dialog covering the whole active roster. Block its generate/preview
  // actions so a goal like "click a patient row" can't get redirected onto them.
  "generar pdf", "vista previa",
];

// --allow-open-dialogs: a full UI crawl must reach the windows behind "Abrir…"
// (Mi Perfil, Equipo, Administración, Diagnóstico Nube). Opening a window
// changes nothing; the mutating controls inside it stay blocked.
const OPEN_DIALOG_TERMS = new Set(["abrir\\.\\.\\.", "abrir…"]);
// --allow-unsafe (owner, 2026-09-22): the UI crawler clicks destructive and network
// controls too, but only in the isolated test profile. Native file pickers (importar)
// and telemetry (reaches the real analytics) stay blocked.
const UNSAFE_STILL_BLOCKED = new Set(["importar", "telemetr"]);
const blockedTerms = ALWAYS_BLOCKED_TERMS.filter(
  (t) => !(args.includes("--allow-open-dialogs") && OPEN_DIALOG_TERMS.has(t))
    && !(args.includes("--allow-unsafe") && !UNSAFE_STILL_BLOCKED.has(t))
);

const BLOCKED_TITLE = new RegExp(
  (allowMultiPatient ? blockedTerms : [...MULTI_PATIENT_TERMS, ...blockedTerms]).join("|"),
  "i"
);

// One click per goal — a goal is a single visible target, never "X then Y".
// Sub-tabs only exist in the DOM after their parent tab is already active, so a
// compound goal can't resolve in one Jev call against one element snapshot.
const DEFAULT_GOALS = [
  "Click the Apariencia settings section.",
  "Click the Cuenta y equipo settings section.",
  "Click the Laboratorio settings section.",
  "Click the Documentos y salida settings section.",
  "Click the Respaldos, sync y recuperación settings section.",
  "Click the Rendimiento settings section.",
  "Click the Plantillas y flujo de trabajo settings section.",
  "Click the Privacidad y datos en este equipo settings section.",
];

const MIN_CONFIDENCE = 0.5;
const STALL_LIMIT = 2;

const goals = goalsFile ? JSON.parse(readFileSync(goalsFile, "utf8")) : DEFAULT_GOALS;

const cdp = await connectCdp(port);
const report = [];
let consecutiveStalls = 0;

for (const goal of goals) {
  const allElements = await extractElements(cdp);
  const elements = Object.fromEntries(
    Object.entries(allElements).filter(([, el]) => !BLOCKED_TITLE.test(el.title ?? ""))
  );

  const { operation, target } = await pickAction(goal, elements);
  const entry = {
    goal,
    operation: operation.choice,
    opConfidence: Number(operation.confidence.toFixed(2)),
    target: elements[target.choice]?.title ?? null,
    targetConfidence: Number(target.confidence.toFixed(2)),
  };

  // Global rule: below 0.5 confidence, treat as a "no" — log it, don't act on it.
  if (operation.choice === "CLICK" && target.confidence < MIN_CONFIDENCE) {
    entry.skipped = `target confidence ${target.confidence.toFixed(2)} below ${MIN_CONFIDENCE} threshold`;
  } else if (operation.choice === "CLICK" && elements[target.choice]) {
    const [x, y, w, h] = elements[target.choice].frame;
    await cdp.click(x + w / 2, y + h / 2);
    entry.clicked = true;
  } else {
    entry.skipped = `operation ${operation.choice} not executed by this runner`;
  }

  await new Promise((r) => setTimeout(r, 600));
  entry.consoleErrorsSoFar = cdp.consoleErrors.length;

  const stepSlug = goal.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
  const screenshotPath = `scripts/jev/.cache/live/step-${report.length}-${stepSlug}.png`;
  writeFileSync(screenshotPath, Buffer.from(await cdp.screenshot(), "base64"));
  entry.screenshot = screenshotPath;

  // Skip already means nothing happened — no click to verify, count it as a
  // stall directly instead of spending a Jev call confirming a known no-op.
  if (entry.skipped) {
    consecutiveStalls++;
    entry.settled = null;
  } else if (args.includes("--no-settle")) {
    // --no-settle: the caller checks the result itself (the UI crawler diffs DOM state),
    // so the extra Jev settle call is skipped.
    entry.settled = null;
  } else {
    const afterElements = await extractElements(cdp);
    const settleStatePath = `scripts/jev/.cache/live/step-${report.length}-${stepSlug}-settle.json`;
    writeFileSync(settleStatePath, JSON.stringify({ goal, before: elements, after: afterElements }));
    const settled = execFileSync("node", [
      "scripts/jev/screen.mjs",
      settleStatePath,
      `Did clicking toward "${goal}" change the screen the way that goal expects?`,
    ]).toString().trim();
    entry.settled = settled;
    const settleConfidence = Number(settled.split(" ")[0]);
    consecutiveStalls = settleConfidence < MIN_CONFIDENCE ? consecutiveStalls + 1 : 0;
  }
  entry.consecutiveStalls = consecutiveStalls;

  report.push(entry);
  console.log(JSON.stringify(entry));

  if (consecutiveStalls >= STALL_LIMIT) {
    console.log(`stopping early: ${STALL_LIMIT} stalls in a row, screen stopped responding to goals`);
    break;
  }
}

writeFileSync(
  "scripts/jev/.cache/live/audit-report.json",
  JSON.stringify({ report, consoleErrors: cdp.consoleErrors }, null, 2)
);

// End-of-batch screenshot so a human (or me, via Read) can verify state without
// a separate computer-use round trip per batch.
const png = await cdp.screenshot();
writeFileSync("scripts/jev/.cache/live/screenshot.png", Buffer.from(png, "base64"));

cdp.close();
