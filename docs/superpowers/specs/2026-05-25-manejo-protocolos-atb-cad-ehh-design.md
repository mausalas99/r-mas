# Manejo — Protocolos, ATB asistido y CAD/EHH — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans para el plan de implementación. Luego superpowers:subagent-driven-development o superpowers:executing-plans.

**Fecha:** 2026-05-25  
**Goal:** Extender la pestaña **Manejo** con sub-pestañas (Electrolitos, Protocolos, ATB, CAD/EHH): catálogo de indicaciones IV/VO copiables, calculadoras clínicas relevantes, antibióticos curados desde guía local con sugerencias ligadas a cultivos, y protocolo ADA de cetoacidosis / estado hiperosmolar con lectura de laboratorio.

**Fuentes clínicas (curación manual → JSON; no parseo PDF en runtime):**

| Tema | Archivo fuente |
|------|----------------|
| Protocolos infusiones / sedación / fluidos (lista del equipo) | Entrada de producto (chat 2026-05-25) |
| Antibióticos (dosis, indicaciones, ajuste renal) | `/Users/mauriciosalas/Downloads/atb.pdf` |
| CAD y EHH | `/Users/mauriciosalas/Downloads/CETO.pdf` (ADA 2026, AFP 2024, revisiones EHH) |
| Electrolitos (existente) | `docs/superpowers/specs/2026-05-25-manejo-electrolitos-gasometria-design.md` |

**Architecture:** Motores puros + `features/manejo.mjs` delgado. Reutilizar parsers de cultivos (`labs.js`, `expediente.mjs`). Sin dependencias nuevas.

**Tech stack:** JavaScript ESM, tests Node `--test`, CSS en `manejo.css`.

**Relación con spec previo:** Este documento **añade** sub-pestañas y catálogos; no reemplaza el motor electrolítico ya especificado/implementado.

---

## Decisiones de producto (cerradas)

| Tema | Decisión |
|------|----------|
| Layout Manejo | **4 sub-pestañas:** Electrolitos \| Protocolos \| ATB \| CAD/EHH |
| Protocolos | **Híbrido (C):** texto fijo copiable + calculadoras solo donde aportan |
| ATB + cultivos | **Enfoque B:** contexto de cultivo + destacar S + alertas de mecanismos; **sin** esquema antibiótico automático completo |
| CAD/EHH | **4ª sub-pestaña** dedicada (no solo categoría en Protocolos) |
| Umbral glucosa EHH (heurística) | **≥ 500 mg/dL** con pH ≥ 7.25 y sin cetonas positivas en EGO (configurable en constantes del motor) |

---

## Alcance v1

| Incluido | Excluido |
|----------|----------|
| Sub-nav en Manejo + persistencia opcional en `sessionStorage` | Pediatría (límites osmol CAD/EHH pediátricos solo como nota) |
| Catálogo protocolos (~40 ítems lista equipo) | Parseo runtime de PDFs |
| Calculadoras: vanco, balanceada HU, albumina post-paracentesis, hipertónica, sedación mg/kg/h, levetiracetam | Integración API SOME |
| Catálogo ATB ~30 fármacos hospitalarios curados de `atb.pdf` | Esquema ATB multi-fármaco generado automáticamente |
| Puente cultivos: positivos recientes, R/I/S, BLEE/VRE/carbapenemasa | TDM / niveles con recordatorios programados |
| CAD/EHH: checklist por fases, calculadora insulina y líquidos, lectura lab | Figura 1 del PDF como imagen embebida (checklist textual v1) |
| Copiar + Pendiente en todas las tarjetas | Auto-apertura de sub-pestaña ATB en Pase/ronda |
| Tests unitarios de motores | Edición del catálogo por UI (solo código/JSON v1) |

---

## Feature 1 — Sub-pestañas en Manejo

### UI

- Dentro de `#manejo-container`, estructura:
  - `nav.manejo-subtabs` con `role="tablist"` y 4 botones.
  - Cuatro paneles `role="tabpanel"`: `manejo-panel-electrolitos`, `manejo-panel-protocolos`, `manejo-panel-atb`, `manejo-panel-cad-ehh`.
- **Electrolitos:** delegar al render actual (`evaluateElectrolyteManejo` + tarjetas existentes).
- Cambio de sub-pestaña: `renderManejoSubtab(id)`; guardar última en `sessionStorage` clave `manejoSubtab` (global por sesión, no por paciente en v1).
- `aria-label` del tab Manejo en expediente: actualizar a **"Manejo clínico"** (electrolitos, protocolos, ATB, CAD/EHH).

### Archivos

- `public/js/features/manejo.mjs` — orquestación sub-tabs.
- `public/styles/manejo.css` — estilos sub-nav, estados ATB (compatible / precaución / neutro).

---

## Feature 2 — Catálogo de protocolos

### Datos (`manejo-protocols-catalog.mjs`)

Array de entradas:

```javascript
{
  id: 'nore-standard',
  category: 'vasopresores',  // enum ver tabla abajo
  title: 'Noradrenalina',
  indicationText: '16 mg en 125 cc glucosado 5%. Iniciar 5 mcg/min y titular.',
  calculatorId: null,       // o 'weight-infusion-rate', etc.
  copyTemplate: '...',      // texto final para portapapeles
  notes: ['Permitir titular'],
  tags: [],
}
```

### Categorías (acordeón o chips filtro)

| `category` | Contenido |
|------------|-----------|
| `vasopresores` | NORE, vasopresina |
| `cardiovascular` | Nitroglicerina, IAM (nitro + meta TA), amiodarona |
| `sedacion` | Midazolam, propofol, dexmed, bloque IOT |
| `anticonvulsivantes` | Levetiracetam impregnación |
| `fluidos-electrolitos` | Balanceada HU, Mg, Ca, hipertónica, bicarb VO |
| `analgesia` | Buprenorfina |
| `respiratorio` | Salbutamol nebul |
| `hierro-transfusion` | Carboximaltosa, venofer, plaquetas |
| `diureticos-albumina` | Furosemida, albumina post-paracentesis |
| `otros` | Solución Stanford (una entrada), etc. |

### Ítems obligatorios v1 (lista equipo)

Incluir textos acordados en brainstorming: NORE, vasopresina, nitro, IAM, midazolam, propofol (sin dilución), dexmed, levetiracetam, balanceada HU (+ fórmula), vanco carga/mtto/niveles (también en ATB), buprenorfina, amiodarona, gluconato Ca bolo/infusión, hipertónica, salbutamol, Stanford, carboximaltosa (+ premedicación Marcelo Renegy), venofer, plaquetas, furo 360/100, albumina ejemplo, Mg 8g/500cc 9h, bicarb cápsulas, sedación IOT (midazolam + propofol + dexmed con “permitir titular”).

Duplicados: **una** entrada Stanford.

### UI Protocolos

- Barra de chips por categoría + búsqueda por título/texto.
- Tarjeta: título, `indicationText`, bloque calculadora (si `calculatorId`), notas, **Copiar**, **+ Pendiente**.
- Pendiente: prefijo `Proto:` + título; `ruleId` = `manejo-proto:{id}`; dedupe como electrolitos.

---

## Feature 3 — Calculadoras (`manejo-calculators.mjs`)

Funciones puras; entradas desde peso del paciente (`parsePatientWeightKg`) y campos inline en tarjeta.

| `calculatorId` | Entradas | Salida |
|----------------|----------|--------|
| `vanco-load` | peso kg, mg/kg (default 25, rango 20–30) | mg totales; cc = mg/5; texto dilución G5% 2 h c/12 h |
| `vanco-maint` | peso kg, mg/kg (default 17.5, rango 15–20) | igual regla dilución |
| `bic-hu-balanceada` | peso kg, bic px (lab o manual) | (24−bic)×70×0.3/8.5; tercios: bolo / 4 h diluido / 24 h infusión |
| `albumin-paracentesis` | litros drenados | gramos = L×8; ampollas 20% (10 g/amp) |
| `hypertonic-volume` | peso kg (opcional) | 100 cc fijo o 3×kg cc |
| `insulin-u-kg-h` | peso kg, rate (0.1 o 0.05 o 0.14) | U/h y cc/h si concentración estándar documentada en nota |
| `sedation-mg-kg-h` | peso kg, drug (midazolam \| propofol \| dexmed) | rango mg/h según protocolo |
| `levetiracetam-load` | peso kg | 60 mg/kg en 100 cc SS0.9% |

La tarjeta muestra resultado bajo la calculadora y lo concatena en **Copiar**.

---

## Feature 4 — ATB (catálogo + cultivos B)

### Catálogo (`manejo-atb-catalog.mjs`)

~30 entradas curadas de `atb.pdf`, estructura:

```javascript
{
  id: 'meropenem',
  family: 'carbapenem',
  name: 'Meropenem',
  adultDose: '1 g IV c/8h (ajustar ClCr <40)',
  indications: ['Sepsis', 'infección nosocomial', 'Pseudomonas'],
  renalNote: 'ClCr 10: intervalo 12–24h',
  route: 'IV',
  someAbbrev: ['MERO', 'MER'],
  organismHints: ['pseudomonas', 'enterobacteriaceae'],
  mechanismAlerts: [],  // fármacos a ocultar si BLEE, etc.
}
```

**v1 mínimo:** meropenem, piperacilina-tazobactam, ceftriaxona, cefepime, ceftazidima, cefotaxima, ampicilina, ampicilina-sulbactam, vancomicina (carga/mtto en catálogo + calculadora), linezolid, daptomicina, gentamicina, tobramicina, ciprofloxacino, levofloxacino, metronidazol, clindamicina, tigeciclina, colistina (nota toxicidad), amoxicilina-clavulanato (contexto ambulatorio/IV según texto PDF).

Incluir entradas de **vanco carga/mtto/niveles** alineadas con protocolos del equipo.

### Puente cultivos (`manejo-cultivo-bridge.mjs`)

**Entrada:** `patient`, `labHistory` (últimos sets con `resLabs`).

**Salida:**

```javascript
{
  isolates: [{
    tipoLabel, sitio, organismo, fecha,
    markers: ['BLEE', 'VRE', ...],
    risSummary: string,      // texto R/I/S existente
    sensKeys: ['MERO', 'CIPRO', ...],  // abreviaturas con S
  }],
  globalAlerts: ['BLEE: evitar cefalosporinas 3ª gen', ...],
}
```

**Lógica:**

1. Reutilizar `splitResLabsByTipo` + chunks positivos (misma heurística negativo que expediente).
2. Ventana: aislamientos de los **últimos 14 días** o del último set con cultivo positivo (lo que tenga datos).
3. Mapeo antibiograma S → `someAbbrev` del catálogo (tabla en `manejo-atb-suggest.mjs`).
4. **Clasificación UI por fármaco:**
   - `compatible` — S en antibiograma del aislamiento activo seleccionado.
   - `caution` — alerta de mecanismo (BLEE, VRE, carbapenem-R) aunque aparezca S en otro contexto.
   - `neutral` — resto del catálogo.

**Reglas de mecanismo v1 (alertas, no bloqueo duro):**

| Marca | Alerta |
|-------|--------|
| BLEE / ESBL | Evitar ceftriaxona, cefotaxima, ceftazidima (salvo combinaciones documentadas) |
| VRE | Vancomicina no indicada; preferir linezolid/daptomicina según antibiograma |
| Carbapenemasa (KPC, NDM, …) | Evitar meropenem/imipenem; considerar ceftazidima-avibactam/colistina según nota local |
| MRSA (si detectado en comentario) | Oxacilina/cefazolina vs vanco según S |

**Heurística germen (badge informativo, no orden):**

- *Pseudomonas aeruginosa* → resaltar anti-pseudomonales con S.
- *Enterococcus* → ampicilina / linezolid / vanco según R.
- *Staphylococcus aureus* / *coagulasa negativo* → vanco, linezolid.

### UI ATB

1. **Banner Cultivo activo** — hasta 3 aislamientos; selector si polimicrobiano.
2. Alertas globales (lista).
3. Lista filtrable por familia + búsqueda; borde/ícono según `compatible` / `caution` / `neutral`.
4. Tarjeta ATB: dosis, indicaciones, renal, **Copiar**, **+ Pendiente** (`ATB:` + nombre).

---

## Feature 5 — CAD / EHH (`manejo-cad-ehh.mjs`)

### Entrada

```javascript
evaluateCadEhh({
  parsedBySection,  // QS, GASES, EGO último set
  parsed,
  patient,
})
```

**Extracción lab:**

| Parámetro | Fuente |
|-----------|--------|
| Glucosa | QS `GLUCOSA` / GASES |
| pH, HCO₃ | GASES |
| K⁺ | QS / ESC |
| Cetonas | EGO `CETONAS` (positivo si no “Negativo”) |
| Anion gap | `computeAnionGapValue_` / gaso |

### Modo sugerido

| Modo | Criterio heurístico (adulto) |
|------|------------------------------|
| `cad` | Glucosa > 250 mg/dL y (pH < 7.30 o HCO₃ < 18 mEq/L) |
| `ehh` | Glucosa ≥ 500 mg/dL y pH ≥ 7.25 y cetonas no positivas |
| `indeterminate` | glucosa alta sin cumplir uno solo; usuario elige checklist |

Mostrar banner: *“Sugerencia orientativa; confirmar clínicamente.”*

### Contenido CAD (checklist por fase, copiable)

1. **Líquidos:** 1 L SS 0.9% primera hora si no shock; continuar 0.45–0.9%; déficit 24–48 h.
2. **Insulina:** iniciar 1–2 h post líquidos → 0.1 U/kg/h (calculadora); si glucosa no ↓ ~50 mg/dL/h → +1 U/h; al 250 mg/dL → 0.05 U/kg/h; agregar dextrosa a fluidos.
3. **K⁺:** agregar a solución si K < límite superior y diuresis (link conceptual a tarjeta K⁺ en Electrolitos si K bajo en lab).
4. **Bicarbonato:** no rutinario (nota ADA).
5. **Resolución:** pH > 7.3, HCO₃ ≥ 18, gap normalizado, glucosa < 200 — marcar ✓ en UI según datos disponibles.
6. **Transición SC:** insulina basal 2–4 h antes de suspender IV.

### Contenido EHH

1. **Líquidos:** SS 0.9% 15–20 mL/kg/h o 1–1.5 L/h; ~9 L/48 h; corregir osmol < 3 mOsm/kg/h.
2. **Insulina:** tras rehidratación parcial — bolo 0.1 U/kg o infusión 0.14 U/kg/h sin bolo; hasta glucosa < 300 mg/dL.
3. **Precipitante:** buscar infección / IAM / ACV (texto guía).

### Calculadoras en panel

- Insulina U/kg/h (CAD y EHH).
- Líquidos mL/kg/h (peso).
- Opcional v2: osmolalidad estimada si Na + glucosa + BUN disponibles.

### UI CAD/EHH

- Toggle manual CAD | EHH | Indeterminado (inicial = sugerido por motor).
- Checklist acordeón por fase; cada ítem **Copiar** línea.
- Bloque “Último lab” con valores y checks de criterios de resolución.

---

## Feature 6 — Pendientes y copiar

Reutilizar patrón `addManejoPendiente`:

| Origen | `ruleId` | Texto pendiente |
|--------|----------|-----------------|
| Protocolo | `manejo-proto:{id}` | `Proto: {title}` |
| ATB | `manejo-atb:{id}` | `ATB: {name}` |
| CAD/EHH paso | `manejo-cad:{stepId}` | `CAD: {step}` / `EHH: {step}` |

`shouldAddLabSuggestionTodo` / dedupe: misma semántica que electrolitos (`manejo:` prefix).

---

## Estructura de archivos

```
public/js/manejo-protocols-catalog.mjs
public/js/manejo-atb-catalog.mjs
public/js/manejo-atb-suggest.mjs
public/js/manejo-cultivo-bridge.mjs
public/js/manejo-calculators.mjs
public/js/manejo-calculators.test.mjs
public/js/manejo-cad-ehh.mjs
public/js/manejo-cad-ehh.test.mjs
public/js/manejo-atb-suggest.test.mjs
public/js/features/manejo.mjs          # extendido
public/styles/manejo.css               # extendido
```

Tests de bridge ATB: fixtures reutilizados de `labs-cultivo.test.mjs`.

---

## Testing v1

| Módulo | Casos |
|--------|-------|
| `manejo-calculators` | vanco 80 kg 25 mg/kg → 2000 mg, 400 cc; bic HU con bic px 10; albumina 12 L → 96 g, 10 amp |
| `manejo-atb-suggest` | BLEE + ceftriaxona ESBL → caution en ceftriaxona; MERO S → compatible |
| `manejo-cultivo-bridge` | hemocultivo pseudomonas positivo → isolate en banner |
| `manejo-cad-ehh` | glucosa 450, pH 7.1, HCO3 12 → modo `cad`; glucosa 600, pH 7.38, cetonas neg → `ehh` |
| Integración | smoke: `renderManejo` no lanza con container mock (opcional) |

---

## Orden de implementación sugerido

1. Sub-pestañas + CSS (Electrolitos sin regresión).
2. Catálogo protocolos + calculadoras + UI Protocolos.
3. Cultivo bridge + catálogo ATB + suggest + UI ATB.
4. CAD/EHH motor + UI.
5. Tests + ayuda en `settings-help` (entrada Manejo ampliado).

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Sugerencia ATB interpretada como prescripción | Copy disclaimer; badges “orientativo”; no auto-insertar en nota |
| PDF mal estructurado | Solo JSON curado en repo |
| Polimicrobiano confunde S | Selector de aislamiento en banner ATB |
| CAD/EHH sin gasometría | Modo manual + campos editables en calculadoras |

---

## Referencias de código existente

- Electrolitos: `electrolyte-manejo.mjs`, `features/manejo.mjs`
- Cultivos: `features/expediente.mjs`, `labs.js` (`parseCultivo_`, `buildAtbRisSummaryHtml`)
- Gasometría: `gaso-extended.mjs`
- Peso/vía: `patient.peso`, `patient.viaAcceso` (spec electrolitos)
