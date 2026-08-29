import {
  admissionDateForPatient,
  buildColumnHeadHtml,
  buildFilterChipHtml,
  buildRowHtml,
  buildSummaryLineHtml,
  buildTableCardHeaderHtml,
  isPatientAdmissionIncomplete,
  isPatientAdmittedToday,
  mountCountersBand,
  mountEmptyState,
  mountModeFrame,
  patientPendientes
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";
import {
  formatTodoDueLabel
} from "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import {
  formatAccesoFechaDisplay
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/inicio-turno/inicio-turno-summary.mjs
function isTodayIso(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = /* @__PURE__ */ new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function lastVitalsEntry(p) {
  const hist = Array.isArray(p?.monitoreo?.historial) ? p.monitoreo.historial : [];
  return hist.length ? hist[hist.length - 1] : null;
}
function lastVitalsRecordedAt(p) {
  const last = lastVitalsEntry(p);
  if (!last) return null;
  return String(last?.recordedAt || last?.registeredAt || last?.createdAt || "") || null;
}
function vitalsObjectFromEntry(last) {
  if (last?.vitals && typeof last.vitals === "object") return last.vitals;
  if (last?.values && typeof last.values === "object") return last.values;
  return {};
}
function lastVitalsAlteredChips(p) {
  const last = lastVitalsEntry(p);
  if (!last) return [];
  const vitals = vitalsObjectFromEntry(last);
  const alt = last?.alteredAt && typeof last.alteredAt === "object" ? last.alteredAt : {};
  return Object.keys(alt).filter((k) => vitals[k] != null).map((k) => `${k.toUpperCase()} ${vitals[k]}`);
}
function computeHeredasPendientesSummary(patients) {
  let open = 0;
  let overdue = 0;
  let oldestOverdueIso = null;
  (patients || []).forEach((p) => {
    const { open: o, overdue: v } = patientPendientes(p.id);
    open += o.length;
    overdue += v.length;
    v.forEach((t) => {
      const iso = String(t.dueDate || t.reminderAt || t.createdAt || "");
      if (iso && (!oldestOverdueIso || iso < oldestOverdueIso)) oldestOverdueIso = iso;
    });
  });
  return { open, overdue, oldestOverdueIso };
}
function computeTomaSignosSummary(patients) {
  const total = (patients || []).length;
  const receivedToday = (patients || []).filter((p) => isTodayIso(lastVitalsRecordedAt(p))).length;
  const percent = total > 0 ? Math.round(receivedToday / total * 100) : 0;
  return { total, receivedToday, percent };
}
function computeIngresosNocheSummary(patients) {
  let admittedToday = 0;
  let incompleteChart = 0;
  (patients || []).forEach((p) => {
    if (!isPatientAdmittedToday(p)) return;
    admittedToday += 1;
    if (isPatientAdmissionIncomplete(p)) incompleteChart += 1;
  });
  return { admittedToday, incompleteChart };
}
function bedLabelForPatient(p) {
  const joined = [p?.cuarto, p?.cama].filter(Boolean).join(" \xB7 ");
  return joined || "\u2014";
}
function daysAdmittedLabel(p) {
  if (isPatientAdmittedToday(p)) return "ingreso";
  const iso = admissionDateForPatient(p);
  if (!iso) return "";
  const admitted = /* @__PURE__ */ new Date(`${iso}T00:00:00`);
  if (Number.isNaN(admitted.getTime())) return "";
  const days = Math.max(0, Math.round((Date.now() - admitted.getTime()) / 864e5));
  return `d${days}`;
}
function inferOverdueActionLabel(text) {
  return /control|potasio|electrol|k\+|repos/i.test(String(text || "")) ? "Pedir control" : "Revalorar";
}
function overdueLoPrimeroRow(overdue, base) {
  const t = overdue[0];
  const iso = String(t.dueDate || t.reminderAt || t.createdAt || "");
  return {
    ...base,
    reasonText: String(t.text || "Pendiente vencido"),
    sinceLabel: `${formatTodoDueLabel(iso) || "vencido"} \xB7 vencido`,
    urgency: "vencido",
    action: { label: inferOverdueActionLabel(t.text), tone: "primary" }
  };
}
function incompleteAdmissionLoPrimeroRow(p, base) {
  const iso = admissionDateForPatient(p);
  return {
    ...base,
    reasonText: "Ingreso de hoy con ficha incompleta (falta cuarto, cama, servicio o \xE1rea)",
    sinceLabel: `${formatAccesoFechaDisplay(iso) || "hoy"} \xB7 ficha incompleta`,
    urgency: "en_espera",
    action: { label: "Completar ficha", tone: "secondary" }
  };
}
function inProgressLoPrimeroRow(inProgress, base) {
  const iso = String(inProgress.dueDate || inProgress.reminderAt || inProgress.createdAt || "");
  return {
    ...base,
    reasonText: String(inProgress.text || "En curso"),
    sinceLabel: `${formatTodoDueLabel(iso) || "en curso"} \xB7 en curso`,
    urgency: "en_curso",
    action: { label: "Ver manejo", tone: "secondary" }
  };
}
function loPrimeroRowForPatient(p) {
  const name = String(p.name || p.nombre || "\u2014");
  const ageLabel = p.edad != null && p.edad !== "" ? `${p.edad} a` : "";
  const stayLabel = daysAdmittedLabel(p);
  const { overdue, open } = patientPendientes(p.id);
  const alteredText = lastVitalsAlteredChips(p).join(" \xB7 ");
  const base = { id: p.id, bedLabel: bedLabelForPatient(p), name, ageLabel, stayLabel, alteredText };
  if (overdue.length) return overdueLoPrimeroRow(overdue, base);
  if (isPatientAdmittedToday(p) && isPatientAdmissionIncomplete(p)) {
    return incompleteAdmissionLoPrimeroRow(p, base);
  }
  const inProgress = open.find((t) => t && t.inProgress);
  if (inProgress) return inProgressLoPrimeroRow(inProgress, base);
  return null;
}
var URGENCY_RANK = { vencido: 0, en_espera: 1, en_curso: 2 };
function buildLoPrimeroRows(patients, opts = {}) {
  const limit = opts.limit || 4;
  const all = (patients || []).map(loPrimeroRowForPatient).filter(Boolean);
  all.sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rankDiff !== 0) return rankDiff;
    return String(a.sinceLabel).localeCompare(String(b.sinceLabel));
  });
  const rows = all.slice(0, limit);
  return {
    rows,
    remainingCount: Math.max(0, (patients || []).length - rows.length),
    totalCount: (patients || []).length
  };
}

// public/js/features/inicio-turno/inicio-turno-zones.mjs
var INICIO_TURNO_ZONES_LS = "rpc.inicioTurnoZonas";
function deriveZonesFromCensus(patients) {
  const counts = /* @__PURE__ */ new Map();
  (patients || []).forEach((p) => {
    const zone = String(p?.area || "").trim();
    if (!zone) return;
    counts.set(zone, (counts.get(zone) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([id, count]) => ({ id, label: id, count })).sort((a, b) => a.label.localeCompare(b.label, "es"));
}
function readInicioTurnoZonesPreference(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(INICIO_TURNO_ZONES_LS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x) : [];
  } catch (_e) {
    void _e;
    return [];
  }
}
function writeInicioTurnoZonesPreference(zoneIds, storage = globalThis.localStorage) {
  try {
    storage?.setItem(
      INICIO_TURNO_ZONES_LS,
      JSON.stringify(Array.isArray(zoneIds) ? zoneIds.filter((x) => typeof x === "string" && x) : [])
    );
  } catch (_e) {
    void _e;
  }
}
function zonesFooterNote(previousZoneIds) {
  const ids = Array.isArray(previousZoneIds) ? previousZoneIds.filter(Boolean) : [];
  if (!ids.length) return "Elige las zonas que revisas t\xFA. Se guardan para tu pr\xF3ximo turno.";
  return `La \xFAltima vez llevaste ${ids.join(" y ")}. Guardamos tu selecci\xF3n entre turnos.`;
}

// public/js/features/inicio-turno/inicio-turno-panel.mjs
var LO_PRIMERO_GRID = "92px 1fr 128px 96px";
var dom = null;
var selectedZoneIds = [];
function residentContextLabel() {
  const user = clinicalSessionContext.user;
  const rank = String(user?.rank || "").trim();
  const name = String(user?.clinical_name || user?.username || "").trim();
  const who = name ? `${rank} ${name}`.trim() : rank || "Residente";
  const now = /* @__PURE__ */ new Date();
  const day = now.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" });
  const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return `${day} \xB7 ${time} \xB7 ${who}`;
}
function ensureDom() {
  if (dom) return dom;
  const scrim = document.createElement("div");
  scrim.className = "wb-scrim wb-it-scrim";
  scrim.hidden = true;
  scrim.addEventListener("click", (ev) => {
    if (ev.target === scrim) closeInicioTurnoPanel();
  });
  const win = document.createElement("div");
  win.className = "wb-it-window";
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-modal", "true");
  win.setAttribute("aria-label", "Inicio de turno");
  const frameHost = document.createElement("div");
  frameHost.id = "inicio-turno-mode-frame";
  const countersHost = document.createElement("div");
  countersHost.id = "inicio-turno-counters";
  const body = document.createElement("div");
  body.className = "wb-it-body";
  const colLeft = document.createElement("div");
  colLeft.className = "wb-it-col wb-it-col-left";
  const loPrimeroHost = document.createElement("div");
  loPrimeroHost.id = "inicio-turno-lo-primero";
  loPrimeroHost.className = "wb-it-lo-primero";
  const entregaHost = document.createElement("div");
  entregaHost.id = "inicio-turno-entrega";
  colLeft.appendChild(loPrimeroHost);
  colLeft.appendChild(entregaHost);
  const colRight = document.createElement("div");
  colRight.className = "wb-it-col wb-it-col-right";
  const zonasHost = document.createElement("div");
  zonasHost.id = "inicio-turno-zonas";
  const internosHost = document.createElement("div");
  internosHost.id = "inicio-turno-internos";
  const labsEmptyHost = document.createElement("div");
  labsEmptyHost.id = "inicio-turno-labs-empty";
  const icEmptyHost = document.createElement("div");
  icEmptyHost.id = "inicio-turno-ic-empty";
  colRight.appendChild(zonasHost);
  colRight.appendChild(internosHost);
  colRight.appendChild(labsEmptyHost);
  colRight.appendChild(icEmptyHost);
  body.appendChild(colLeft);
  body.appendChild(colRight);
  win.appendChild(frameHost);
  win.appendChild(countersHost);
  win.appendChild(body);
  scrim.appendChild(win);
  document.body.appendChild(scrim);
  dom = {
    scrim,
    win,
    frameHost,
    countersHost,
    loPrimeroHost,
    entregaHost,
    zonasHost,
    internosHost,
    labsEmptyHost,
    icEmptyHost
  };
  return dom;
}
function renderModeFrame(host, total) {
  mountModeFrame(host, {
    modeName: "Inicio de turno",
    context: residentContextLabel(),
    secondaryActions: [{ label: "Censo completo", onClick: () => closeInicioTurnoPanel() }],
    primaryAction: {
      label: `Recibir ${total} paciente${total === 1 ? "" : "s"}`,
      onClick: () => closeInicioTurnoPanel()
    }
  });
}
function renderCounters(host, patients) {
  const heredas = computeHeredasPendientesSummary(patients);
  const signos = computeTomaSignosSummary(patients);
  const ingresos = computeIngresosNocheSummary(patients);
  mountCountersBand(host, [
    {
      label: "Heredas pendientes",
      figure: `${heredas.open} abierto${heredas.open === 1 ? "" : "s"}`,
      detail: heredas.overdue > 0 ? `${heredas.overdue} vencido${heredas.overdue === 1 ? "" : "s"}` : "",
      tone: "alert"
    },
    {
      label: "Toma de signos",
      figure: `${signos.receivedToday} de ${signos.total} recibidos`,
      progress: { percent: signos.percent }
    },
    {
      label: "Ingresos de la noche",
      figure: `${ingresos.admittedToday} nuevo${ingresos.admittedToday === 1 ? "" : "s"}`,
      detail: ingresos.incompleteChart > 0 ? `${ingresos.incompleteChart} con ficha incompleta` : ""
    }
  ]);
}
function loPrimeroRowHtml(row) {
  const lineOne = `${escHtml(row.name)} <span class="wb-it-line-muted">${escHtml(
    [row.ageLabel, row.stayLabel].filter(Boolean).join(" \xB7 ")
  )}</span>`;
  const lineTwo = row.alteredText ? `${escHtml(row.reasonText)} \xB7 <span class="wb-it-altered">${escHtml(row.alteredText)}</span>` : escHtml(row.reasonText);
  const nameCell = `<div class="wb-it-row-lines"><span class="wb-it-row-name">${lineOne}</span><span class="wb-it-row-reason">${lineTwo}</span></div>`;
  const sinceClass = row.urgency === "vencido" ? "wb-it-since--vencido" : row.urgency === "en_espera" ? "wb-it-since--espera" : "wb-it-since--curso";
  const sinceCell = `<span class="wb-it-since ${sinceClass}">${escHtml(row.sinceLabel)}</span>`;
  const btnClass = row.action.tone === "primary" ? "wb-btn wb-btn-primary" : "wb-btn wb-btn-secondary";
  const actionCell = `<button type="button" class="${btnClass}" data-it-row-action="${escHtml(row.id)}">${escHtml(row.action.label)}</button>`;
  return buildRowHtml({
    id: row.id,
    cellsHtml: [`<span class="wb-it-bed">${escHtml(row.bedLabel)}</span>`, nameCell, sinceCell, actionCell],
    alert: row.urgency === "vencido",
    twoLine: true,
    gridTemplate: LO_PRIMERO_GRID
  });
}
function renderLoPrimero(host, patients) {
  const { rows, remainingCount, totalCount } = buildLoPrimeroRows(patients, { limit: 4 });
  const rowsHtml = rows.map(loPrimeroRowHtml).join("");
  const summary = rows.length ? `${remainingCount} paciente${remainingCount === 1 ? "" : "s"} sin nada urgente al recibir` : `Los ${totalCount} pacientes est\xE1n sin nada urgente al recibir`;
  host.innerHTML = '<div class="wb-table-card wb-it-table-card">' + buildTableCardHeaderHtml({
    title: `Lo primero \xB7 ${rows.length} cama${rows.length === 1 ? "" : "s"}`,
    actionsHtml: `<span class="wb-it-table-sub">de ${totalCount}</span>`
  }) + buildColumnHeadHtml(["Cama", "Por qu\xE9", "Desde", "Acci\xF3n"], LO_PRIMERO_GRID) + `<div class="wb-table-body">${rowsHtml}</div>` + buildSummaryLineHtml(summary) + "</div>";
  host.querySelectorAll("[data-it-row-action]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const patientId = btn.getAttribute("data-it-row-action");
      openPatientFromInicioTurno(patientId);
    });
  });
}
function openPatientFromInicioTurno(patientId) {
  closeInicioTurnoPanel();
  void import("/mobile/js/chunks/patients-GGIREUSR.js").then((mod) => {
    if (typeof mod.selectPatient === "function") mod.selectPatient(patientId);
  });
}
function renderEntregaEmptyState(host) {
  mountEmptyState(host, {
    label: "Entrega de la guardia saliente",
    missing: "R+ todav\xEDa no guarda un resumen de texto libre de la guardia que entrega.",
    whenArrives: "Se habilita cuando exista un campo de entrega de turno en R+; mientras tanto, revisa los pendientes heredados arriba."
  });
}
function renderZonasCard(host, patients) {
  const zones = deriveZonesFromCensus(patients);
  if (!zones.length) {
    mountEmptyState(host, {
      label: "Tus zonas hoy",
      missing: "Ning\xFAn paciente del censo tiene un \xE1rea asignada todav\xEDa.",
      whenArrives: "Se llenan solas en cuanto se registre el \xE1rea de cada paciente."
    });
    return;
  }
  function paint() {
    const chipsHtml = zones.map((z) => {
      const isActive = selectedZoneIds.includes(z.id);
      return buildFilterChipHtml(
        { id: z.id, label: `${z.label} \xB7 ${z.count}` },
        isActive ? z.id : null,
        "teal"
      );
    }).join("");
    host.innerHTML = '<div class="wb-table-card wb-it-zonas-card">' + buildTableCardHeaderHtml({ title: "Tus zonas hoy" }) + `<div class="wb-it-zonas-body"><p class="wb-it-zonas-hint">Elige las zonas que revisas t\xFA. Filtran el censo mientras dure el turno.</p><div class="wb-chips">${chipsHtml}</div><p class="wb-it-zonas-footer">${escHtml(zonesFooterNote(selectedZoneIds))}</p></div></div>`;
    host.querySelectorAll("[data-wb-chip-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-wb-chip-id");
        selectedZoneIds = selectedZoneIds.includes(id) ? selectedZoneIds.filter((z) => z !== id) : [...selectedZoneIds, id];
        writeInicioTurnoZonesPreference(selectedZoneIds);
        paint();
      });
    });
  }
  paint();
}
function renderInternosEmptyState(host) {
  mountEmptyState(host, {
    label: "Internos del turno",
    missing: "R+ no tiene un rol de interno ni una asignaci\xF3n de zona/camas por interno todav\xEDa.",
    whenArrives: "Se habilita cuando exista ese modelo de datos; por ahora, coordina la cobertura fuera de la app."
  });
}
function renderLabsEmptyState(host) {
  mountEmptyState(host, {
    label: "Labs de hoy",
    missing: "Todav\xEDa no hay resultados de hoy.",
    whenArrives: "Aparecen aqu\xED y en cada paciente en cuanto se registran en R+.",
    exitLabel: "Abrir laboratorio"
  });
  const exit = host.querySelector("[data-wb-empty-exit]");
  if (exit) {
    exit.addEventListener("click", () => {
      closeInicioTurnoPanel();
      if (typeof window !== "undefined" && typeof window.switchAppTab === "function") {
        window.switchAppTab("lab");
      }
    });
  }
}
function renderInterconsultasEmptyState(host) {
  mountEmptyState(host, {
    label: "Interconsultas",
    missing: "Sin solicitudes nuevas para revisar aqu\xED.",
    whenArrives: "Las que ya est\xE9n en seguimiento siguen disponibles en el modo Interconsultas.",
    exitLabel: "Abrir modo interconsultas"
  });
  const exit = host.querySelector("[data-wb-empty-exit]");
  if (exit) {
    exit.addEventListener("click", () => {
      closeInicioTurnoPanel();
      if (typeof window !== "undefined" && typeof window.setWorkModeFromHeader === "function") {
        window.setWorkModeFromHeader("interconsulta");
      }
    });
  }
}
function onKeydown(ev) {
  if (ev.key === "Escape") closeInicioTurnoPanel();
}
function openInicioTurnoPanel() {
  const d = ensureDom();
  const patients = getPatients() || [];
  selectedZoneIds = readInicioTurnoZonesPreference();
  renderModeFrame(d.frameHost, patients.length);
  renderCounters(d.countersHost, patients);
  renderLoPrimero(d.loPrimeroHost, patients);
  renderEntregaEmptyState(d.entregaHost);
  renderZonasCard(d.zonasHost, patients);
  renderInternosEmptyState(d.internosHost);
  renderLabsEmptyState(d.labsEmptyHost);
  renderInterconsultasEmptyState(d.icEmptyHost);
  d.scrim.hidden = false;
  requestAnimationFrame(() => d.scrim.classList.add("wb-scrim--open"));
  document.addEventListener("keydown", onKeydown);
}
function closeInicioTurnoPanel() {
  if (!dom) return;
  dom.scrim.classList.remove("wb-scrim--open");
  dom.scrim.hidden = true;
  document.removeEventListener("keydown", onKeydown);
}
function isInicioTurnoPanelOpen() {
  return !!dom && !dom.scrim.hidden;
}
export {
  closeInicioTurnoPanel,
  isInicioTurnoPanelOpen,
  openInicioTurnoPanel
};
//# sourceMappingURL=/js/chunks/inicio-turno-panel-UDRVDMVN.js.map
