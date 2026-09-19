# Pendientes, Shortcuts y Línea blanca extendida — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Steps usan checkbox (`- [ ]`) syntax para tracking.

**Goal:** Implementar 3 features combinadas: lista de pendientes per-paciente, rework de shortcuts (CMD+3 → Medicamentos, CMD+P → Mi Perfil) y parsing extendido de BH (línea blanca y frotis manual solo en tendencias, porcentajes ocultos por default).

**Architecture:**
- Pendientes: storage namespace `rpc-todos` + inner tab dentro del Expediente + render seguro con DOM API.
- Shortcuts: solo cambia el `keydown` handler y el help text.
- BH extendida: `parseBH_` se refactoriza para devolver `{ visible, extras }`. Los `extras` se guardan como `set.bhExtras` y `buildParsedBySectionFromResLabs(resLabs, bhExtras)` los fusiona en `parsedBySection.BH` para que tendencias los lea sin modificar el texto pegable.

**Tech Stack:**
- HTML/CSS en `public/index.html`.
- JavaScript (ESM en el navegador / `node --test` para suite).
- `localStorage` para persistencia.
- Sin dependencias nuevas.

**Workflow de ramas:** Al final del plan se hace `merge main → beta/live-sync` para que la beta no quede atrás.

---

## Task 1: Registrar los nuevos archivos de test en `npm test`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Editar el script `test` de `package.json`**

Localizar el script `"test"` (línea ~5) y agregar dos nuevos archivos antes del `&&`:
- `public/js/storage.test.mjs`
- `public/js/labs-bh-extended.test.mjs`

Ejemplo (los nombres existentes pueden variar; mantén el orden y agrega los nuevos al final del bloque `node --test`):

```json
"test": "node --test public/js/update-helpers.test.mjs public/js/lab-history-auto-store-core.test.mjs public/js/med-receta-core.test.mjs public/js/labs-cultivo.test.mjs public/js/labs-citoquimico-liquidos.test.mjs public/js/labs-heces.test.mjs public/js/labs-frotis.test.mjs public/js/labs-coag.test.mjs public/js/labs-gases.test.mjs public/js/labs-pct.test.mjs public/js/mode-features.test.mjs public/js/age-calc.test.mjs public/js/listado-problemas-core.test.mjs public/js/patient-validation.test.mjs public/js/tour-targets.test.mjs public/js/quick-output.test.mjs public/js/output-dir-fallback.test.mjs public/js/storage.test.mjs public/js/labs-bh-extended.test.mjs && python3 -m unittest tests/test_generate_listado.py"
```

- [ ] **Step 2: Verificar que `npm test` referencia los nuevos archivos (aunque aún no existan)**

Run: `npm test 2>&1 | head -20`
Expected: fallará porque los dos archivos nuevos no existen aún. Eso es esperado y se arregla en las siguientes tareas. Node loggea: `Could not find '*.test.mjs'`.

- [ ] **Step 3: Crear placeholders mínimos para que `npm test` siga verde mientras se implementa el resto**

Create: `public/js/storage.test.mjs`

```javascript
import { describe, it } from 'node:test';

describe('storage (placeholder)', () => {
  it.todo('see Task 2 for actual tests');
});
```

Create: `public/js/labs-bh-extended.test.mjs`

```javascript
import { describe, it } from 'node:test';

describe('labs BH extended (placeholder)', () => {
  it.todo('see Task 7 for actual tests');
});
```

- [ ] **Step 4: Correr tests para confirmar verde con TODOs**

Run: `npm test 2>&1 | tail -20`
Expected: PASS con `# todo 2` (los placeholders).

- [ ] **Step 5: Commit**

```bash
git add package.json public/js/storage.test.mjs public/js/labs-bh-extended.test.mjs
git commit -m "chore: register new test files for upcoming features"
```

---

## Task 2: Storage helpers para pendientes (TDD)

**Files:**
- Modify: `public/js/storage.js`
- Modify: `public/js/storage.test.mjs`

- [ ] **Step 1: Escribir los tests fallidos en `public/js/storage.test.mjs`**

Reemplazar el contenido placeholder por:

```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// storage.js reads localStorage lazily inside its methods, so reasignar
// global.localStorage en beforeEach es suficiente; no requiere reimport.
let store = {};
const mock = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};
global.localStorage = mock;
global.window = { localStorage: mock };

const { storage } = await import('./storage.js');

describe('storage todos', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  describe('getTodos', () => {
    it('returns [] when no todos stored', () => {
      assert.deepStrictEqual(storage.getTodos('p1'), []);
    });

    it('returns [] for invalid JSON', () => {
      store['rpc-todos'] = '{not json';
      assert.deepStrictEqual(storage.getTodos('p1'), []);
    });

    it('returns the todos for the patient', () => {
      const todos = [{ id: 'a', text: 't', completed: false, priority: 'alta', createdAt: '2026-05-13T10:00:00.000Z' }];
      store['rpc-todos'] = JSON.stringify({ p1: todos });
      assert.deepStrictEqual(storage.getTodos('p1'), todos);
    });

    it('normalizes missing priority to "normal"', () => {
      store['rpc-todos'] = JSON.stringify({ p1: [{ id: 'a', text: 't', completed: false }] });
      const result = storage.getTodos('p1');
      assert.strictEqual(result[0].priority, 'normal');
    });

    it('coerces completed to boolean', () => {
      store['rpc-todos'] = JSON.stringify({ p1: [{ id: 'a', text: 't', completed: 1, priority: 'baja' }] });
      assert.strictEqual(storage.getTodos('p1')[0].completed, true);
    });
  });

  describe('saveTodos', () => {
    it('saves todos for the patient', () => {
      const todos = [{ id: '1', text: 'x', completed: false, priority: 'normal', createdAt: '' }];
      storage.saveTodos('p1', todos);
      assert.deepStrictEqual(JSON.parse(store['rpc-todos']).p1, todos);
    });

    it('preserves entries for other patients', () => {
      store['rpc-todos'] = JSON.stringify({ p2: [{ id: 'x', text: 'y', completed: true, priority: 'normal', createdAt: '' }] });
      storage.saveTodos('p1', [{ id: '1', text: 'a', completed: false, priority: 'alta', createdAt: '' }]);
      const obj = JSON.parse(store['rpc-todos']);
      assert.strictEqual(obj.p1.length, 1);
      assert.strictEqual(obj.p2.length, 1);
    });

    it('does NOT write for demo- patients', () => {
      storage.saveTodos('demo-foo', [{ id: '1', text: 'a', completed: false, priority: 'normal', createdAt: '' }]);
      assert.strictEqual(store['rpc-todos'], undefined);
    });
  });
});
```

- [ ] **Step 2: Correr tests y verificar que fallan**

Run: `node --test public/js/storage.test.mjs 2>&1 | tail -15`
Expected: FAIL — `storage.getTodos is not a function` (o similar).

- [ ] **Step 3: Implementar `getTodos` y `saveTodos` en `public/js/storage.js`**

Localizar el bloque `export const storage = {` y agregar al final del objeto (justo antes de `saveAll(...)` o en cualquier posición lógica, por ejemplo después de `saveMedRecetaByPatient`):

```javascript
  /**
   * Get to-do list for a patient. Normaliza forma de cada todo.
   * @param {string} patientId
   * @returns {Array<{id:string,text:string,completed:boolean,priority:string,createdAt:string}>}
   */
  getTodos(patientId) {
    const map = safeParseObject(localStorage.getItem('rpc-todos'));
    const raw = Array.isArray(map[patientId]) ? map[patientId] : [];
    return raw.map(function (t) {
      return {
        id: String(t && t.id != null ? t.id : ''),
        text: String(t && t.text != null ? t.text : ''),
        completed: !!(t && t.completed),
        priority: (t && (t.priority === 'alta' || t.priority === 'baja' || t.priority === 'normal')) ? t.priority : 'normal',
        createdAt: String(t && t.createdAt != null ? t.createdAt : '')
      };
    });
  },

  /**
   * Save to-do list for a patient. Skips demo- patients.
   * @param {string} patientId
   * @param {Array} todos
   */
  saveTodos(patientId, todos) {
    if (typeof patientId !== 'string') return;
    if (patientId.indexOf('demo-') === 0) return;
    const map = safeParseObject(localStorage.getItem('rpc-todos')) || {};
    map[patientId] = Array.isArray(todos) ? todos : [];
    localStorage.setItem('rpc-todos', JSON.stringify(map));
  },
```

- [ ] **Step 4: Correr tests y verificar que pasan**

Run: `node --test public/js/storage.test.mjs 2>&1 | tail -10`
Expected: PASS (todos los tests del describe `storage todos`).

- [ ] **Step 5: Correr `npm test` completo**

Run: `npm test 2>&1 | tail -10`
Expected: PASS, sin regresiones.

- [ ] **Step 6: Commit**

```bash
git add public/js/storage.js public/js/storage.test.mjs
git commit -m "feat(storage): add getTodos and saveTodos with priority normalization"
```

---

## Task 3: HTML para inner tab "Pendientes" + CSS de prioridad

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Agregar el botón del inner tab**

Localizar `.inner-tab-bar` (línea ~2332). Agregar este botón **después** del botón `itab-listado` (último botón existente):

```html
          <button class="inner-tab" id="itab-todo" onclick="switchInnerTab('todo')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3 8-8"/><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></svg>
            Pendientes
          </button>
```

- [ ] **Step 2: Agregar el contenedor del tab**

Localizar `.patient-view` (línea ~2360) y agregar este div **después** del último `tab-content` existente (`itab-content-listado`):

```html
        <div id="itab-content-todo" class="tab-content"><div id="todo-form" style="display:flex;flex-direction:column;gap:16px;"></div></div>
```

- [ ] **Step 3: Agregar CSS para chips de prioridad**

Localizar el bloque de CSS (algún `<style>` ya existente, o el bloque con `.inner-tab-bar`). Agregar:

```css
  .todo-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-bottom: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
  }
  .todo-row.completed .todo-text { text-decoration: line-through; color: var(--text-muted); }
  .todo-prio {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto;
  }
  .todo-prio.alta    { background: var(--danger, #e53935); }
  .todo-prio.normal  { background: var(--text-muted); }
  .todo-prio.baja    { background: color-mix(in oklab, var(--text-muted) 50%, transparent); }
  .todo-text { flex: 1; word-break: break-word; }
  .todo-add-row { display: flex; gap: 8px; align-items: center; }
  .todo-add-row input[type="text"] { flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
  .todo-add-row select { padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
  .todo-add-row button { padding: 8px 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--accent); color: white; cursor: pointer; font-weight: 600; }
  .todo-del { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1; padding: 0 6px; }
  .todo-empty { color: var(--text-muted); padding: 16px; text-align: center; }
```

- [ ] **Step 4: Verificar sintaxis HTML (parse correcto)**

Run: `node -e "require('fs').readFileSync('public/index.html','utf8'); console.log('html-readable');"`
Expected: `html-readable`.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat(ui): add Pendientes inner tab and priority chip styles"
```

---

## Task 4: Render y handlers de Pendientes (`app.js`)

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Agregar `renderTodoForm` y handlers**

Localizar una zona estable (por ejemplo después de `renderDatosForm` o cerca de `renderIndicaForm`; típicamente líneas 6900-7100). Insertar el siguiente bloque:

```javascript
function _todoCompareForSort(a, b) {
  if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
  var prioOrder = { alta: 0, normal: 1, baja: 2 };
  var pa = prioOrder[a.priority] != null ? prioOrder[a.priority] : 1;
  var pb = prioOrder[b.priority] != null ? prioOrder[b.priority] : 1;
  if (pa !== pb) return pa - pb;
  if (a.createdAt && b.createdAt) return String(b.createdAt).localeCompare(String(a.createdAt));
  return 0;
}

function renderTodoForm() {
  var container = document.getElementById('todo-form');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  if (!activeId) {
    var empty = document.createElement('p');
    empty.className = 'todo-empty';
    empty.textContent = 'Selecciona un paciente para ver sus pendientes.';
    container.appendChild(empty);
    return;
  }

  var addRow = document.createElement('div');
  addRow.className = 'todo-add-row';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'todo-input';
  input.placeholder = 'Nuevo pendiente...';
  var sel = document.createElement('select');
  sel.id = 'todo-priority';
  [
    { v: 'alta',   t: 'Alta'   },
    { v: 'normal', t: 'Normal' },
    { v: 'baja',   t: 'Baja'   }
  ].forEach(function (o) {
    var opt = document.createElement('option');
    opt.value = o.v;
    opt.textContent = o.t;
    if (o.v === 'normal') opt.selected = true;
    sel.appendChild(opt);
  });
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = 'Agregar';
  addBtn.addEventListener('click', addTodo);
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTodo();
  });
  addRow.appendChild(input);
  addRow.appendChild(sel);
  addRow.appendChild(addBtn);
  container.appendChild(addRow);

  var todos = storage.getTodos(activeId).slice().sort(_todoCompareForSort);
  if (!todos.length) {
    var none = document.createElement('p');
    none.className = 'todo-empty';
    none.textContent = 'Sin pendientes. Agrega el primero arriba.';
    container.appendChild(none);
    return;
  }

  var list = document.createElement('div');
  todos.forEach(function (t) {
    var row = document.createElement('div');
    row.className = 'todo-row' + (t.completed ? ' completed' : '');

    var chip = document.createElement('span');
    chip.className = 'todo-prio ' + (t.priority || 'normal');
    chip.title = 'Prioridad: ' + (t.priority || 'normal');
    row.appendChild(chip);

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!t.completed;
    chk.addEventListener('change', function () { toggleTodo(t.id); });
    row.appendChild(chk);

    var txt = document.createElement('span');
    txt.className = 'todo-text';
    txt.textContent = t.text;
    row.appendChild(txt);

    var prioSel = document.createElement('select');
    [
      { v: 'alta',   t: 'A' },
      { v: 'normal', t: 'N' },
      { v: 'baja',   t: 'B' }
    ].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.t;
      if (o.v === t.priority) opt.selected = true;
      prioSel.appendChild(opt);
    });
    prioSel.title = 'Cambiar prioridad';
    prioSel.addEventListener('change', function () { setTodoPriority(t.id, prioSel.value); });
    row.appendChild(prioSel);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-del';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', function () { deleteTodo(t.id); });
    row.appendChild(del);

    list.appendChild(row);
  });
  container.appendChild(list);
}

function addTodo() {
  if (!activeId) return;
  var input = document.getElementById('todo-input');
  var sel   = document.getElementById('todo-priority');
  if (!input) return;
  var text = String(input.value || '').trim();
  if (!text) return;
  var priority = sel && (sel.value === 'alta' || sel.value === 'baja') ? sel.value : 'normal';
  var todos = storage.getTodos(activeId);
  todos.push({
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: text,
    completed: false,
    priority: priority,
    createdAt: new Date().toISOString()
  });
  storage.saveTodos(activeId, todos);
  input.value = '';
  renderTodoForm();
}

function toggleTodo(id) {
  if (!activeId) return;
  var todos = storage.getTodos(activeId);
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.completed = !found.completed;
  storage.saveTodos(activeId, todos);
  renderTodoForm();
}

function deleteTodo(id) {
  if (!activeId) return;
  var todos = storage.getTodos(activeId).filter(function (t) { return t.id !== id; });
  storage.saveTodos(activeId, todos);
  renderTodoForm();
}

function setTodoPriority(id, priority) {
  if (!activeId) return;
  var valid = (priority === 'alta' || priority === 'baja' || priority === 'normal') ? priority : 'normal';
  var todos = storage.getTodos(activeId);
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.priority = valid;
  storage.saveTodos(activeId, todos);
  renderTodoForm();
}
```

- [ ] **Step 2: Exponer las funciones a `window`**

Localizar el bloque cercano al final de `app.js` donde se asignan funciones a `window` (busca por `window.switchInnerTab = switchInnerTab` o la línea con `switchInnerTab,` en el `Object.assign`). Agregar:

```javascript
window.renderTodoForm = renderTodoForm;
window.addTodo = addTodo;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.setTodoPriority = setTodoPriority;
```

(Si el patrón es `Object.assign(window, { ... })`, agrégalas dentro del objeto.)

- [ ] **Step 3: Verificar sintaxis**

Run: `node --check public/js/app.js && echo ok`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add public/js/app.js
git commit -m "feat(app): add Pendientes render and handlers (XSS-safe DOM API)"
```

---

## Task 5: Integrar tab "Pendientes" con `switchInnerTab`, `renderInnerTabs` y eventos del paciente

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Actualizar `switchInnerTab` (línea ~1507)**

Encontrar la función `switchInnerTab(tab)`. Agregar las líneas marcadas con `// NUEVO`:

```javascript
function switchInnerTab(tab) {
  activeInner = tab;
  document.getElementById('itab-datos').classList.toggle('active', tab === 'datos');
  document.getElementById('itab-notas').classList.toggle('active', tab === 'notas');
  document.getElementById('itab-indica').classList.toggle('active', tab === 'indica');
  document.getElementById('itab-tend').classList.toggle('active', tab === 'tend');
  document.getElementById('itab-cult').classList.toggle('active', tab === 'cult');
  document.getElementById('itab-listado').classList.toggle('active', tab === 'listado');
  document.getElementById('itab-todo').classList.toggle('active', tab === 'todo');           // NUEVO

  document.getElementById('itab-content-datos').style.display = tab === 'datos' ? '' : 'none';
  document.getElementById('itab-content-notas').style.display = tab === 'notas' ? '' : 'none';
  document.getElementById('itab-content-indica').style.display = tab === 'indica' ? '' : 'none';
  document.getElementById('itab-content-tend').style.display = tab === 'tend' ? '' : 'none';
  document.getElementById('itab-content-cult').style.display = tab === 'cult' ? '' : 'none';
  document.getElementById('itab-content-listado').style.display = tab === 'listado' ? '' : 'none';
  document.getElementById('itab-content-todo').style.display = tab === 'todo' ? '' : 'none';  // NUEVO

  if (tab === 'datos') renderPatientDataPane();
  if (tab === 'notas') renderNotaForm();
  if (tab === 'indica') renderIndicaForm();
  if (tab === 'tend') renderTendencias();
  if (tab === 'cult') renderCultivosTable();
  if (tab === 'listado') renderListadoForm();
  if (tab === 'todo') renderTodoForm();                                                       // NUEVO
}
```

- [ ] **Step 2: Actualizar `renderInnerTabs` (línea ~1537) para visibilidad y orden CSS**

Reemplazar la función completa por:

```javascript
function renderInnerTabs() {
  var sala = isModeSala(settings);
  function show(id, visible) {
    var el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  }
  function setOrder(id, order) {
    var el = document.getElementById(id);
    if (el) el.style.order = String(order);
  }
  show('itab-datos', sala);
  show('itab-notas', !sala);
  show('itab-indica', !sala);
  show('itab-tend', true);
  show('itab-cult', true);
  show('itab-listado', sala);
  show('itab-todo', true);

  if (sala) {
    setOrder('itab-datos', 1);
    setOrder('itab-todo', 2);
    setOrder('itab-tend', 3);
    setOrder('itab-cult', 4);
    setOrder('itab-listado', 5);
    setOrder('itab-notas', 99);
    setOrder('itab-indica', 99);
  } else {
    setOrder('itab-todo', 1);
    setOrder('itab-notas', 2);
    setOrder('itab-indica', 3);
    setOrder('itab-tend', 4);
    setOrder('itab-cult', 5);
    setOrder('itab-datos', 99);
    setOrder('itab-listado', 99);
  }

  renderEstadoActualBar();
}
```

- [ ] **Step 3: Re-renderizar Pendientes al cambiar de paciente activo**

Localizar el bloque cercano a línea 2084 (busca `if (activeInner === 'tend' && patientChanged)` o similar dentro de la función que aplica cambios de paciente activo, p.ej. `applyActivePatientUiState` o `setActivePatient`). Agregar:

```javascript
if (activeInner === 'todo' && patientChanged) {
  renderTodoForm();
}
```

(Si no existe esa función exacta, busca la función que llama `renderTendencias`/`renderCultivosTable` después de cambiar `activeId`. Inserta el mismo patrón.)

- [ ] **Step 4: Purgar `rpc-todos` al borrar un paciente**

Localizar la función que borra pacientes (busca `function deletePatient` o el handler del botón "Eliminar paciente"). Después de eliminar de `patients[]` y antes/después de los `localStorage.setItem` de otras llaves (notes, indicaciones, etc.), agregar:

```javascript
try {
  var rawTodosMap = localStorage.getItem('rpc-todos');
  if (rawTodosMap) {
    var todosMap = JSON.parse(rawTodosMap);
    if (todosMap && typeof todosMap === 'object' && todosMap[deletedPatientId]) {
      delete todosMap[deletedPatientId];
      localStorage.setItem('rpc-todos', JSON.stringify(todosMap));
    }
  }
} catch (_e) { /* ignore */ }
```

Reemplaza `deletedPatientId` por el identificador real disponible en ese scope (probablemente `id` o `patientId`).

- [ ] **Step 5: Verificar sintaxis**

Run: `node --check public/js/app.js && echo ok`
Expected: `ok`.

- [ ] **Step 6: Smoke manual**

Run: `npm start`
Verificar:
- Sala mode: pestaña Pendientes aparece como **2ª** después de Datos.
- Interconsulta mode: pestaña Pendientes aparece como **1ª**.
- Click en Pendientes: muestra input + select de prioridad + lista.
- Agregar varios con distintas prioridades: aparecen ordenados (alta primero, completados al final).
- Cambiar paciente: la lista cambia.
- Eliminar paciente: al volver no aparecen sus pendientes (ni en localStorage `rpc-todos`).

- [ ] **Step 7: Commit**

```bash
git add public/js/app.js
git commit -m "feat(app): integrate Pendientes tab into switchInnerTab and lifecycle"
```

---

## Task 6: Rework de shortcuts (CMD+3 → Medicamentos, CMD+P → Mi Perfil)

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Actualizar handler de teclado**

Localizar el listener de keydown que maneja `metaKey || ctrlKey` con `e.key === '1' || …` (alrededor de línea ~6730). Reemplazar ese bloque por:

```javascript
  var mod = e.metaKey || e.ctrlKey;
  if (mod) {
    var key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3' || key === '4' || key === 'p') {
      e.preventDefault();
      if (key === '1') switchAppTab('lab');
      if (key === '2') switchAppTab('nota');
      if (key === '3') switchAppTab('med');
      if (key === '4') {
        var dd = document.getElementById('settings-dropdown');
        if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
      }
      if (key === 'p') toggleProfileSection();
    }
  }
```

- [ ] **Step 2: Actualizar el help text de shortcuts**

Localizar la zona donde se construye la lista de shortcuts (busca el string `'<li><strong>Ctrl/⌘ + 1</strong>'`, línea ~3694). Reemplazar las líneas por:

```javascript
      '<li><strong>Ctrl/⌘ + 1</strong> — Laboratorio</li>' +
      '<li><strong>Ctrl/⌘ + 2</strong> — Expediente</li>' +
      '<li><strong>Ctrl/⌘ + 3</strong> — Medicamentos</li>' +
      '<li><strong>Ctrl/⌘ + 4</strong> — Ajustes</li>' +
      '<li><strong>Ctrl/⌘ + P</strong> — Abrir/cerrar Mi Perfil</li>' +
```

(Conserva las líneas circundantes como estaban; solo cambia este bloque de 4 → 5 líneas. La línea Esc subyacente queda igual.)

- [ ] **Step 3: Verificar sintaxis**

Run: `node --check public/js/app.js && echo ok`
Expected: `ok`.

- [ ] **Step 4: Smoke manual**

Run: `npm start`
Verificar con teclado:
- `CMD+1` → tab Laboratorio
- `CMD+2` → tab Expediente
- `CMD+3` → tab Medicamentos (antes era Mi Perfil)
- `CMD+4` → abre dropdown de Ajustes
- `CMD+P` → abre Mi Perfil (segundo `CMD+P` lo cierra)
- Centro de ayuda muestra las nuevas etiquetas.

- [ ] **Step 5: Commit**

```bash
git add public/js/app.js
git commit -m "feat(app): rework shortcuts (CMD+3 Medicamentos, CMD+P Mi Perfil)"
```

---

## Task 7: Tests fallidos para parser BH extendido (TDD)

**Files:**
- Modify: `public/js/labs-bh-extended.test.mjs`

- [ ] **Step 1: Reemplazar el placeholder por tests reales**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBH_ } from './labs.js';

const BH_REAL = [
  'HEMATOLOGIA',
  'BIOMETRIA HEMATICA COMPLETA',
  'Estudio Resultado Unidades Valor de Referencia',
  'RBC B 3.11 M/uL 4.04 - 6.13',
  'HGB B 9.39 g/dL 12.20 - 18.10',
  'HCT B 29.1 % 37.7 - 53.7',
  'MCV * 93 fL 80 - 97',
  'MCH * 30.2 pg 27.0 - 31.2',
  'MCHC * 32.3 g/dL 29.9 - 34.2',
  'RDW A 16.8 % 11.6 - 14.8',
  'WBC A 23.10 K/uL 4.00 - 11.00',
  'NEU A 21.70 K/uL 2.00 - 6.90',
  'NEU% A 93.8 % 37.0 - 80.0',
  'LYM B 0.50 K/uL 0.60 - 3.40',
  'LYM% B 2.2 % 10.0 - 50.0',
  'MONO * 0.847 K/uL 0.000 - 0.900',
  'MONO% * 3.67 % 0.00 - 12.00',
  'EOS * 0.000 K/uL 0.000 - 0.700',
  'EOS% * 0.00 % 0.00 - 7.00',
  'BASO * 0.072 K/uL 0.000 - 0.200',
  'BASO% * 0.31 % 0.00 - 2.50',
  'PLT * 156.00 K/uL 142.00 - 424.00',
  'MPV * 7.7 fL 7.4 - 10.4'
].join('\n');

describe('parseBH_ extended', () => {
  it('returns an object with `visible` and `extras` (refactored shape)', () => {
    const r = parseBH_(BH_REAL);
    assert.ok(r && typeof r === 'object', 'parseBH_ should return an object');
    assert.strictEqual(typeof r.visible, 'string');
    assert.ok(r.extras && typeof r.extras === 'object');
  });

  it('visible text only contains BH_TEXT_FIELDS (no white-cell absolutes nor percentages)', () => {
    const { visible } = parseBH_(BH_REAL);
    // Must include red/headline-white/plt:
    assert.match(visible, /\bHb\b/);
    assert.match(visible, /\bHto\b/);
    assert.match(visible, /\bVCM\b/);
    assert.match(visible, /\bHCM\b/);
    assert.match(visible, /\bCHCM\b/);
    assert.match(visible, /\bRDW\b/);
    assert.match(visible, /\bLeu\b/);
    assert.match(visible, /\bRBC\b/);
    assert.match(visible, /\bPlt\b/);
    assert.match(visible, /\bMPV\b/);
    // Must NOT include white-cell absolutes or any percentage:
    assert.doesNotMatch(visible, /\bNeu\b/);
    assert.doesNotMatch(visible, /\bLin\b/);
    assert.doesNotMatch(visible, /\bMono\b/);
    assert.doesNotMatch(visible, /\bEos\b/);
    assert.doesNotMatch(visible, /\bBaso\b/);
    assert.doesNotMatch(visible, /Pct\b|%/);
  });

  it('extras contains all white-cell absolutes and percentages', () => {
    const { extras } = parseBH_(BH_REAL);
    assert.strictEqual(extras.Neu,  '21.70');
    assert.strictEqual(extras.Lin,  '0.50');
    assert.strictEqual(extras.Mono, '0.847');
    assert.strictEqual(extras.Eos,  '0.000');
    assert.strictEqual(extras.Baso, '0.072');
    assert.strictEqual(extras.NeuPct,  '93.8');
    assert.strictEqual(extras.LinPct,  '2.2');
    assert.strictEqual(extras.MonoPct, '3.67');
    assert.strictEqual(extras.EosPct,  '0.00');
    assert.strictEqual(extras.BasoPct, '0.31');
  });

  it('distinguishes NEU from NEU% (no key collision)', () => {
    const { extras } = parseBH_(BH_REAL);
    assert.notStrictEqual(extras.Neu, extras.NeuPct);
  });

  it('parses MCHC, RDW, MPV into visible text correctly', () => {
    const { visible } = parseBH_(BH_REAL);
    assert.match(visible, /CHCM\s+32\.3/);
    assert.match(visible, /RDW\s+16\.8/);
    assert.match(visible, /MPV\s+7\.7/);
  });

  it('manual frotis fields (Bandas, Mielo, ...) end up in extras when present', () => {
    const withFrotis = BH_REAL + '\n\nFROTIS DE SANGRE PERIFERICA\nBANDAS 4 %\nMIELOCITOS 1 %\nMETAMIELOCITOS 0 %\nPROMIELOCITOS 0 %\nBLASTOS 0 %';
    const { extras } = parseBH_(withFrotis);
    assert.strictEqual(extras.Bandas, '4');
    assert.strictEqual(extras.Mielo, '1');
    assert.strictEqual(extras.Metamielo, '0');
    assert.strictEqual(extras.Promielo, '0');
    assert.strictEqual(extras.Blastos, '0');
  });

  it('returns empty visible (`""`) when no BH or coag data present', () => {
    const r = parseBH_('NO HAY BH AQUI');
    assert.strictEqual(r.visible, '');
    assert.deepStrictEqual(r.extras, {});
  });
});
```

- [ ] **Step 2: Correr el test, debe FALLAR**

Run: `node --test public/js/labs-bh-extended.test.mjs 2>&1 | tail -20`
Expected: FAIL — la mayoría porque `parseBH_` actual retorna un string, no `{ visible, extras }`.

- [ ] **Step 3: Commit (tests fallidos)**

```bash
git add public/js/labs-bh-extended.test.mjs
git commit -m "test(labs): add failing tests for extended BH parser"
```

---

## Task 8: Refactor de `parseBH_` para devolver `{ visible, extras }`

**Files:**
- Modify: `public/js/labs.js`

- [ ] **Step 1: Reemplazar `parseBH_` por la versión extendida**

Localizar `export function parseBH_(tNorm) {` (línea ~99) y reemplazar TODO el cuerpo de la función por:

```javascript
export function parseBH_(tNorm) {
  // Helper: extraer un número simple para una etiqueta tipo "NEU%" donde el
  // extractor con rango no funciona (no hay min/max). Toma el primer número
  // que aparece después de la etiqueta literal.
  function extraerSimple(labels, texto) {
    if (!texto) return '';
    for (var li = 0; li < labels.length; li++) {
      var lbl = labels[li];
      var idx = -1;
      var up = String(texto).toUpperCase();
      var lu = lbl.toUpperCase();
      var from = 0;
      while (true) {
        var p = up.indexOf(lu, from);
        if (p === -1) break;
        // Asegura match exacto del token (no NEU% cuando buscamos NEU)
        var after = up.charAt(p + lu.length);
        var before = up.charAt(p - 1) || ' ';
        var isWordBoundaryBefore = !/[A-Z0-9_]/.test(before);
        var isExactBoundary = lu.charAt(lu.length - 1) === '%' || !/[A-Z0-9]/.test(after);
        if (isWordBoundaryBefore && isExactBoundary) { idx = p + lu.length; break; }
        from = p + lu.length;
      }
      if (idx === -1) continue;
      var sub = texto.substring(idx, idx + 80);
      var m = sub.match(/(-?\d+[.,]?\d*)/);
      if (m) return m[1].replace(',', '.');
    }
    return '';
  }

  // Conserva el comportamiento previo (ranged extraction) para los campos clásicos:
  var hbData   = extraerConRango(['HGB','HEMOGLOBINA TOTAL','HEMOGLOBINA'], tNorm);
  var htoData  = extraerConRango(['HCT ','HEMATOCRITO'], tNorm);
  var vcmData  = extraerConRango(['MCV ','VCM '], tNorm);
  var hcmData  = extraerConRango(['MCH ','HCM '], tNorm);
  var leuData  = extraerConRango(['WBC '], tNorm);
  var neuData  = extraerConRango(['NEU '], tNorm);
  var eosData  = extraerConRango(['EOS '], tNorm);
  var pltData  = extraerConRango(['PLT '], tNorm);
  var retData  = extraerConRango(['RETICULOCITOS'], tNorm);
  var tpData   = extraerConRango(['TIEMPO DE PROTROMBINA'], tNorm);
  var ttpData  = extraerConRango(['TIEMPO DE TROMBOPLASTINA'], tNorm);
  var inrData  = extraerConRango(['INR ', 'INR'], tNorm);
  // Nuevos (rojos / plaq / VPM):
  var rbcData  = extraerConRango(['RBC ', 'ERITROCITOS', 'HEMATIES'], tNorm);
  var chcmData = extraerConRango(['MCHC', 'CHCM'], tNorm);
  var rdwData  = extraerConRango(['RDW '], tNorm);
  var mpvData  = extraerConRango(['MPV ', 'VPM '], tNorm);

  // Marcado con rangos (visible)
  var Hb   = fmt(marcarSegunRango(hbData.valor,   hbData.min,   hbData.max));
  var Hto  = fmt(marcarSegunRango(htoData.valor,  htoData.min,  htoData.max));
  var VCM  = fmt(marcarSegunRango(vcmData.valor,  vcmData.min,  vcmData.max));
  var HCM  = fmt(marcarSegunRango(hcmData.valor,  hcmData.min,  hcmData.max));
  var CHCM = fmt(marcarSegunRango(chcmData.valor, chcmData.min, chcmData.max));
  var RDW  = fmt(marcarSegunRango(rdwData.valor,  rdwData.min,  rdwData.max));
  var Leu  = fmt(marcarSegunRango(leuData.valor,  leuData.min,  leuData.max));
  var RBC  = fmt(marcarSegunRango(rbcData.valor,  rbcData.min,  rbcData.max));
  var Plt  = fmt(marcarSegunRango(pltData.valor,  pltData.min,  pltData.max));
  var MPV  = fmt(marcarSegunRango(mpvData.valor,  mpvData.min,  mpvData.max));
  var Ret  = fmt(marcarSegunRango(retData.valor,  retData.min,  retData.max));
  var TP   = fmt(marcarSegunRango(tpData.valor,   tpData.min,   tpData.max));
  var TTP  = fmt(marcarSegunRango(ttpData.valor,  ttpData.min,  ttpData.max));
  var INR  = fmt(marcarSegunRango(inrData.valor,  inrData.min,  inrData.max));

  // EXTRAS: valores crudos (string), sin marcadores de rango.
  var extras = {};
  function pushExtra(key, value) {
    if (value && value !== '---' && value !== '') extras[key] = String(value);
  }
  pushExtra('Neu',  neuData.valor);
  pushExtra('Eos',  eosData.valor);
  // Linfocitos / Monocitos / Basófilos absolutos (nuevos):
  var linData  = extraerConRango(['LYM ', 'LINFOCITOS'], tNorm);
  var monoData = extraerConRango(['MONO '], tNorm);
  var basoData = extraerConRango(['BASO '], tNorm);
  pushExtra('Lin',  linData.valor);
  pushExtra('Mono', monoData.valor);
  pushExtra('Baso', basoData.valor);
  // Porcentajes (parseados pero ocultos):
  pushExtra('NeuPct',  extraerSimple(['NEU%',  'NEUTROFILOS%'],  tNorm));
  pushExtra('LinPct',  extraerSimple(['LYM%',  'LINFOCITOS%'],   tNorm));
  pushExtra('MonoPct', extraerSimple(['MONO%', 'MONOCITOS%'],    tNorm));
  pushExtra('EosPct',  extraerSimple(['EOS%',  'EOSINOFILOS%'],  tNorm));
  pushExtra('BasoPct', extraerSimple(['BASO%', 'BASOFILOS%'],    tNorm));
  // Frotis manual:
  pushExtra('Bandas',    extraerSimple(['BANDAS', 'CAYADOS'], tNorm));
  pushExtra('Mielo',     extraerSimple(['MIELOCITOS'], tNorm));
  pushExtra('Metamielo', extraerSimple(['METAMIELOCITOS'], tNorm));
  pushExtra('Promielo',  extraerSimple(['PROMIELOCITOS'], tNorm));
  pushExtra('Blastos',   extraerSimple(['BLASTOS'], tNorm));
  pushExtra('Atipicos',  extraerSimple(['LINFOCITOS ATIPICOS', 'VARIANTES', 'ATIPICOS'], tNorm));

  // Construir texto visible (limitado a BH_TEXT_FIELDS)
  var hasVisible = [RBC, Hb, Hto, VCM, HCM, CHCM, RDW, Leu, Plt, MPV, Ret].some(function (v) {
    return v !== '---';
  });
  var hasCoag = [TP, TTP, INR].some(function (v) { return v !== '---'; });
  if (!hasVisible && !hasCoag && Object.keys(extras).length === 0) {
    return { visible: '', extras: {} };
  }

  var p = ['BH'];
  if (RBC  !== '---') p.push('RBC', RBC);
  if (Hb   !== '---') p.push('Hb', Hb);
  if (Hto  !== '---') p.push('Hto', Hto);
  if (VCM  !== '---') p.push('VCM', VCM);
  if (HCM  !== '---') p.push('HCM', HCM);
  if (CHCM !== '---') p.push('CHCM', CHCM);
  if (RDW  !== '---') p.push('RDW', RDW);
  if (Leu  !== '---') p.push('Leu', Leu);
  if (Plt  !== '---') p.push('Plt', Plt);
  if (MPV  !== '---') p.push('MPV', MPV);
  if (Ret  !== '---') p.push('Ret', Ret);
  var coag = [];
  if (TP  !== '---') coag.push('TP',  TP);
  if (TTP !== '---') coag.push('TTP', TTP);
  if (INR !== '---') coag.push('INR', INR);
  if (coag.length) { p.push('-'); p = p.concat(coag); }
  var visible = (p.length > 1) ? (p[0] + '\t' + p.slice(1).join(' ')) : '';
  return { visible: visible, extras: extras };
}
```

- [ ] **Step 2: Correr los tests del Task 7 y verificar que pasan**

Run: `node --test public/js/labs-bh-extended.test.mjs 2>&1 | tail -20`
Expected: PASS (todos los tests del describe).

- [ ] **Step 3: Verificar que la suite completa NO regresa (algunos tests existentes pueden romperse si dependen de `parseBH_` retornando string)**

Run: `npm test 2>&1 | tail -20`
Expected: PASS o FAIL puntual en tests que dependan de `parseBH_`. Si falla `labs-coag.test.mjs` o similar (por comparar texto), continuar a Task 9 que arregla el call site; los tests externos dependen del consumo de parseBH_ no del shape directo.

> **Si hay un test existente que llame `parseBH_` directamente y espere un string**, actualizarlo para usar `.visible`. Por ejemplo:
> ```javascript
> assert.match(parseBH_(text).visible, /BH\tHb/);
> ```
> Commit ese cambio como parte de esta tarea.

- [ ] **Step 4: Commit**

```bash
git add public/js/labs.js
git commit -m "refactor(labs): parseBH_ returns { visible, extras } with extended fields"
```

---

## Task 9: Wire `bhExtras` end-to-end (parsearTodo → set storage → parsedBySection)

**Files:**
- Modify: `public/js/labs.js`
- Modify: `public/js/app.js`

- [ ] **Step 1: Actualizar el call site de `parseBH_` en `parsearTodo` (`labs.js` ~línea 1471)**

Reemplazar la línea:
```javascript
    var bh=parseBH_(tSinLiqCorp);    if(bh)resLabs.push(bh);
```
por:
```javascript
    var bhRes = parseBH_(tSinLiqCorp);
    var bhVisible = (bhRes && bhRes.visible) ? bhRes.visible : '';
    var bhExtras  = (bhRes && bhRes.extras)  ? bhRes.extras  : {};
    if (bhVisible) resLabs.push(bhVisible);
```

Y modificar el `return` al final de la función `parsearTodo` (línea ~1488) para incluir `bhExtras`:

```javascript
  resLabs = dedupeSingletonSections_(resLabs);
  return { patient: patient, resLabs: resLabs, bhExtras: bhExtras };
```

(Mover `var bhExtras = {};` al inicio de `parsearTodo` si está fuera del scope. Inicializar antes del condicional `if(!esSoloGaso)` para que sea siempre `{}`).

- [ ] **Step 2: Almacenar `bhExtras` en cada lab set**

En `app.js`, buscar el lugar donde se construye el set tras un parse (busca `parsedBySection: buildParsedBySectionFromResLabs(resLabs)` — línea ~6429). Modificar para incluir `bhExtras`:

```javascript
    parsedBySection: buildParsedBySectionFromResLabs(resLabs, bhExtras),
    bhExtras: bhExtras || {}
```

Y donde se obtiene el resultado de `parsearTodo`, extraer `bhExtras`:

```javascript
    var parsed = parsearTodo(textoBruto);
    var resLabs = parsed.resLabs || [];
    var bhExtras = parsed.bhExtras || {};
```

(Hay potencialmente varios call sites. Usar grep para encontrarlos: `rg "parsearTodo\(" public/js/app.js`.)

- [ ] **Step 3: Actualizar `buildParsedBySectionFromResLabs` para aceptar extras**

Localizar la función (línea ~7321). Cambiar la firma y agregar el merge:

```javascript
function buildParsedBySectionFromResLabs(resLabs, bhExtras) {
  var secs = parsearSecciones(resLabs || []);
  var out = {};
  Object.keys(secs).forEach(function (sec) {
    if (!tendEligibleSectionKey(sec)) return;
    var row = {};
    var tbl = secs[sec];
    Object.keys(tbl).forEach(function (k) {
      var cell = tbl[k];
      if (!cell || cell.val == null || cell.val === '---') return;
      var n = parseFloat(String(cell.val).replace(/\*/g, '').replace(',', '.'));
      if (!isFinite(n)) return;
      row[k] = n;
    });
    if (Object.keys(row).length) out[sec] = row;
  });
  // Merge BH extras (trends-only)
  if (bhExtras && typeof bhExtras === 'object') {
    if (!out.BH) out.BH = {};
    Object.keys(bhExtras).forEach(function (k) {
      var n = parseFloat(String(bhExtras[k]).replace(/\*/g, '').replace(',', '.'));
      if (isFinite(n) && out.BH[k] == null) out.BH[k] = n;
    });
  }
  return out;
}
```

- [ ] **Step 4: Actualizar todos los call sites de `buildParsedBySectionFromResLabs`**

Run: `rg -n "buildParsedBySectionFromResLabs\(" public/js/app.js`

Para cada call site, pasar `set.bhExtras` o `bhExtras` según el contexto:
- Línea ~5329: `set.parsedBySection = buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);`
- Línea ~5715: `keeper.parsedBySection = buildParsedBySectionFromResLabs(deduped, keeper.bhExtras);`
- Línea ~6429: (ya cubierto en Step 2)
- Línea ~7367: `var pbNext = buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);`

- [ ] **Step 5: Asegurar que `ensureParsedLabHistory` re-extrae extras al re-parsear**

En `ensureParsedLabHistory` (línea ~7340), si un set tiene `resLabs` pero no `bhExtras`, ejecutar `parsearTodo` sobre `set.sourceText` (si existe) y rellenar `set.bhExtras`. Localizar el bloque que hace `var repro = reprocessLabResultLines_(set.resLabs);` (línea ~5322) o similar y agregar:

```javascript
    if (!set.bhExtras && set.sourceText) {
      try {
        var reParse = parsearTodo(set.sourceText);
        set.bhExtras = (reParse && reParse.bhExtras) ? reParse.bhExtras : {};
      } catch (_e) { set.bhExtras = {}; }
    }
```

(Si `sourceText` no está disponible, dejar `set.bhExtras = {}` para que no truene; los sets viejos simplemente no tendrán los campos extendidos hasta que se vuelvan a pegar).

- [ ] **Step 6: Verificar sintaxis**

Run: `node --check public/js/app.js && node --check public/js/labs.js && echo ok`
Expected: `ok`.

- [ ] **Step 7: Correr toda la suite**

Run: `npm test 2>&1 | tail -15`
Expected: PASS. Si algún test existente tronchó por shape de `parseBH_`, arreglarlo aquí también.

- [ ] **Step 8: Commit**

```bash
git add public/js/labs.js public/js/app.js
git commit -m "feat(labs): wire bhExtras through parsearTodo and parsedBySection"
```

---

## Task 10: Extender `TEND_SERIES_CATALOG` y sembrar ocultos por default

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Extender `TEND_SERIES_CATALOG`**

Localizar `var TEND_SERIES_CATALOG = [` (línea ~162). Insertar las nuevas entradas justo después de las BH existentes (después de `{ sectionKey: 'BH', fieldKey: 'INR', cardTitle: 'INR' },`):

```javascript
  { sectionKey: 'BH', fieldKey: 'RBC',       cardTitle: 'Eritrocitos' },
  { sectionKey: 'BH', fieldKey: 'CHCM',      cardTitle: 'CHCM' },
  { sectionKey: 'BH', fieldKey: 'RDW',       cardTitle: 'RDW' },
  { sectionKey: 'BH', fieldKey: 'Lin',       cardTitle: 'Linfocitos' },
  { sectionKey: 'BH', fieldKey: 'Mono',      cardTitle: 'Monocitos' },
  { sectionKey: 'BH', fieldKey: 'Baso',      cardTitle: 'Basófilos' },
  { sectionKey: 'BH', fieldKey: 'MPV',       cardTitle: 'VPM' },
  { sectionKey: 'BH', fieldKey: 'Bandas',    cardTitle: 'Bandas' },
  { sectionKey: 'BH', fieldKey: 'Mielo',     cardTitle: 'Mielocitos' },
  { sectionKey: 'BH', fieldKey: 'Metamielo', cardTitle: 'Metamielocitos' },
  { sectionKey: 'BH', fieldKey: 'Promielo',  cardTitle: 'Promielocitos' },
  { sectionKey: 'BH', fieldKey: 'Blastos',   cardTitle: 'Blastos' },
  { sectionKey: 'BH', fieldKey: 'Atipicos',  cardTitle: 'Linfocitos atípicos' },
  { sectionKey: 'BH', fieldKey: 'NeuPct',  cardTitle: 'Neutrófilos %',  hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'LinPct',  cardTitle: 'Linfocitos %',   hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'MonoPct', cardTitle: 'Monocitos %',    hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'EosPct',  cardTitle: 'Eosinófilos %',  hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'BasoPct', cardTitle: 'Basófilos %',    hiddenByDefault: true },
```

- [ ] **Step 2: Sembrar `hiddenByDefault` la primera vez**

Localizar la inicialización al final del archivo (busca `DOMContentLoaded` o donde se llama `loadSettings`). Insertar un helper que se corra una vez:

```javascript
function seedTendHiddenDefaults() {
  var SEED_KEY = 'rpc-tend-hidden-seeded-v1';
  if (localStorage.getItem(SEED_KEY) === '1') return;
  var current = (function () {
    try {
      var raw = localStorage.getItem(TEND_HIDDEN_SERIES_LS);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_e) { return []; }
  })();
  var seen = {};
  current.forEach(function (k) { seen[k] = true; });
  TEND_SERIES_CATALOG.forEach(function (sp) {
    if (sp.hiddenByDefault) {
      var key = sp.sectionKey + ':' + sp.fieldKey;
      if (!seen[key]) { current.push(key); seen[key] = true; }
    }
  });
  localStorage.setItem(TEND_HIDDEN_SERIES_LS, JSON.stringify(current));
  localStorage.setItem(SEED_KEY, '1');
}
```

Y llamarla una sola vez al inicializar la app (después de la línea que define `settings`/`loadSettings`):

```javascript
seedTendHiddenDefaults();
```

- [ ] **Step 3: Confirmar que `tendSeriesIsUserHidden` ya consume `TEND_HIDDEN_SERIES_LS`**

Run: `rg -n "TEND_HIDDEN_SERIES_LS|tendSeriesIsUserHidden" public/js/app.js | head`
Expected: Encontrar `tendSeriesIsUserHidden` leyendo de `TEND_HIDDEN_SERIES_LS`. Si NO existe, agregar:

```javascript
function tendSeriesIsUserHidden(sectionKey, fieldKey) {
  try {
    var raw = localStorage.getItem(TEND_HIDDEN_SERIES_LS);
    var arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return false;
    return arr.indexOf(sectionKey + ':' + fieldKey) !== -1;
  } catch (_e) { return false; }
}
```

- [ ] **Step 4: Verificar sintaxis**

Run: `node --check public/js/app.js && echo ok`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add public/js/app.js
git commit -m "feat(trends): add extended BH series and seed hidden defaults for %"
```

---

## Task 11: Smoke test manual + commit final del feature

**Files:**
- (Ninguno editado; solo verificación)

- [ ] **Step 1: Correr toda la suite de tests**

Run: `npm test 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 2: Smoke test de la app**

Run: `npm start`
Verificar:
- **Pendientes:**
  - Sala: tab 2ª; Interconsulta: tab 1ª.
  - Agregar pendientes con cada prioridad → orden esperado.
  - Toggle completado, eliminar, cambiar prioridad → persiste tras recargar.
  - Borrar paciente → desaparecen sus pendientes.
- **Shortcuts:** CMD+1..4, CMD+P funcionan según spec; help text actualizado.
- **BH extendida:**
  - Pegar el lab BH real provisto en el spec → el renglón en el historial muestra solo `RBC, Hb, Hto, VCM, HCM, CHCM, RDW, Leu, Plt, MPV` (sin Neu, Lin, Mono, Eos, Baso, ni %).
  - Ir a Tendencias → aparecen cards de Linfocitos, Monocitos, Basófilos, RDW, MPV, etc.
  - Los porcentajes (Neu%, Lin%, etc.) NO aparecen por default pero están listados en la "barra de ocultos" (pueden mostrarse manualmente).

- [ ] **Step 3: Commit de cierre (si hay cambios sueltos)**

```bash
git status
# Si quedó algo:
git add -A
git commit -m "chore: final cleanup for todos/shortcuts/bh-extended"
```

---

## Task 12: Propagar cambios a `beta/live-sync`

**Files:**
- (Ninguno editado; operación de git)

- [ ] **Step 1: Verificar que `main` está limpio**

Run: `git status` (debe decir clean) y `git log --oneline -5`.

- [ ] **Step 2: Merge `main` → `beta/live-sync`**

```bash
# El worktree de beta vive en:
#   /Users/mauriciosalas/.config/superpowers/worktrees/R+/feature-live-sync-impl
WT=/Users/mauriciosalas/.config/superpowers/worktrees/R+/feature-live-sync-impl

git -C "$WT" status                          # debe estar limpio
git -C "$WT" merge main --no-ff -m "merge: traer pendientes/shortcuts/bh-extended a beta"
```

- [ ] **Step 3: Correr tests en beta tras el merge**

Run: `cd "$WT" && npm test 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 4: Volver al worktree principal y verificar estado**

```bash
cd /Users/mauriciosalas/R+
git branch -v
```

Expected:
- `main` con la cabeza nueva.
- `beta/live-sync` con el merge commit incluyendo las 3 features + live-sync.

- [ ] **Step 5: Commit (si aplica)**

El merge en beta ya creó un commit. No requiere commit adicional en `main`.

---

## Notas finales

- Si en cualquier task un test rompe inesperadamente, **detener** y revisar antes de continuar (no fixear con shortcuts).
- Si la implementación de un task se desvía del plan (porque encontraste estado real distinto), actualizar el plan inline antes de avanzar al siguiente.
- Mantener commits atómicos: un task = uno o dos commits relacionados.
