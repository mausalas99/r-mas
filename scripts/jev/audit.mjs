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
// Usage: node scripts/jev/audit.mjs [--port 9222] [--goals goals.json] [--allow-multi-patient]
import { readFileSync, writeFileSync } from "node:fs";
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
  "enviar a estado", "importar", "procesar", "archivar", "añadir a tratamiento",
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

const BLOCKED_TITLE = new RegExp(
  (allowMultiPatient ? ALWAYS_BLOCKED_TERMS : [...MULTI_PATIENT_TERMS, ...ALWAYS_BLOCKED_TERMS]).join("|"),
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

const goals = goalsFile ? JSON.parse(readFileSync(goalsFile, "utf8")) : DEFAULT_GOALS;

const cdp = await connectCdp(port);
const report = [];

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

  report.push(entry);
  console.log(JSON.stringify(entry));
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
