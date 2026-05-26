# Estado Actual — monitoreo estructurado (SV, glucometrías, I/O) — Spec de diseño

**Fecha:** 2026-05-26  
**Objetivo:** Reemplazar el flujo texto-only de Estado Actual por un panel dedicado en expediente (modo Sala) con captura estructurada por turno, snapshot derivado, texto SOAP auto-generado con placeholders, tendencias de signos vitales y glucometrías, y gráficas de balance hídrico (turno + global histórico). Incluye migración completa a nivel de app del modelo y referencias legacy.

---

## 1. Contexto y problema

Hoy **Estado Actual** (Sala) abre el modal SOAP sin Subjetivo. Los campos de signos vitales, glucometrías e I/O existen en el modal pero son efímeros: al cerrar se limpian y solo persiste `{ text, savedAt }` en `patient.estadoActual`. No hay historial ni gráficas clínicas de monitoreo.

En **Interconsulta**, los signos vitales viven como snapshot plano en Notas (`note.ta`, `note.fr`, etc.) — flujo distinto, sin tendencias.

**Tendencias** de laboratorio ya usan Chart.js vía `tend-core.mjs` / `tend-group-modal.mjs`. Este diseño reutiliza ese patrón para monitoreo clínico, no para labs.

**Medicamentos** ya clasifica ítems para SOAP (`classifyMedicationSoapCategory`: `abx`, `analgesia`, `antihta`, `vasop`, `otros`) y puede volcar a campos del modal SOAP. Falta integración con estado persistente, confirmación explícita y desplegables filtrados por categoría.

---

## 2. Decisiones validadas (brainstorming)

| Tema | Decisión |
|---|---|
| Modelo | Híbrido: snapshot + historial acumulado |
| Snapshot | Derivado automáticamente de la última medición del historial (por campo) |
| Entrada historial | Formulario completo **núcleo** por medición: SV + glu + I/O |
| Estado clínico general | Campos persistentes (FOUR, analgesia, ABX, etc.) **fuera** del historial; sección colapsable |
| SV alterados | Campo hora editable solo si valor fuera de rango de normalidad |
| Glucometrías | Lista dinámica por medición; cada lectura con valor + hora opcional |
| I/O balances | **Balance de turno** (ing − egr del registro) y **balance global histórico** (Σ desde primer I/O) |
| Texto Estado Actual | Auto-generado desde snapshot + estado clínico; vacíos → `___` |
| UI | Pestaña de **primer nivel** en expediente: Paciente \| Clínico \| **Estado Actual** \| Resultados \| Salida (solo Sala) |
| Botón header | Navega a pestaña Estado Actual |
| Medicamentos | Híbrido: volcado al marcar SOAP → pendiente de confirmar; confirmado no se sobrescribe por cambios en receta |
| Catálogo meds | Ampliar categorización para desplegables filtrados (ABX solo antibióticos, etc.) |
| Migración | **Completa a nivel app** — eliminar modelo legacy `patient.estadoActual` y rutas SOAP-as-Estado-Actual en Sala |

---

## 3. Arquitectura

### 3.1 Módulos nuevos / refactor

| Módulo | Responsabilidad |
|---|---|
| `estado-actual-panel.mjs` | UI del panel, registro de mediciones, snapshot, texto, acciones copiar/guardar |
| `estado-actual-data.mjs` | Modelo, derivaciones (snapshot, balances), migración, persistencia |
| `estado-actual-text.mjs` | Generación texto SOAP (adaptado de `buildSOAPText`) |
| `estado-actual-charts.mjs` | Gráficas SV, glu, I/O (Chart.js, patrones de `tend-core`) |
| `estado-actual-ranges.mjs` | Rangos de normalidad SV + detección alterado |
| `estado-actual-meds.mjs` | Propuestas desde receta, confirmación, desplegables filtrados |

**Refactor:** `soap-estado.mjs` conserva modal SOAP **solo Interconsulta** (plantilla evolución). En Sala, las exportaciones de Estado Actual pasan al panel nuevo.

### 3.2 Modelo de datos (`patient.monitoreo`)

Reemplaza `patient.estadoActual`.

```js
{
  estadoClinico: {
    four: "",
    esferas: "",
    analgesia: "",
    abx: "",
    antihta: "",
    vasop: "",
    soporte: "",      // select: Aire ambiente | Puntillas | Alto flujo | VMNI
    tempContext: "",  // antibióticos ya en abx
    dieta: "",
    kcalKg: "",
    kcal: "",
    pesoRef: ""       // peso para cálculo dietético (distinto de peso en SV)
  },
  confirmado: {
    analgesia: false,
    abx: false,
    antihta: false,
    vasop: false
    // true = no sobrescribir automáticamente desde receta
  },
  pendienteReceta: {
    // mismas keys; propuesta desde Medicamentos antes de confirmar
    analgesia: "",
    abx: "",
    ...
  },
  historial: [
    {
      id: "uuid",
      recordedAt: "ISO-8601",   // hora del registro
      vitals: {
        tas: null, tad: null, fc: null, fr: null,
        temp: null, sat: null, peso: null,
        alteredAt: { fr: "11:40" }  // solo keys alteradas; hora editable
      },
      glucometrias: [
        { value: 142, time: "08:00" }  // time opcional; default recordedAt HH:mm
      ],
      io: { ing: null, egr: null }
    }
  ],
  textoGuardado: {
    text: "",
    savedAt: "ISO-8601" | null
  }
}
```

### 3.3 Derivaciones

- **Snapshot (UI):** por cada campo núcleo, último valor no-null en `historial` ordenado por `recordedAt`.
- **Balance turno:** `ing - egr` del último registro con ambos presentes.
- **Balance global histórico:** Σ(`ing - egr`) sobre todos los registros con I/O completos, en orden cronológico.
- **Texto:** `buildEstadoActualText(estadoClinico, snapshot)` — mismas frases SOAP actuales; campos vacíos → `___`.

### 3.4 Alcance de modo

- **Sala:** pestaña visible; flujo principal de monitoreo.
- **Interconsulta:** pestaña oculta; modal SOAP clásico sin cambios funcionales en v1. Migración de código unifica helpers pero no expone panel.

---

## 4. UI del panel (pestaña Estado Actual)

Layout vertical (scroll único):

1. **Barra acciones:** Copiar · Guardar y copiar · meta “Guardado DD/MM HH:mm”
2. **Estado clínico general** (colapsable, cerrado por defecto)
   - Campos SOAP no graficables
   - Desplegables filtrados por categoría + texto libre
   - Badge “pendiente” en campos con propuesta de receta sin confirmar
   - Botones: Confirmar campo · Confirmar todo · Descartar propuesta
3. **Snapshot actual** (solo lectura): últimos SV, última glu, I/O turno, balance global
4. **Registrar medición** (formulario núcleo)
5. **Texto Estado Actual** (textarea pre-rellenado, editable antes de copiar)
6. **Tendencias** (sub-pestañas o acordeón):
   - Signos vitales
   - Glucometrías
   - Balance hídrico

### 4.1 Formulario núcleo

- Timestamp de registro: default ahora; editable
- SV: TA sist/diast, FC, FR, Temp, SatO₂, Peso
- Si SV fuera de rango → borde alerta + input hora (default hora del registro)
- Glucometrías: filas dinámicas (+ Agregar); valor + hora opcional
- I/O: ingresos cc, egresos cc; balance turno calculado en vivo
- Botón **Registrar** → append a `historial`, recalcular snapshot y texto

### 4.2 Historial reciente

Lista compacta bajo el formulario (últimas N entradas, p. ej. 8) con editar/eliminar.

---

## 5. Rangos de normalidad (SV alterados)

Valores adulto por defecto (configurables en `estado-actual-ranges.mjs`):

| Parámetro | Normal | Alterado si |
|---|---|---|
| TAS | 90–140 | <90 o >140 |
| TAD | 60–90 | <60 o >90 |
| FC | 60–100 | <60 o >100 |
| FR | 12–20 | <12 o >20 |
| Temp | 36.0–37.5 °C | <36 o >37.5 |
| SatO₂ | ≥94 % | <94 |

TA evalúa sistólica y diastólica por separado. Campo `alteredAt` solo para componentes alterados.

---

## 6. Gráficas

Reutilizar Chart.js (ya cargado para tendencias). Mínimo 2 puntos para mostrar línea.

### 6.1 Signos vitales

- Paneles por familia (como labs): Hemodinámico (TAS, TAD, FC), Respiratorio (FR, SatO₂), Metabólico (Temp, Peso)
- Eje X: timestamp de medición (o `alteredAt` si existe para ese parámetro en ese registro)
- Puntos alterados: color distinto / marcador

### 6.2 Glucometrías

- Serie única: cada `{ value, time }` es un punto
- Orden cronológico por fecha medición + hora glu

### 6.3 Balance hídrico (recomendado — opción 3 del mockup)

- Barras agrupadas: ingresos vs egresos por medición
- Línea verde: balance acumulado **24 h** (opcional fase 2; v1 puede omitir si complica)
- Línea azul discontinua: **balance global histórico**
- Leyenda clara: “Balance turno” vs “Balance global”

Mockup de referencia: `docs/superpowers/brainstorm-vitals/io-chart-options.html`

---

## 7. Integración Medicamentos

### 7.1 Flujo híbrido (confirmación)

1. Usuario marca checkbox **SOAP** en ítem de receta (comportamiento actual).
2. En lugar de abrir modal SOAP en Sala → escribe en `pendienteReceta[categoria]`.
3. Panel Estado Actual muestra badge en campo correspondiente.
4. Usuario **confirma** → copia a `estadoClinico`, `confirmado[categoria] = true`.
5. Nueva receta / desmarcar SOAP **no** modifica campos con `confirmado === true`.
6. Campos no confirmados siguen recibiendo propuestas actualizadas.

### 7.2 Desplegables filtrados

Por campo de estado clínico, `<select>` + opción texto libre:

| Campo | Categorías fuente |
|---|---|
| Antibióticos | `abx` (+ ítems `otros` opcionalmente incluibles) |
| Analgesia | `analgesia` |
| AntiHTA | `antihta` |
| Vasopresores | `vasop` |

Fuentes del desplegable:

1. Ítems activos de `medRecetaByPatient` clasificados
2. Entradas de catálogo expandido (`med-catalog` overlay + tokens)
3. Valor manual actual

### 7.3 Ampliación de catálogo

- Extender `classifyMedicationSoapCategory` y overlay de tokens documentado
- Añadir categorías futuras sin romper API: `sedacion`, `anticoag`, etc. (v1 mínimo: las cuatro SOAP actuales)
- Tests en `med-receta-core.test.mjs` para nuevos tokens

### 7.4 Cambio de copy en Medicamentos (Sala)

- Botón/acción “Volcar a SOAP” → **“Enviar a Estado Actual”**
- Destino: pestaña Estado Actual + propuestas pendientes (no modal)

---

## 8. Texto Estado Actual

- Generado al registrar medición, confirmar estado clínico, o editar campos relevantes
- Formato idéntico al `buildSOAPText()` actual (sin línea S:)
- Placeholders `___` para cualquier campo vacío en snapshot o estado clínico
- Textarea editable antes de copiar (cambios manuales no reescriben estructura hasta próximo auto-generate; opción “Regenerar” restaura template)
- **Guardar y copiar:** persiste `textoGuardado` + clipboard
- **Copiar:** solo clipboard

---

## 9. Migración completa (app-wide)

### 9.1 Datos (`storage.js` / carga de pacientes)

Al cargar paciente con `estadoActual` legacy:

```js
if (patient.estadoActual && !patient.monitoreo) {
  patient.monitoreo = {
    estadoClinico: { /* defaults vacíos */ },
    confirmado: {},
    pendienteReceta: {},
    historial: [],
    textoGuardado: {
      text: patient.estadoActual.text || "",
      savedAt: patient.estadoActual.savedAt || null
    }
  };
  delete patient.estadoActual;
}
```

- Migración idempotente en lectura (patrón existente en storage)
- Export/import JSON incluye `monitoreo`
- LAN sync: incluir `monitoreo` en payload de paciente (revisar `lan-patient-merge.mjs`)

### 9.2 Expediente tabs

- `CONSOLIDATED_TABS` Sala: insertar `estadoActual` entre `clinico` y `resultados`
- Mapa granular → consolidado: `estadoActual: { tab: 'estadoActual' }`
- Render pane `#exp-pane-estado-actual`
- Ocultar pestaña fuera de Sala

### 9.3 Código a retirar / redirigir

| Archivo / símbolo | Acción |
|---|---|
| `openEstadoActualModal()` en Sala | → navegar a pestaña + focus formulario |
| `data-estado-actual-mode` CSS | Eliminar tras retirar modal SOAP en Sala |
| `patient.estadoActual` | Eliminar post-migración |
| `mergeSoapMedField` + `openSOAPModalDirect` desde meds en Sala | → `estado-actual-meds.mjs` |
| `renderEstadoActualBar` | Leer `monitoreo.textoGuardado.savedAt` |
| Tour / help / settings-help | Actualizar copy y targets |
| Tests `tour-targets` | Apuntar a pestaña Estado Actual |

### 9.4 Qué no migra en v1

- Notas Interconsulta (`note.ta`, etc.) — permanecen independientes
- Modal SOAP Interconsulta — sin cambios
- Pase board: si muestra fragmento estado actual, leer `textoGuardado`

---

## 10. Errores y edge cases

| Caso | Comportamiento |
|---|---|
| Registro sin ningún valor núcleo | Toast error; no append |
| I/O solo ing o solo egr | Permitir guardar; balance turno parcial; global suma solo pares completos |
| Eliminar única medición | Snapshot vacío; texto con `___` |
| SatO₂ con soporte alto flujo | Rango fijo v1; fase 2: rango según soporte |
| Quota localStorage | `saveState` existente; toast si falla |
| Paciente sin receta | Desplegables solo catálogo + manual |

---

## 11. Testing

| Área | Tests |
|---|---|
| `estado-actual-data.mjs` | Derivación snapshot, balance turno, balance global, migración legacy |
| `estado-actual-ranges.mjs` | Detección alterado TA/FC/FR/temp/sat |
| `estado-actual-text.mjs` | Placeholders, formato SOAP, sin S: |
| `estado-actual-meds.mjs` | Propuesta, confirmación, no sobrescribir confirmado |
| `expediente-tabs.mjs` | Pestaña visible solo Sala |
| Integración | Registrar 2 mediciones → 2 puntos en gráfica SV |

---

## 12. Fuera de alcance v1

- Sincronización bidireccional con sistemas hospitalarios (Neo/SOME) para SV
- Rangos pediátricos / por servicio
- Balance acumulado 24 h con reinicio a medianoche (opcional fase 2)
- Panel Estado Actual en Interconsulta
- Export imagen de gráficas (patrón tendencias PNG — fase 2)

---

## 13. Orden de implementación sugerido

1. Modelo + migración + tests data
2. Pestaña expediente + panel estático
3. Formulario registro + historial CRUD
4. Snapshot + texto auto-generado
5. Gráficas SV / glu / I/O
6. Estado clínico colapsable + meds confirmación
7. Retirar legacy SOAP Estado Actual en Sala
8. Help, tour, LAN sync

---

## 14. Referencias

- Mockup visual: `docs/superpowers/brainstorm-vitals/io-chart-options.html`
- SOAP actual: `public/js/features/soap-estado.mjs`
- Medicamentos SOAP: `public/js/features/medications.mjs`, `med-receta-core.mjs`
- Tendencias: `public/js/tend-core.mjs`, `tend-group-modal.mjs`
- Expediente tabs: `public/js/expediente-tabs.mjs`
