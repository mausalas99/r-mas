# Copy Labs + Plantilla SOAP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar botón "Copiar labs" al portapapeles y modal de Plantilla SOAP con formulario estructurado para la sección de evolución.

**Architecture:** Todo el código vive en `public/index.html` (JS + HTML + CSS inline, patrón existente del proyecto). El botón "Copiar labs" es una función simple que reutiliza `buildLabLines()`. El modal SOAP es un elemento estático oculto en el DOM que se muestra/oculta con JS, siguiendo el patrón de `templates-modal`. Los estilos CSS se agregan junto a los modales existentes.

**Tech Stack:** HTML/CSS/JS vanilla inline en Electron app. Sin framework de tests — verificación manual en el navegador.

---

## Mapa de archivos

| Archivo | Cambios |
|---------|---------|
| `public/index.html` (CSS ~línea 290) | Agregar estilos `.soap-modal-backdrop` / `.soap-modal-*` |
| `public/index.html` (HTML ~línea 496) | Agregar botón "Copiar" en header de `#lab-output-section` |
| `public/index.html` (HTML ~línea 1777) | Modificar card evolución: `justify-content:space-between` + botón "Plantilla SOAP" |
| `public/index.html` (HTML ~línea 2215) | Agregar markup del SOAP modal antes de `</body>` |
| `public/index.html` (JS ~línea 1501) | Agregar `copiarLabsAlPortapapeles()` junto a `enviarLabsANota()` |
| `public/index.html` (JS ~línea 1615) | Agregar 5 funciones SOAP: `openSOAPModal`, `closeSOAPModal`, `updateSOAPBalance`, `buildSOAPText`, `insertSOAPText` |

---

## Task 1: Botón "Copiar labs" — función JS

**Files:**
- Modify: `public/index.html` (JS, junto a `enviarLabsANota` ~línea 1501)

- [ ] **Step 1: Agregar la función `copiarLabsAlPortapapeles`**

Abre `public/index.html`. Localiza `function enviarLabsANota()` (~línea 1501). Inserta la siguiente función **justo antes** de `function enviarLabsANota()`:

```javascript
function copiarLabsAlPortapapeles() {
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    showToast('No hay resultados procesados', 'error'); return;
  }
  var text = buildLabLines().join('\n');
  navigator.clipboard.writeText(text)
    .then(function() { showToast('Labs copiados al portapapeles ✓', 'success'); })
    .catch(function() { showToast('Error al copiar al portapapeles', 'error'); });
}

```

- [ ] **Step 2: Verificar que la función existe en el DOM**

Abre la app en Electron (`npm start` o usa la ventana abierta). Abre DevTools (Cmd+Opt+I), en la consola escribe:

```
typeof copiarLabsAlPortapapeles
```

Expected: `"function"`

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: add copiarLabsAlPortapapeles function"
```

---

## Task 2: Botón "Copiar" en header de Resultados

**Files:**
- Modify: `public/index.html` (HTML, ~línea 492–501)

- [ ] **Step 1: Localizar el header del card Resultados**

En `public/index.html`, localiza esta línea exacta (~línea 497):

```html
            <button onclick="enviarLabsANota()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/><path d="M12 12v6m0 0l-2-2m2 2l2-2"/></svg>
              Enviar a nota
            </button>
```

- [ ] **Step 2: Reemplazar con los dos botones (Copiar + Enviar a nota)**

Reemplaza el bloque del `<button onclick="enviarLabsANota()">` con:

```html
            <div style="display:flex;gap:6px;">
              <button onclick="copiarLabsAlPortapapeles()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copiar
              </button>
              <button onclick="enviarLabsANota()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/><path d="M12 12v6m0 0l-2-2m2 2l2-2"/></svg>
                Enviar a nota
              </button>
            </div>
```

- [ ] **Step 3: Verificar visualmente**

Recarga la app. Parsea un reporte de laboratorio. Verifica que en el header morado de "Resultados" aparecen **dos botones**: "Copiar" a la izquierda y "Enviar a nota" a la derecha.

- [ ] **Step 4: Verificar funcionalidad del botón Copiar**

Con labs parseados, presiona "Copiar". Verifica:
- Toast: `"Labs copiados al portapapeles ✓"`
- Pega el contenido en un editor de texto — debe mostrar las líneas de labs formateadas (fecha + resultados limpios)

- [ ] **Step 5: Verificar error sin labs**

Sin parsear ningún reporte (o recargando la app), presiona "Copiar". Verifica:
- Toast: `"No hay resultados procesados"` en rojo

- [ ] **Step 6: Commit**

```bash
git add public/index.html
git commit -m "feat: add Copiar labs button to Resultados card header"
```

---

## Task 3: CSS del SOAP modal

**Files:**
- Modify: `public/index.html` (CSS, ~línea 290 junto a `.lab-conflict-modal`)

- [ ] **Step 1: Localizar el bloque CSS de lab-conflict-modal**

En `public/index.html`, localiza esta línea (~línea 290):

```css
  /* ── Lab conflict modal ───────────────────────────────── */
```

- [ ] **Step 2: Agregar CSS del SOAP modal justo después del bloque lab-conflict**

Localiza el final del bloque `lab-conflict` (~línea 302, después de `.lab-conflict-modal p { ... }`). Inserta el siguiente bloque CSS inmediatamente después:

```css
  /* ── SOAP Evolution modal ────────────────────────────── */
  .soap-modal-backdrop {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55);
    z-index: 9995; align-items: center; justify-content: center;
  }
  .soap-modal-backdrop.open { display: flex; animation: fade-in 0.15s ease-out; }
  .soap-modal {
    background: var(--surface); border-radius: 12px; width: 620px;
    max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;
    overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: modal-in 0.15s ease-out;
  }
  .soap-modal-header {
    background: #065F46; color: white; padding: 11px 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .soap-modal-header-title { display: flex; align-items: center; gap: 8px; }
  .soap-modal-body {
    padding: 18px; overflow-y: auto; flex: 1;
    display: flex; flex-direction: column; gap: 10px;
  }
  .soap-section {
    border: 1px solid var(--border); border-radius: 8px;
    overflow: hidden; flex-shrink: 0; box-shadow: var(--shadow);
  }
  .soap-section-header {
    background: #EFF6FF; border-bottom: 1px solid var(--border);
    padding: 7px 14px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px; color: var(--primary);
  }
  .soap-section-body {
    padding: 14px; background: var(--surface);
    display: flex; flex-direction: column; gap: 10px;
  }
  .soap-modal-footer {
    padding: 14px 18px; border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 10px;
    background: var(--surface); flex-shrink: 0;
  }
  .soap-modal input[type="text"],
  .soap-modal input[type="number"],
  .soap-modal select,
  .soap-modal textarea {
    border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px;
    font-size: 13px; font-family: inherit; color: var(--text); background: #F8FAFC;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    line-height: 1.5; width: 100%; box-sizing: border-box; text-transform: uppercase;
  }
  .soap-modal input[type="text"]:focus,
  .soap-modal input[type="number"]:focus,
  .soap-modal select:focus,
  .soap-modal textarea:focus {
    outline: none; border-color: var(--action); background: white;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
  }
  .soap-modal select { text-transform: none; }
  .soap-modal textarea { text-transform: none; resize: vertical; min-height: 58px; }
  .soap-modal input::placeholder,
  .soap-modal textarea::placeholder { color: #94A3B8; font-style: italic; text-transform: none; }
  .soap-field-readonly {
    border: none !important; background: #F1F5F9 !important;
    color: var(--text-muted) !important; box-shadow: none !important; cursor: default;
  }
```

- [ ] **Step 3: Verificar que no hay errores de CSS**

Recarga la app. Abre DevTools → Console. Verifica que no hay errores de CSS. La app debe verse igual que antes (el modal está oculto por defecto).

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add SOAP modal CSS styles"
```

---

## Task 4: HTML del SOAP modal

**Files:**
- Modify: `public/index.html` (HTML, justo antes de `</body>` ~línea 2215)

- [ ] **Step 1: Localizar `</body>` al final del archivo**

En `public/index.html`, localiza `</body>` (~última línea del archivo, actualmente ~línea 2217).

- [ ] **Step 2: Insertar el markup del SOAP modal justo antes de `</body>`**

```html
<!-- ── SOAP Evolution Modal ──────────────────────────── -->
<div class="soap-modal-backdrop" id="soap-modal-backdrop">
  <div class="soap-modal">
    <div class="soap-modal-header">
      <div class="soap-modal-header-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Plantilla de Evolución
      </div>
      <button onclick="closeSOAPModal()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">× Cerrar</button>
    </div>
    <div class="soap-modal-body">
      <!-- S: Subjetivo -->
      <div class="soap-section" style="flex-shrink:0;">
        <div class="soap-section-header">S — Subjetivo</div>
        <div class="soap-section-body">
          <textarea id="soap-s" rows="2" placeholder="Paciente refiere mejoría del dolor, tolera vía oral…"></textarea>
        </div>
      </div>
      <!-- N: Neurológico -->
      <div class="soap-section">
        <div class="soap-section-header">N — Neurológico</div>
        <div class="soap-section-body">
          <div style="display:grid;grid-template-columns:140px 120px 1fr;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">FOUR Score</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <input type="number" id="soap-four" placeholder="16" style="width:64px;text-align:center;">
                <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">/16 pts</span>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Esferas</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <input type="number" id="soap-esferas" placeholder="3" style="width:64px;text-align:center;">
                <span style="font-size:12px;color:var(--text-muted);">esf.</span>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Analgesia</div>
              <input type="text" id="soap-analgesia" placeholder="Paracetamol 1g IV c/8h">
            </div>
          </div>
        </div>
      </div>
      <!-- V: Ventilatorio -->
      <div class="soap-section">
        <div class="soap-section-header">V — Ventilatorio</div>
        <div class="soap-section-body">
          <div style="display:grid;grid-template-columns:100px 100px 1fr;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">FR (rpm)</div>
              <input type="number" id="soap-fr" placeholder="18" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">SatO2 (%)</div>
              <input type="number" id="soap-sat" placeholder="97" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Soporte O2</div>
              <select id="soap-soporte">
                <option value="Aire ambiente">Aire ambiente</option>
                <option value="Puntillas nasales">Puntillas nasales</option>
                <option value="Alto flujo">Alto flujo</option>
                <option value="VM no invasiva">VM no invasiva</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <!-- HD: Hemodinámico -->
      <div class="soap-section">
        <div class="soap-section-header">HD — Hemodinámico</div>
        <div class="soap-section-body">
          <div style="display:grid;grid-template-columns:100px 100px 100px;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">TAS (mmHg)</div>
              <input type="number" id="soap-tas" placeholder="120" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">TAD (mmHg)</div>
              <input type="number" id="soap-tad" placeholder="80" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">FC (lpm)</div>
              <input type="number" id="soap-fc" placeholder="76" style="text-align:center;">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Antihipertensivos</div>
              <input type="text" id="soap-antihta" placeholder="Ninguno">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Vasopresores</div>
              <input type="text" id="soap-vasop" placeholder="Ninguno">
            </div>
          </div>
        </div>
      </div>
      <!-- HI: Infeccioso -->
      <div class="soap-section">
        <div class="soap-section-header">HI — Infeccioso / Térmico</div>
        <div class="soap-section-body">
          <div style="display:grid;grid-template-columns:140px 1fr;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Temperatura (°C)</div>
              <input type="number" id="soap-temp" placeholder="36.6" step="0.1" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Antibióticos</div>
              <input type="text" id="soap-abx" placeholder="Ninguno  |  Med dosis vía c/Xh día X de X">
            </div>
          </div>
        </div>
      </div>
      <!-- NM: Nutricional/Metabólico -->
      <div class="soap-section">
        <div class="soap-section-header">NM — Nutricional / Metabólico</div>
        <div class="soap-section-body">
          <div style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Dieta</div>
              <input type="text" id="soap-dieta" placeholder="Blanda hipograsa">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Kcal/kg</div>
              <input type="number" id="soap-kcalkg" placeholder="25" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Total Kcal</div>
              <input type="number" id="soap-kcal" placeholder="1500" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Peso (kg)</div>
              <input type="number" id="soap-peso" placeholder="60" style="text-align:center;">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Ingresos (cc)</div>
              <input type="number" id="soap-ing" placeholder="1200" oninput="updateSOAPBalance()" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Egresos (cc)</div>
              <input type="number" id="soap-egr" placeholder="950" oninput="updateSOAPBalance()" style="text-align:center;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Balance (cc)</div>
              <input type="text" id="soap-balance" class="soap-field-readonly" readonly placeholder="auto" style="text-align:center;">
            </div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Glucometrías capilares (mg/dL)</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
              <input type="number" id="soap-glu1" placeholder="1ª" style="text-align:center;">
              <input type="number" id="soap-glu2" placeholder="2ª" style="text-align:center;">
              <input type="number" id="soap-glu3" placeholder="3ª" style="text-align:center;">
            </div>
          </div>
        </div>
      </div>
    </div><!-- /soap-modal-body -->
    <div class="soap-modal-footer">
      <button onclick="closeSOAPModal()" style="background:white;border:1px solid var(--border);color:var(--text-muted);border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Cancelar</button>
      <button onclick="insertSOAPText()" style="background:#065F46;color:white;border:none;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Insertar en evolución
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verificar que el modal existe en el DOM pero está oculto**

Recarga la app. Abre DevTools → Console:

```javascript
document.getElementById('soap-modal-backdrop')
```

Expected: devuelve el elemento DOM (no `null`). La app debe verse igual que antes (backdrop oculto).

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add SOAP modal HTML structure"
```

---

## Task 5: JS functions del SOAP modal

**Files:**
- Modify: `public/index.html` (JS, justo antes de `checkStudiosAndInsertLabs` ~línea 1532)

- [ ] **Step 1: Localizar dónde insertar las funciones SOAP**

En `public/index.html`, localiza la función `checkStudiosAndInsertLabs` (~línea 1532). Inserta el siguiente bloque de funciones **justo antes** de `checkStudiosAndInsertLabs`:

```javascript
// ── SOAP Modal ────────────────────────────────────────
function openSOAPModal() {
  if (!activeId) { showToast('Selecciona un paciente primero', 'error'); return; }
  var existing = notes[activeId] && notes[activeId].evolucion ? notes[activeId].evolucion.trim() : '';
  if (existing) {
    var backdrop = document.createElement('div');
    backdrop.className = 'lab-conflict-backdrop';
    backdrop.id = 'soap-confirm-backdrop';
    backdrop.innerHTML =
      '<div class="lab-conflict-modal">' +
      '<h3>¿Reemplazar evolución?</h3>' +
      '<p>La evolución ya tiene contenido. ¿Reemplazarlo con la plantilla?</p>' +
      '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
      '<button onclick="document.getElementById(\'soap-confirm-backdrop\').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Cancelar</button>' +
      '<button onclick="document.getElementById(\'soap-confirm-backdrop\').remove();document.getElementById(\'soap-modal-backdrop\').classList.add(\'open\')" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Reemplazar</button>' +
      '</div></div>';
    document.body.appendChild(backdrop);
  } else {
    document.getElementById('soap-modal-backdrop').classList.add('open');
  }
}

function closeSOAPModal() {
  document.getElementById('soap-modal-backdrop').classList.remove('open');
  ['soap-s','soap-four','soap-esferas','soap-analgesia','soap-fr','soap-sat',
   'soap-tas','soap-tad','soap-fc','soap-antihta','soap-vasop','soap-temp','soap-abx',
   'soap-dieta','soap-kcalkg','soap-kcal','soap-peso','soap-ing','soap-egr',
   'soap-balance','soap-glu1','soap-glu2','soap-glu3'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var sel = document.getElementById('soap-soporte');
  if (sel) sel.selectedIndex = 0;
}

function updateSOAPBalance() {
  var ing = parseFloat(document.getElementById('soap-ing').value);
  var egr = parseFloat(document.getElementById('soap-egr').value);
  var bal = document.getElementById('soap-balance');
  if (!isNaN(ing) && !isNaN(egr)) {
    var diff = ing - egr;
    bal.value = (diff > 0 ? '+' : '') + diff;
  } else {
    bal.value = '';
  }
}

function buildSOAPText() {
  function g(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function val(v) { return v ? v.toUpperCase() : '___'; }
  function num(v) { return v !== '' ? v : '___'; }

  var soporteMap = {
    'Aire ambiente':    'AL AIRE AMBIENTE',
    'Puntillas nasales':'POR PUNTILLAS NASALES',
    'Alto flujo':       'POR ALTO FLUJO',
    'VM no invasiva':   'CON VENTILACIÓN MECÁNICA NO INVASIVA'
  };
  var soporte = soporteMap[g('soap-soporte')] || 'AL AIRE AMBIENTE';

  var ing = g('soap-ing');
  var egr = g('soap-egr');
  var balance = (ing && egr) ?
    (function(){ var d = parseFloat(ing) - parseFloat(egr); return (d > 0 ? '+' : '') + d; }()) :
    '___';

  var lines = [];
  var subj = g('soap-s');
  if (subj) { lines.push('S: ' + subj); lines.push(''); }

  lines.push('N: FOUR ' + num(g('soap-four')) + '/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ' + num(g('soap-esferas')) + ' ESFERAS, ALERTA || ANALGESIA CON ' + val(g('soap-analgesia')));
  lines.push('V: FR ' + num(g('soap-fr')) + ' RPM, SATO2 ' + num(g('soap-sat')) + '% ' + soporte + ' | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS');
  lines.push('HD: ESTABLE, TA ' + num(g('soap-tas')) + '/' + num(g('soap-tad')) + ' MMHG, FC ' + num(g('soap-fc')) + ' LPM || ANTIHIPERTENSIVOS: ' + val(g('soap-antihta') || 'NINGUNO') + ' || VASOPRESORES: ' + val(g('soap-vasop') || 'NINGUNO'));
  lines.push('HI: AFEBRIL, TEMPERATURA ' + num(g('soap-temp')) + ' °C || ANTIBIÓTICOS: ' + val(g('soap-abx') || 'NINGUNO'));
  lines.push('NM: DIETA ' + val(g('soap-dieta')) + ' CALCULADA A ' + num(g('soap-kcalkg')) + ' KCAL/KG (' + num(g('soap-kcal')) + ' KCAL) PARA PESO DE ' + num(g('soap-peso')) + ' KG || INGRESOS ' + num(ing) + ' CC, EGRESOS ' + num(egr) + ' CC, BALANCE ' + balance + ' CC || GLUCOMETRÍAS CAPILARES (' + num(g('soap-glu1')) + ', ' + num(g('soap-glu2')) + ', ' + num(g('soap-glu3')) + ' MG/DL) || RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE');

  return lines.join('\n');
}

function insertSOAPText() {
  var text = buildSOAPText();
  if (!notes[activeId]) notes[activeId] = {};
  notes[activeId].evolucion = text;
  saveState();
  var el = document.querySelector('#note-form textarea[oninput*="evolucion"]');
  if (el) el.value = text;
  closeSOAPModal();
  showToast('Plantilla insertada ✓', 'success');
}

```

- [ ] **Step 2: Verificar funciones en consola**

Recarga la app. En DevTools → Console:

```javascript
['openSOAPModal','closeSOAPModal','updateSOAPBalance','buildSOAPText','insertSOAPText']
  .map(function(f){ return f + ': ' + typeof window[f]; })
```

Expected: todas muestran `"function"`.

- [ ] **Step 3: Verificar buildSOAPText con campos vacíos**

En DevTools → Console (con un paciente activo seleccionado):

```javascript
openSOAPModal();
buildSOAPText();
```

Expected: string con `___` en cada campo vacío, por ejemplo:
```
N: FOUR ___/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ___ ESFERAS, ALERTA || ANALGESIA CON ___
V: FR ___ RPM, SATO2 ___% AL AIRE AMBIENTE | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS
...
```

Luego cierra el modal: `closeSOAPModal()`

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add SOAP modal JS functions (open/close/build/insert/balance)"
```

---

## Task 6: Botón "Plantilla SOAP" en card de Evolución

**Files:**
- Modify: `public/index.html` (JS string en `renderNoteForm`, ~línea 1777)

- [ ] **Step 1: Localizar el card de Evolución en renderNoteForm**

En `public/index.html`, localiza esta línea exacta (~línea 1777):

```javascript
    '<div class="card"><div class="card-header" style="background:#065f46;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evolución y Actualización del Cuadro Clínico</div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="N: [Neurológico]&#10;V: [Ventilatorio]&#10;HD: [Hemodinámico]&#10;HI: [Infeccioso]&#10;NM: [Nutricional/Metabólico]" oninput="updateNote(\'evolucion\',this.value)">' + esc(note.evolucion) + '</textarea></div></div></div>' +
```

- [ ] **Step 2: Reemplazar con el header que tiene botón y flex layout**

Reemplaza esa línea completa con:

```javascript
    '<div class="card"><div class="card-header" style="background:#065f46;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evolución y Actualización del Cuadro Clínico</span><button onclick="openSOAPModal()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.25)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.15)\'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>Plantilla SOAP</button></div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="N: [Neurológico]&#10;V: [Ventilatorio]&#10;HD: [Hemodinámico]&#10;HI: [Infeccioso]&#10;NM: [Nutricional/Metabólico]" oninput="updateNote(\'evolucion\',this.value)">' + esc(note.evolucion) + '</textarea></div></div></div>' +
```

- [ ] **Step 3: Verificar el botón visualmente**

Recarga la app. Selecciona un paciente. En el tab "Nota" verifica que el card verde de Evolución muestra el botón "Plantilla SOAP" en el header, alineado a la derecha.

- [ ] **Step 4: Verificar flujo completo — evolución vacía**

Con el campo de evolución vacío, presiona "Plantilla SOAP". Verifica:
- Se abre el modal directamente (sin confirmación)
- Todas las secciones (N, V, HD, HI, NM) son visibles y no se comprimen
- El modal scrollea si la ventana es pequeña

- [ ] **Step 5: Verificar flujo completo — evolución con texto**

Escribe algo en el textarea de evolución. Presiona "Plantilla SOAP". Verifica:
- Aparece el modal de confirmación "¿Reemplazar evolución?"
- "Cancelar" cierra la confirmación sin abrir el SOAP modal
- "Reemplazar" cierra la confirmación y abre el SOAP modal

- [ ] **Step 6: Verificar inserción completa**

En el SOAP modal, llena algunos campos (ej: FR=18, SatO2=97, TAS=120, TAD=80, FC=76, Ingresos=1200, Egresos=950). Verifica:
- El campo Balance muestra `+250` automáticamente
- Presiona "Insertar en evolución"
- El modal se cierra
- Toast: `"Plantilla insertada ✓"`
- El textarea de evolución muestra el texto generado en MAYÚSCULAS con `___` en los campos vacíos
- El balance es `+250 CC` en el texto

- [ ] **Step 7: Verificar persistencia**

Después de insertar, cambia de paciente y vuelve. El texto de evolución debe haberse guardado.

- [ ] **Step 8: Commit final**

```bash
git add public/index.html
git commit -m "feat: add Plantilla SOAP button to evolution card header

Completes v1.5.0 features: Copy Labs button + SOAP Evolution Template modal"
```

---

## Criterios de éxito (checklist final)

- [ ] Botón "Copiar" en header morado de Resultados, a la izquierda de "Enviar a nota"
- [ ] Copiar labs sin paciente activo funciona → toast correcto
- [ ] Copiar labs sin resultados parseados → toast de error
- [ ] Botón "Plantilla SOAP" en header verde de Evolución
- [ ] Evolución vacía: abre modal directamente
- [ ] Evolución con texto: confirmación → Reemplazar o Cancelar
- [ ] Balance se calcula automáticamente (ingresos − egresos, prefijo `+` si positivo)
- [ ] Campos vacíos generan `___` en el texto insertado
- [ ] Texto generado en MAYÚSCULAS (excepto subjetivo)
- [ ] Secciones del modal no se comprimen (flex-shrink:0)
- [ ] "Insertar en evolución" actualiza textarea y persiste con saveState()
