# Manejo electrolítico, gasometría extendida y formato SOME — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans para el plan de implementación. Luego superpowers:subagent-driven-development o superpowers:executing-plans.

**Fecha:** 2026-05-25  
**Goal:** Al procesar laboratorios, detectar alteraciones electrolíticas y gasométricas; mostrar reposición adulta calculada en pestaña **Manejo**; extender interpretación gasométrica en **Tendencias → Gasometría**; emitir campos SOME copiables.

**Fuente clínica autoritativa:**  
`/Users/mauriciosalas/Downloads/Guía Completa de Reposición Electrolítica en Adultos.pdf`  
(Incluye hipoelectrolitemias, hiperelectrolitemias, déficits múltiples, monitoreo y tabla de soluciones IV.)

**Architecture:** Motores puros (`electrolyte-manejo.mjs`, `gaso-extended.mjs`) + UI delgada. Sin dependencias nuevas.

**Tech stack:** JavaScript ESM, tests Node `--test`.

---

## Alcance v1

| Incluido | Excluido |
|---|---|
| Pestaña Manejo (adultos) | Pediatría |
| Hipo + hiper electrolíticos según PDF | Diálisis como orden auto-generada |
| SOME copiable (medicamento, dosis, dilución, cc/hr, vía) | Integración API SOME |
| Auto-apertura Manejo (**solo modo normal**) | Auto-apertura en Pase/ronda |
| Gasometría extendida en Tendencias | FiO2 desde ventilador |
| Peso, talla, vía en Datos paciente | Escenarios clínicos avanzados sin datos (volumen, SIADH) como calculadora completa |
| Alertas cruzadas (Mg→K, Ca→P, eTFG) | Kayexalate (guía: ya no recomendado) |

---

## Feature 1 — Datos del paciente

### Campos nuevos en `patient`

```javascript
{
  peso: '',        // kg; ej. "60"
  talla: '',       // m; ej. "1.60" (captura; no bloquea v1)
  viaAcceso: ''    // periferica | cvc | picc | ''
}
```

### Dropdown `viaAcceso`

| Valor | Etiqueta | Efecto |
|---|---|---|
| `''` | No especificada | Default **EV periférica** |
| `periferica` | EV periférica | K⁺ máx 40 mEq/L, 10 mEq/h |
| `cvc` | CVC / catéter central | K⁺ máx 80 mEq/L, 20–40 mEq/h + ECG si >10 mEq/h |
| `picc` | PICC | v1 = mismos límites que periférica |

### UI

- `buildPatientDemographicsCardHtml`: fila **Peso (kg) | Talla (m) | Vía de acceso**.
- Manejo: banner inline editable si falta peso/vía.
- LAN sync: campos opcionales backward-compatible.

---

## Feature 2 — Motor electrolítico (`electrolyte-manejo.mjs`)

### Entrada

```javascript
evaluateElectrolyteManejo({
  parsedBySection,   // ESC, QS, BH, GASES del último set
  parsed,
  patient,           // peso, sexo, viaAcceso
  refsBySection,
  labSetId,
  labFecha,
})
```

**Datos derivados del lab (automáticos):**
- **Albúmina** (QS/BH) → calcio corregido.
- **eTFG / Cr** (QS) → alertas IRC (TFG <30): reducir dosis K⁺/Mg²⁺ 50%, evitar P IV, monitoreo estrecho.
- **Glu** (QS/GASES) → hiperK: insulina ± dextrosa según glucemia.
- **pH / HCO₃** (GASES) → alertas: K⁺ con acidosis metabólica → considerar citrato/bicarbonato de K⁺; hiperK + acidosis → bicarbonato solo si pH <7.2.

### Salida por alteración

```javascript
{
  electrolyte: 'K',
  direction: 'hypo' | 'hyper',
  value, unit, interpretation,
  severity: 'leve' | 'moderada' | 'grave' | 'emergencia',
  formula, formulaResult,
  suggestedDose, route, monitoring,
  alerts: string[],
  clinicalNotes: string[],      // escenarios no calculados (SIADH, restricción hídrica…)
  someOrders: SomeOrder[],      // 1+ líneas SOME (hiperK = secuencia)
  ruleId: 'k-hypo-moderate',
}
```

### Clasificación por ion (PDF)

#### POTASIO

| Dirección | Severidad | Criterio |
|---|---|---|
| Hipo | Leve | 3.0–3.4 mEq/L |
| Hipo | Moderada | 2.5–2.9 |
| Hipo | Grave / emergencia | <2.5 o arritmias |
| Hiper | Leve | 5.5–5.9 sin ECG |
| Hiper | Moderada | 6.0–6.4 sin ECG |
| Hiper | Grave / emergencia | ≥6.5 o cambios ECG |

**Hipo — protocolo default (tolerante de volumen):**
- Dosis: 20–40 mEq en 500–1000 mL SS 0.9%.
- Velocidad: **10 mEq/h** periférica; hasta **20–40 mEq/h** CVC.
- Diluyente: **SS 0.9%** (evitar dextrosa en hipo grave).
- Déficit estimado: `(4.0 − K_act) × peso × 0.4` mEq.
- Monitoreo: K⁺ c/4–6 h.

**Hipo — emergencia con arritmias:**
- 10 mEq en 100 mL SS 0.9%, pasar en 15–30 min **vía central**.
- ECG continuo; K⁺ c/2 h.

**Hipo — IRC (TFG <30):**
- Dosis inicial **−50%** (10–20 mEq); máx **5–10 mEq/h**; evitar si K⁺ >4.

**Hipo — con hipomagnesemia concomitante:**
- Alerta: **corregir Mg²⁺ primero** (K⁺ refractario).
- Opcional: solución combinada (1 L D5W/SS 0.45% + 20 mEq KCl + 4 mL MgSO₄ 50% en 8 h).

**Hipo — con acidosis metabólica:**
- Sugerir **citrato/bicarbonato de K⁺**; evitar KCl.

**Hipo — con hipofosfatemia:**
- Sugerir **fosfato de potasio** (20–40 mEq K⁺ + 15–30 mmol P); alerta hipocalcemia.

**Hiper — emergencia (secuencia SOME, múltiples filas):**

1. **Gluconato de calcio 10%:** 1000–2000 mg (10–20 mL) IV en 2–5 min; repetir a 5 min si ECG anormal.  
   SOME: `GLUCONATO DE CALCIO 10% SOL INY` · 10–20 mL · sin diluir o 50–100 mL D5W · bolo · INTRAVENOSA.
2. **Insulina regular 10 U IV** + **D50 50 mL** si glu <250 mg/dL (si ≥250, solo insulina).
3. **Salbutamol nebulizado 10–20 mg** en 4 mL SS 0.9%.
4. Notas: monitoreo glucemia c/30–60 min × 4–6 h; K⁺ c/2 h; **Kayexalate no recomendado**; considerar diálisis si refractario.

**Límites vía (PDF):**

| Vía | K⁺ conc. máx | K⁺ velocidad máx |
|---|---|---|
| Periférica | 40 mEq/L (10 mEq/250 mL) | 10 mEq/h |
| Central | 80 mEq/L (20 mEq/250 mL) | 20–40 mEq/h (ECG si >10) |

#### SODIO

| Dirección | Severidad | Criterio |
|---|---|---|
| Hipo | Grave sintomática | <125 o síntomas |
| Hipo | Moderada | 125–134 |
| Hiper | Leve | 145–150 |
| Hiper | Moderada | 150–160 |
| Hiper | Grave | >160 o síntomas neurológicos |

**Hipo grave sintomática:**
- **NaCl 3%** (513 mEq/L): bolo 100–150 mL en 10–20 min.
- Meta: ↑4–6 mEq/L en 1–2 h; **máx 10 mEq/L/24 h** (desmielinización osmótica).
- Déficit: `TBW × (Na_obj − Na_act)`; TBW hombre=0.6, mujer/anciano=0.5.
- mL NaCl 3% ≈ `mEq_Na / 0.513`.

**Hiper:**
- Déficit agua libre: `TBW × [(Na_act/140) − 1]` L.
- Corrección: **máx 10–12 mEq/L/24 h** (6–8 si crónica >48 h).
- Velocidad ideal: **0.5 mEq/L/h** (1 mEq/L/h emergencia).
- Fluido: D5W o SS 0.45%; `mL/h ≈ (déficit_L × 1000) / 24–48`.
- Notas contextuales (no calculadora v1): hipovolémico → fase SS 0.9% primero; hipervolémico → diuréticos, evitar salinas.

#### MAGNESIO

| Dirección | Severidad | Criterio |
|---|---|---|
| Hipo | Moderada | 1.0–1.5 mg/dL |
| Hipo | Grave | <1.0 mg/dL o síntomas |
| Hiper | Leve | 2.5–3.0 |
| Hiper | Moderada | 3.0–4.0 |
| Hiper | Grave | >4.0 o arreflexia/depresión respiratoria |

**Hipo grave:** 2–4 g (16–32 mEq) MgSO₄ en 100–250 mL SS/D5W en 15–60 min; mantenimiento 1–2 g/h × 6–24 h.  
**Hipo moderada:** 4–6 g en 500–1000 mL en 4–8 h.  
**MgSO₄ 50%:** 500 mg/mL = 4 mEq/mL = 2 mmol/mL.

**Hiper grave:** Ca gluconato 1000–2000 mg IV; hidratación + furosemida; diálisis si IRC.

#### FÓSFORO

| Dirección | Severidad | Criterio |
|---|---|---|
| Hipo | Moderada | 1.0–2.0 mg/dL |
| Hipo | Grave | <1.0 mg/dL |
| Hiper | Leve | 4.5–5.5 |
| Hiper | Moderada | 5.5–7.0 |
| Hiper | Grave | >7.0 o Ca×P >55–70 |

**Hipo grave:** `0.16–0.32 mmol/kg` (15–30 mmol/70 kg) en 250–500 mL SS 0.9% en 6–12 h; máx 90 mmol/día.  
**Precaución:** normalizar **Ca²⁺ antes** de P IV; si K⁺ ≥4 → **fosfato de sodio** (no de potasio).  
**Hiper:** quelantes VO, hidratación; calcular **Ca×P** si hay Ca; diálisis si P >10 refractario — indicación textual.

#### CALCIO (hipo; PDF no tiene capítulo dedicado — reglas estándar adulto)

- **Corregido:** `Ca + 0.8 × (4.0 − Alb)`.
- Hipo sintomática (<8.5 corregido o iCa bajo en GASES): **gluconato de calcio 10%** 1–2 g IV en 10–20 min.
- Hiper (>10.5): hidratación; notas bisphosphonato/calcitonina (texto, no SOME auto v1).

#### CLORO (hipo; alerta contextual)

- HipoCl con alcalosis: SS 0.9% (154 mEq Cl/L).
- Con hipokalemia: preferir **KCl** (40–100 mEq/día).
- v1: fila informativa si Cl <98 + alcalosis en gasometría; SOME = KCl o SS según contexto.

### Reglas cruzadas (banner Manejo)

| Condición | Acción UI |
|---|---|
| K⁺ bajo + Mg²⁺ bajo | Banner: "Corregir magnesio primero" |
| P⁺ bajo + Ca²⁺ bajo | Banner: "Normalizar calcio antes de fósforo" |
| K⁺ bajo + P⁺ bajo | Sugerir fosfato de potasio |
| K⁺ alto + necesidad P | Fosfato de **sodio** |
| eTFG <30 | Badge IRC en filas afectadas; −50% dosis K/Mg; evitar P IV |
| HiperNa | Alerta: no corregir >10–12 mEq/L/24 h |
| HipoNa sintomática | Alerta: no corregir >10 mEq/L/24 h |

### Cálculo dilución + velocidad (SOME)

Algoritmo para cada reposición IV:

1. Elegir `mEq` (o mmol P) a administrar según severidad y déficit.
2. Calcular volumen: `vol_mL = mEq / conc_max_por_via × 1000` (redondear a 100/250/500/1000 mL estándar).
3. `mEq_por_hora` = min(severidad, límite vía, límite IRC).
4. `infusionRateMlHr = round((mEq_por_hora / mEq_totales) × vol_mL)`.
5. Validar conc. final ≤ límite vía; si no, aumentar volumen.

### Catálogo SOME

| Situación | Medicamento SOME |
|---|---|
| K⁺ repo | `CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)` |
| Na⁺ hipo | `CLORURO DE SODIO AL 3% SOL INY` |
| Ca²⁺ IV | `GLUCONATO DE CALCIO 10% SOL INY` |
| Mg²⁺ IV | `SULFATO DE MAGNESIO 50% SOL INY` (ajustar presentación institucional) |
| P⁺ IV | `FOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)` o fosfato de sodio |
| HiperK estabilizar | `GLUCONATO DE CALCIO 10% SOL INY` |
| HiperK shift | `INSULINA REGULAR` + `DEXTROSA 50% SOL INY` |
| HiperK nebul | `SALBUTAMOL` (nebulizado — nota en dilución/frecuencia) |

### Detección post-lab

```javascript
patient.manejoPending = { labSetId, detectedAt };  // si ≥1 alteración
```

Reemplaza auto-pendientes Na/K/Ca/Mg de `lab-clinical-suggestions.mjs`. **Hb <7 transfusion** se mantiene.

---

## Feature 3 — Pestaña Manejo

### Orden tabs

- **Sala:** Datos → Pendientes → **Manejo** → Tendencias → Cultivos → Listado
- **Normal:** Notas → Indicaciones → Tendencias → Cultivos → Pendientes → **Manejo**

### UI

Tabla principal + **sub-panel SOME** por fila (expandible).

Columnas: Electrolito | Valor | Interpretación | Fórmula | Dosis | Vía | Monitoreo | Acciones

**Acciones:** botones copiar SOME + **+ Pendiente**

**HiperK emergencia:** fila agrupada con 2–4 sub-órdenes SOME numeradas.

**Pie fijo (PDF):**
- Límites: Na ±10 mEq/L/24 h; K⁺ periférico 10 mEq/h; P máx 90 mmol/día.
- Alertas: no KCl con dextrosa (hipo grave); bomba de infusión; ECG en correcciones IV.
- Equivalencias: 1 mL KCl 20% ≈ 2.7 mEq; MgSO₄ 50% = 4 mEq/mL.

### Auto-apertura

Solo `!isPaseMode() && getUiDensity() === 'normal' && patient.manejoPending`.  
Limpiar flag al renderizar Manejo.

---

## Feature 4 — Formato SOME copiable

**Regla:** todo texto SOME va en **MAYÚSCULAS** (medicamento, vía, dilución, velocidad, unidades). El motor normaliza con `toSomeUpper_()` antes de mostrar y copiar al portapapeles.

Campos por orden (pestaña Medicamentos S.O.M.E.):

| Campo R+ | SOME | Ejemplo |
|---|---|---|
| Medicamento | Búsqueda | `CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)` |
| Vía | Vía | `INTRAVENOSA` |
| Dosis | Dosis + unidad | `40` `MEQ` |
| Dilución | Indicar dilución | `500 CC SOL. SALINA 0.9%` |
| Velocidad | Velocidad de infusión | `50 CC/HR` |

Bloque multilínea **Copiar bloque SOME** (también todo mayúsculas):

```
MEDICAMENTO: CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)
VIA: INTRAVENOSA
DOSIS: 40 MEQ
DILUCION: 500 CC SOL. SALINA 0.9%
VELOCIDAD DE INFUSION: 50 CC/HR
```

Botones: copiar individual + **Copiar bloque SOME**.  
Flag `requiresDilution: true` → badge **REQUIERE DILUCIÓN** en UI (como SOME).

---

## Feature 5 — Pendientes

Botón **+ Pendiente** por fila/sub-orden. Texto enriquecido con dosis, dilución, cc/hr, vía, monitoreo.  
Dedup `labRuleId` + `labFecha`. Sin auto-agregar.

---

## Feature 6 — Gasometría extendida (Tendencias)

Panel en sección **Gasometría** del modal/grupo tendencias. Motor `gaso-extended.mjs`:

1. pH → acidemia/alcalemia  
2. Trastorno primario  
3. Winter / HCO₃ esperado agudo-c crónico  
4. Compensación vs mixto  
5. AG corregido (`computeAnionGapValue_`)  
6. HCO₃ corregido + delta-delta  
7. PaO₂/FiO₂, gradiente A-a (FiO₂ editable, default 0.21)

Interpretación corta en lab output se mantiene; panel extendido solo en Tendencias.

---

## Feature 7 — Archivos y tests

**Nuevos:** `electrolyte-manejo.mjs`, `.test.mjs`, `gaso-extended.mjs`, `.test.mjs`, `features/manejo.mjs`, `styles/manejo.css`

**Modificados:** index/app-body, pase-board, patients, expediente, app-shell, lab-panel, lab-clinical-suggestions, tendencias, app-runtimes, lan-sync, chrome

**Tests clave:**
- K⁺ periférica vs CVC (40 vs 80 mEq/L)
- Na⁺ TBW M/F; NaCl 3% mL
- HiperK → 3 someOrders secuenciales
- Mg antes de K alert
- Ca×P hiperfosfatemia
- eTFG <30 reduce dosis
- SOME block multilínea (todo mayúsculas)
- manejoPending normal-only
- Winter + compensación

---

## Disclaimer

Apoyo a decisión clínica. Validación médica obligatoria. Escenarios complejos del PDF (SIADH, realimentación día 1–2, IC descompensada) se muestran como **clinicalNotes** / banners en v1, no como calculadora completa.

---

## Implementación sugerida

1. Patient fields (peso, talla, vía)  
2. `electrolyte-manejo.mjs` + tests (hipo + hiper PDF)  
3. Tab Manejo + SOME clipboard  
4. manejoPending + auto-open + quitar suggestions electrolitos  
5. `gaso-extended.mjs` + panel Tendencias  
6. LAN sync + verificación manual SOME
