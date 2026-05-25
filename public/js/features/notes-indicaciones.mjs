// Expediente · nota evolución, indicaciones, Word
import {
  notes,
  indicaciones,
  patients,
  saveState,
} from "../app-state.mjs";
import { isModeSala } from "../mode-features.mjs";
import { setAsyncButtonLoading } from "../ui-motion.mjs";
import { buildPatientDemographicsCardHtml, renderPatientDataPane } from "./expediente.mjs";

let rt = {
  getActiveId() { return null; },
  getSettings() { return /** @type {any} */ ({}); },
  showToast() {},
  renderRoundOverviewPanels() {},
  syncOfflineButtonStates() {},
  guardMobileDocExport() { return false; },
  isRpcOffline() { return false; },
  incrementPendingJobs() {},
  decrementPendingJobs() {},
  requestDocumentJson() { return Promise.resolve(null); },
  handleDocumentGenerateResponse() { return Promise.resolve(null); },
  guidedTourAdvanceAfterNotaGenerated() {},
  guidedTourAdvanceAfterIndicaGenerated() {},
  addAuditEntry() {},
};

export function registerNotesIndicacionesRuntime(partial) {
  if (!partial || typeof partial !== "object") return;
  Object.assign(rt, partial);
}

function aid() {
  return rt.getActiveId();
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Prefill médico ─────────────────────────────────────────────────────
export function applyProfileToNoteIfEmpty(note) {
  if (!note) return false;
  var changed = false;
  if ((rt.getSettings() || {}).doctorName && !String(note.medico || '').trim()) {
    note.medico = (rt.getSettings() || {}).doctorName;
    changed = true;
  }
  if ((rt.getSettings() || {}).profesorName && !String(note.profesor || '').trim()) {
    note.profesor = (rt.getSettings() || {}).profesorName;
    changed = true;
  }
  return changed;
}

// ── Formulario Nota ───────────────────────────────────────────────────
function renderNoteForm() {
  var patient = patients.find(function (p) {
    return String(p.id) === String(aid());
  });
  if (!patient) return;
  if (aid()) {
    if (!notes[aid()]) notes[aid()] = {};
    if (applyProfileToNoteIfEmpty(notes[aid()])) saveState();
  }
  var note = notes[aid()] || {};
  var salaMode = isModeSala((rt.getSettings() || {}));
  var demoCard = salaMode ? '' : buildPatientDemographicsCardHtml(patient);
  document.getElementById('note-form').innerHTML = (
    demoCard +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(note.fecha) + '" oninput="updateNote(\'fecha\',this.value)" placeholder="DD/MM/AAAA"></div>' +
    '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(note.hora) + '" oninput="updateNote(\'hora\',this.value)" placeholder="HH:MM"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Resumen de Interrogatorio, Exploración Física y Estado Mental</div><div class="card-body"><div class="field-group"><textarea rows="5" placeholder="Ingresa el resumen de interrogatorio, exploración física y estado mental..." oninput="updateNote(\'interrogatorio\',this.value)">' + esc(note.interrogatorio) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#065f46;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evolución y Actualización del Cuadro Clínico</span><button type="button" id="btn-soap-template" onclick="openSOAPModal()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.25)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.15)\'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>Plantilla SOAP</button></div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="N: [Neurológico]&#10;V: [Ventilatorio]&#10;HD: [Hemodinámico]&#10;HI: [Infeccioso]&#10;NM: [Nutricional/Metabólico]" oninput="updateNote(\'evolucion\',this.value)">' + esc(note.evolucion) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#3730a3;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>Resultados de Estudios Auxiliares</div><div class="card-body"><div class="field-group"><textarea rows="9" placeholder="Una línea por renglón del documento:&#10;FECHA (ej. 09.04.26)&#10;QS Glu Cr BUN..." oninput="updateNote(\'estudios\',this.value)">' + esc(note.estudios) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#881337;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>Diagnóstico(s)</div><div class="card-body">' +
    '<div class="list-rows" id="dx-list">' +
    (note.diagnosticos||['']).map(function(dx,i){ return '<div class="list-row"><input type="text" value="' + esc(dx) + '" placeholder="Diagnóstico ' + (i+1) + '" oninput="updateDx(' + i + ',this.value)" style="text-transform:uppercase;"><button class="btn-remove" onclick="removeDx(' + i + ')"' + ((note.diagnosticos||['']).length<=1?' style="visibility:hidden"':'') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addDx()">+ Agregar diagnóstico</button></div></div>' +

    '<div class="card"><div class="card-header" style="background:#78350f;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Signos Vitales</div><div class="card-body"><div class="vitals-grid">' +
    '<div class="vital-box"><div class="vital-label">T.A.</div><input type="text" value="' + esc(note.ta) + '" placeholder="120/80" oninput="updateNote(\'ta\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">F.R.</div><input type="text" value="' + esc(note.fr) + '" placeholder="16" oninput="updateNote(\'fr\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">F.C.</div><input type="text" value="' + esc(note.fc) + '" placeholder="72" oninput="updateNote(\'fc\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">Temperatura</div><input type="text" value="' + esc(note.temp) + '" placeholder="36.6" oninput="updateNote(\'temp\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">Peso (kg)</div><input type="text" value="' + esc(note.peso) + '" placeholder="70.0" oninput="updateNote(\'peso\',this.value)"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#134e4a;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>Tratamiento e Indicaciones Médicas</div><div class="card-body">' +
    '<div class="list-rows" id="tx-list">' +
    (note.tratamiento||['']).map(function(tx,i){ return '<div class="list-row"><span class="list-num">' + (i+1) + '.</span><input type="text" value="' + esc(tx) + '" placeholder="Indicación, dosis, vía y periodicidad" oninput="updateTx(' + i + ',this.value)"><button class="btn-remove" onclick="removeTx(' + i + ')"' + ((note.tratamiento||['']).length<=1?' style="visibility:hidden"':'') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addTx()">+ Agregar indicación</button></div></div>' +

    '<div class="card"><div class="card-header" style="background:#4a1d96;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Médico y Profesor</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Médico Tratante</label><input type="text" value="' + esc(note.medico) + '" placeholder="Nombre completo" oninput="updateNote(\'medico\',this.value)"></div>' +
    '<div class="field-group"><label>Profesor Responsable</label><input type="text" value="' + esc(note.profesor) + '" placeholder="Nombre completo" oninput="updateNote(\'profesor\',this.value)"></div>' +
    '</div></div></div>' +

    '<div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-note"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button type="button" class="btn-generate rpc-doc-export" onclick="generateWord()" id="btn-gen"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Nota (.docx)</button></div>'
  );
  renderPatientDataPane();
  rt.syncOfflineButtonStates();
}

// ── Campos Dx/Tx ──────────────────────────────────────────────────────
function updateNote(field, value) { if (!notes[aid()]) notes[aid()]={}; notes[aid()][field]=value; saveState(); if (field === 'estudios') rt.renderRoundOverviewPanels(); }
function updateDx(i, val) { if (!notes[aid()]) return; notes[aid()].diagnosticos[i]=val.toUpperCase(); saveState(); }
function addDx() { if (!notes[aid()]) return; notes[aid()].diagnosticos.push(''); saveState(); renderNoteForm(); }
function removeDx(i) { if (!notes[aid()]||notes[aid()].diagnosticos.length<=1) return; notes[aid()].diagnosticos.splice(i,1); saveState(); renderNoteForm(); }
function updateTx(i, val) { if (!notes[aid()]) return; notes[aid()].tratamiento[i]=val; saveState(); }
function addTx() { if (!notes[aid()]) return; notes[aid()].tratamiento.push(''); saveState(); renderNoteForm(); }
function removeTx(i) { if (!notes[aid()]||notes[aid()].tratamiento.length<=1) return; notes[aid()].tratamiento.splice(i,1); saveState(); renderNoteForm(); }

// ── Word nota ───────────────────────────────────────────────────────────
function generateWord() {
  if (rt.guardMobileDocExport()) return;
  if (rt.isRpcOffline()) {
    rt.showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
    return;
  }
  var patient = patients.find(function(p){ return p.id===aid(); }); if (!patient) return;
  var note = notes[aid()]; if (!note) return;
  var btn = document.getElementById('btn-gen');
  setAsyncButtonLoading(btn, true, { loadingText: 'Generando…' });
  rt.incrementPendingJobs();
  function buildPayload(outputDir) {
    return { patient: patient, note: note, outputDir: outputDir || '' };
  }
  rt.requestDocumentJson('/generate', buildPayload((rt.getSettings() || {}).outputDir || ''))
  .then(function(d){
    return rt.handleDocumentGenerateResponse({
      response: d,
      url: '/generate',
      buildPayload: buildPayload,
      onSuccess: function(data) {
        rt.showToast('Nota guardada: '+data.fileName,'success');
        rt.guidedTourAdvanceAfterNotaGenerated();
      },
    });
  })
  .catch(function(){ rt.showToast('Error de conexión','error'); })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}

// ── Indicaciones ─────────────────────────────────────────────────────
function renderIndicaForm() {
  var patient = patients.find(function(p){ return p.id===aid(); }); if (!patient) return;
  if (!indicaciones[aid()]) {
    var today = new Date();
    indicaciones[aid()] = { fecha:String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear(), hora:String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0'), medicos:'',dieta:'',cuidados:'',estudios:'',medicamentos:'',interconsultas:'',otros:[] };
  }
  var ind = indicaciones[aid()];
  var SECTIONS = [
    {key:'dieta',label:'Dieta',placeholder:'DIETA NORMAL DIABÉTICA ALTA EN FIBRA...'},
    {key:'cuidados',label:'Cuidados',placeholder:'COLOCAR SONDA FOLEY.\nCUANTIFICACIÓN ESTRICTA DE INGRESOS Y EGRESOS...'},
    {key:'estudios',label:'Estudios',placeholder:'BH, QS, EGO...'},
    {key:'medicamentos',label:'Medicamentos',placeholder:'PARACETAMOL 1G VO CADA 8 HORAS PRN...'},
    {key:'interconsultas',label:'Interconsultas',placeholder:'CONTINUAR INDICACIONES DE INFECTOLOGÍA...'},
  ];
  document.getElementById('indica-form').innerHTML = (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;">' +
    '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Edad/Sexo</label><input type="text" value="' + esc(patient.edad)+' / '+esc(patient.sexo) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" class="field-readonly" readonly></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha, Hora y Médicos</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;">' +
    '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(ind.fecha) + '" placeholder="DD/MM/AAAA" oninput="updateIndica(\'fecha\',this.value)"></div>' +
    '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(ind.hora) + '" placeholder="HH:MM" oninput="updateIndica(\'hora\',this.value)"></div>' +
    '<div class="field-group"><label>Médicos (uno por línea)</label><textarea rows="3" placeholder="R3 NOMBRE APELLIDO" oninput="updateIndica(\'medicos\',this.value)">' + esc(ind.medicos) + '</textarea></div>' +
    '</div></div></div>' +

    buildExtraTemplatesSelectorHtml() +

    SECTIONS.map(function(s){ return '<div class="indica-section"><div class="indica-section-header">'+s.label+'</div><div class="indica-section-body"><textarea rows="3" placeholder="'+s.placeholder+'" oninput="updateIndica(\''+s.key+'\',this.value)">'+esc(ind[s.key])+'</textarea></div></div>'; }).join('') +

    '<div class="card"><div class="card-header" style="background:#4a1d96;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>Otros</div><div class="card-body" style="display:flex;flex-direction:column;gap:10px;"><div id="otros-list">' +
    (ind.otros||[]).map(function(o,i){ return '<div class="otros-item"><button class="btn-remove-otro" onclick="removeOtro('+i+')">×</button><input type="text" placeholder="TÍTULO DE LA SECCIÓN" value="'+esc(o.titulo)+'" oninput="updateOtro('+i+',\'titulo\',this.value)"><textarea rows="2" placeholder="Indicaciones..." oninput="updateOtro('+i+',\'contenido\',this.value)">'+esc(o.contenido)+'</textarea></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addOtro()">+ Agregar sección</button></div></div>' +

    '<div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-indica"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button type="button" class="btn-generate rpc-doc-export" onclick="generateIndicaciones()" id="btn-gen-ind"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Indicaciones (.docx)</button></div>'
  );
  rt.syncOfflineButtonStates();
}

function updateIndica(field, value) { if (!indicaciones[aid()]) return; indicaciones[aid()][field]=value; saveState(); }

function updateOtro(i, field, value) { if (!indicaciones[aid()]) return; indicaciones[aid()].otros[i][field]=value; saveState(); }

function addOtro() {
  if (!indicaciones[aid()]) return;
  indicaciones[aid()].otros = indicaciones[aid()].otros || [];
  indicaciones[aid()].otros.push({ titulo:'', contenido:'' });
  saveState();
  renderIndicaForm();
}

function removeOtro(i) {
  if (!indicaciones[aid()]) return;
  indicaciones[aid()].otros.splice(i, 1);
  saveState();
  renderIndicaForm();
}

// ── Plantillas guardadas ──────────────────────────────────────────────
function buildExtraTemplatesSelectorHtml() {
  var arr = ((rt.getSettings() || {}) && Array.isArray((rt.getSettings() || {}).extraTemplates)) ? (rt.getSettings() || {}).extraTemplates : [];
  if (!arr.length) {
    return '<div class="indica-extra-tmpl"><span class="iet-hint">Guarda combinaciones reutilizables en Ajustes → Plantillas guardadas.</span></div>';
  }
  var opts = '<option value="">— Aplicar plantilla guardada —</option>' +
    arr.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.label || '(sin nombre)') + '</option>'; }).join('');
  return '<div class="indica-extra-tmpl">' +
    '<select id="indica-extra-tmpl-select" aria-label="Seleccionar plantilla guardada">' + opts + '</select>' +
    '<button type="button" onclick="applyExtraTemplateFromIndica()">Aplicar</button>' +
    '</div>';
}

function applyExtraTemplateFromIndica() {
  var sel = document.getElementById('indica-extra-tmpl-select');
  if (!sel || !sel.value) { rt.showToast('Elige una plantilla', 'error'); return; }
  if (!aid() || !indicaciones[aid()]) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  var tmpl = ((rt.getSettings() || {}).extraTemplates || []).find(function(t){ return t.id === sel.value; });
  if (!tmpl) return;
  var target = indicaciones[aid()];
  var hasExisting = (target.dieta && target.dieta.trim()) ||
    (target.cuidados && target.cuidados.trim()) ||
    (target.medicamentos && target.medicamentos.trim());
  var mode = 'replace';
  if (hasExisting) {
    var ans = prompt('Ya hay contenido en las indicaciones.\nEscribe R = reemplazar, A = agregar al final, C = cancelar.', 'A');
    var v = String(ans || '').trim().toUpperCase();
    if (v === 'C' || v === '') return;
    mode = (v === 'R') ? 'replace' : 'append';
  }
  function merge(current, addition) {
    if (!addition) return current || '';
    if (mode === 'replace') return addition;
    if (!current) return addition;
    return current.replace(/\s+$/, '') + '\n' + addition;
  }
  target.dieta = merge(target.dieta || '', tmpl.dieta || '');
  target.cuidados = merge(target.cuidados || '', tmpl.cuidados || '');
  target.medicamentos = merge(target.medicamentos || '', tmpl.medicamentos || '');
  saveState();
  renderIndicaForm();
  rt.addAuditEntry('extra-template-apply', 'ok', 1, tmpl.label || '');
  rt.showToast('Plantilla aplicada: ' + (tmpl.label || ''), 'success');
}

// ── Word indicaciones ────────────────────────────────────────────────
function generateIndicaciones() {
  if (rt.guardMobileDocExport()) return;
  if (rt.isRpcOffline()) {
    rt.showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
    return;
  }
  var patient = patients.find(function(p){ return p.id===aid(); }); if (!patient) return;
  var ind = indicaciones[aid()]; if (!ind) return;
  var btn = document.getElementById('btn-gen-ind');
  setAsyncButtonLoading(btn, true, { loadingText: 'Generando…' });
  rt.incrementPendingJobs();
  function buildPayload(outputDir) {
    return { patient: patient, indicaciones: ind, outputDir: outputDir || '' };
  }
  rt.requestDocumentJson('/generate-indicaciones', buildPayload((rt.getSettings() || {}).outputDir || ''))
  .then(function(d){
    return rt.handleDocumentGenerateResponse({
      response: d,
      url: '/generate-indicaciones',
      buildPayload: buildPayload,
      onSuccess: function(data) {
        rt.showToast('Indicaciones guardadas: '+data.fileName,'success');
        rt.guidedTourAdvanceAfterIndicaGenerated();
      },
    });
  })
  .catch(function(){ rt.showToast('Error de conexión','error'); })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen-ind'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}


export {
  renderNoteForm,
  updateNote,
  updateDx,
  addDx,
  removeDx,
  updateTx,
  addTx,
  removeTx,
  generateWord,
  renderIndicaForm,
  updateIndica,
  updateOtro,
  addOtro,
  removeOtro,
  generateIndicaciones,
};

export const windowHandlers = {
  updateNote,
  updateDx,
  addDx,
  removeDx,
  updateTx,
  addTx,
  removeTx,
  generateWord,
  renderIndicaForm,
  updateIndica,
  updateOtro,
  addOtro,
  removeOtro,
  generateIndicaciones,
  applyExtraTemplateFromIndica,
};
