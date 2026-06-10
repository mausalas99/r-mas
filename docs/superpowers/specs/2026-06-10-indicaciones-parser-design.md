# Pestaña Indicaciones — parser SOME ampliado (meds + dietas)

**Fecha:** 2026-06-10  
**Objetivo:** Renombrar la pestaña **Medicamentos** a **Indicaciones**, ampliar el parser TSV del hospital para incluir `MEDICAMENTOS`, `MEDICAMENTOS P2` y `DIETAS` (excluyendo `CUIDADOS` y `ESTUDIOS`), con autodetección máxima y volcado híbrido a Estado Actual.  
**Enfoque elegido:** Extensión mínima del núcleo existente (`med-receta-core.mjs` + `medications.mjs`).  
**Fuera de scope:** Procesamiento de `ESTUDIOS`, `CUIDADOS`, `INTERCONSULTAS`; cambios al módulo Expediente → Indicaciones (modo interconsultas).

---

## 1. Contexto

La pestaña actual **Medicamentos** (`public/js/features/medications.mjs`, núcleo `public/js/med-receta-core.mjs`) parsea pegados TSV desde SOME y solo acepta filas con `Clase = MEDICAMENTOS`. El usuario pega un bloque más amplio que incluye cuidados de enfermería, dietas, estudios y medicamentos.

Estado Actual (`estado-actual-panel.mjs`, `estado-actual-meds.mjs`) ya tiene:

- Campos medicamentos SOAP (`analgesia`, `abx`, `antihta`, `diureticos`, `vasop`, `nm`) con flujo **propuesta → confirmar**.
- Campos dieta (`dieta`, `kcal`, `kcalKg`) en `estadoClinico`, pero **sin alimentación desde el parser**. Falta **`proteinG`** (gramos de proteína/día); se agrega en esta iteración.

La subpestaña **Indicaciones** del Expediente es para modo interconsultas; no hay conflicto de nombres al renombrar la pestaña de app.

---

## 2. Decisiones de producto (validadas)

| Tema | Decisión |
|------|----------|
| Tipos a parsear | `MEDICAMENTOS`, `MEDICAMENTOS P2`, `DIETAS` |
| Excluir | `CUIDADOS`, `ESTUDIOS` (ignorar silenciosamente por ahora) |
| Nombre pestaña app | **Indicaciones** |
| Dieta → EA | Propuesta pendiente en `pendienteReceta` (`dieta`, `kcal`, `proteinG`); confirmar en EA |
| Medicamentos → EA | SOAP pre-marcado (autodetección C) + volcado manual («Llevar a Estado Actual») |
| Copiar / egreso | Solo medicamentos activos (sin dieta en texto de egreso) |
| ESTUDIOS | No procesar en esta iteración |

---

## 3. Parser

### 3.1 API nueva

Añadir en `med-receta-core.mjs` (mantener `parseMedicationPaste` como wrapper retrocompatible o delegar):

```js
parseIndicacionesPaste(text) → {
  items: MedItem[],      // medicamentos (MEDICAMENTOS + MEDICAMENTOS P2)
  dietas: DietaItem[],
  fechas: string[],
  skipped: number,
  skippedSummary?: { cuidados: number, estudios: number, other: number }
}
```

```js
looksLikeSomeIndicacionesPaste(text) → boolean
```

`looksLikeSomeMedicationPaste` puede delegar a la nueva función o quedar como alias.

### 3.2 Reglas de fila

- Entrada: líneas no vacías, separador **tabulador**, mínimo **7 columnas**.
- Columnas SOME: `FechaHora | Clase | Descripción | Via | Dosis | Frecuencia | St`.
- Filas inválidas (`cols.length < 7`): incrementar `skipped`, continuar sin bloquear el lote.

| Clase (col. 1, upper) | Resultado |
|------------------------|-----------|
| `MEDICAMENTOS` | `MedItem` con `tipoRaw: 'MEDICAMENTOS'` |
| `MEDICAMENTOS P2` | `MedItem` con `tipoRaw: 'MEDICAMENTOS P2'` (mismo shape que med) |
| `DIETAS` | `DietaItem` |
| `CUIDADOS` | `skipped`; contador `skippedSummary.cuidados` |
| `ESTUDIOS` | `skipped`; contador `skippedSummary.estudios` |
| Otro | `skipped`; contador `skippedSummary.other` |

### 3.3 MedItem (sin cambio estructural)

Igual que hoy: `id`, `nombreRaw`, `viaRaw`, `dosisRaw`, `frecuenciaRaw`, `suspendido`, `diaTratamiento`, más `tipoRaw` opcional.

Lógica `DIA#`, `fecha` y generación de egreso/SOAP: sin cambios.

### 3.4 DietaItem

```js
{
  id: string,
  descripcionRaw: string,   // col. Descripción
  detalleRaw: string,       // col. Dosis / indicaciones nutricionales
  kcal: number | null,      // extraído de detalleRaw
  proteinG: number | null,  // extraído de detalleRaw → volcado a EA como proteinG
  suspendido: false         // reservado; dietas no son suspendibles en UI v1
}
```

**Extracción numérica** (sobre `detalleRaw`, case-insensitive, normalizar acentos):

- `kcal`: `/(\d+)\s*KCAL\b/`
- `proteinG`: `/(\d+)\s*G(?:R)?\s*(?:DE\s+)?PROTE[IÍ]NA\b/` — acepta `70 G DE PROTEINA`, `70 GR PROTEINA`, etc.

**Ejemplos validados:**

| detalleRaw | kcal | proteinG |
|------------|------|----------|
| `1500 KCAL + 70 G DE PROTEINA` | 1500 | 70 |
| `2000 KCAL + 70 GR PROTEINA` | 2000 | 70 |

### 3.5 Múltiples filas DIETAS

- Concatenar `descripcionRaw` con ` · ` (orden de aparición en el pegado).
- `kcal` / `proteinG`: tomar de la **última** fila DIETAS que contenga el patrón correspondiente.
- `detalleRaw` en propuesta: incluir resumen legible si hay kcal/proteína.

### 3.6 Detección de pegado

`looksLikeSomeIndicacionesPaste`: requiere `\t` en el texto y al menos una fila con clase `MEDICAMENTOS`, `MEDICAMENTOS P2` o `DIETAS`.

---

## 4. Flujo al pulsar Receta

1. `parseIndicacionesPaste(pasteRaw)` → persistir en `medRecetaByPatient[patientId]`:
   - `{ items, dietas, fechaActualizacion, pasteRaw }` — **sobrescribe** el bloque completo (igual que hoy).
   - `fechaActualizacion`: `resolveFechaActualizacion(fechas)` sobre todas las filas aceptadas.

2. **Autoselección SOAP** (`medNotaSelectionByPatient[patientId]`):
   - Para cada `MedItem` no suspendido, pre-marcar checkbox SOAP si `shouldAutoSelectSoap(item)`:
     - `classifyMedicationSoapCategory(nombreRaw) !== 'otros'`, **o**
     - Reglas extra (nombre + dosis + frecuencia concatenados, normalizado upper):
       - `/\bINSULINA\b/`, `/\b(GLARGINA|DEGLUDEC|DETEMIR|HUMANA\s+RAPIDA|NPH)\b/`
       - `/\bDEXTROSA\s*50\b/`
       - Vasopresores ya cubiertos por clasificador; reforzar en dosis si aplica
       - `frecuenciaRaw` contiene `PRN` **y** dosis contiene criterio glucémico (`DESTROXTIS`, `GLUCOSA`, `GLUC\s*<`, `MG/DL`)
   - El usuario puede desmarcar antes de volcar.

3. **Propuesta dieta** (solo si hay paciente activo y al menos una fila DIETAS):
   - `ensureMonitoreo(patient)`
   - Si `monitoreo.confirmado.dieta` es true: **no** sobrescribir `estadoClinico.dieta`; igualmente mostrar propuesta en `pendienteReceta` para revisión.
   - `pendienteReceta.dieta` = texto compuesto, p. ej. `NORMAL PICADA ALTA EN FIBRA (2000 kcal, 70 g prot)`.
   - `pendienteReceta.kcal` = string del kcal detectado si existe.
   - `pendienteReceta.proteinG` = string de gramos de proteína si existe (p. ej. `"70"`).
   - No modificar `estadoClinico` hasta confirmación.

4. **Medicamentos → EA:** sin cambio de botón — `mediLlevarASOAP()` con ítems SOAP marcados.

5. **Copiar:** `buildMedRecetaCopyText(items)` — solo meds; dietas no incluidas.

6. Toast resumen: «N medicamentos · M dieta(s) · X omitidos (cuidados/estudios)».

---

## 5. UI

### 5.1 Renombrado visible

Actualizar copy de usuario (no obligatorio renombrar archivos internos en v1):

- Pestaña app: `Medicamentos` → `Indicaciones` (`app-body.html`, `index.html`, `chrome.mjs` i18n `appTab.med`, empty state, pase board section title).
- Referencias de ayuda/tour donde digan «pestaña Medicamentos» en contexto de pegado SOME → «Indicaciones».
- **No** renombrar strings de Expediente interconsultas ni VPO en esta iteración salvo toast «Procesa la receta en Indicaciones primero» si el copy actual lo menciona.

### 5.2 Panel tras Receta

- **Tarjeta Dieta detectada** (si `dietas.length`): solo lectura, muestra descripción + kcal/proteína parseados.
- **Lista medicamentos:** columnas Excl. / SOAP / Medicamento / Día (SOAP pre-marcado).
- **Resumen omitidos:** línea bajo el textarea o tras Receta con conteo de cuidados/estudios/otros.

### 5.3 Estado Actual — campo proteína y confirmación dieta

**Nuevo campo en `emptyEstadoClinico()`:**

```js
proteinG: '',  // gramos de proteína/día (número como string, igual que kcal)
```

Actualizar `buildEaMonitoreoRevision`, migración de monitoreo y `pendienteReceta` / `confirmado` para incluir `proteinG`.

**Grid EA (junto a Dieta / Kcal/kg / Kcal total):**

- Label **Proteína (g/día)** — input numérico `data-ea-ec="proteinG"`.
- Badge «Propuesta» si `pendienteReceta.proteinG` no vacío y difiere del valor confirmado.

**Confirmación (paquete dieta):**

- `hasPendingEaProposals(pendienteReceta)`: incluir `dieta`, `kcal`, `proteinG` además de `MED_FIELD_KEYS`.
- Generalizar `confirmMedField` → `confirmEaField(monitoreo, key)` para claves de `emptyEstadoClinico()`.
- Confirmar **dieta** aplica el paquete nutricional pendiente:
  - `pendienteReceta.dieta` → `estadoClinico.dieta`
  - `pendienteReceta.kcal` → `estadoClinico.kcal` (si existe)
  - `pendienteReceta.proteinG` → `estadoClinico.proteinG` (si existe)
  - Limpiar las tres claves en `pendienteReceta`.
- `confirmAllEaProposals` incluye dieta + kcal + proteinG pendientes.

**Texto Estado Actual (`estado-actual-text.mjs`):**

Cuando `proteinG` tiene valor, insertar en la cláusula NM/dieta (después del bloque kcal):

`DIETA {dieta} CALCULADA A {kcalKg} KCAL/KG ({kcal} KCAL) + {proteinG} GR PROTEINA PARA PESO DE {peso} KG`

Si `proteinG` está vacío, mantener la redacción actual sin el segmento `+ … GR PROTEINA`.

---

## 6. Modelo de datos

`medRecetaByPatient[patientId]` pasa de:

```js
{ fechaActualizacion, items[], pasteRaw? }
```

a:

```js
{ fechaActualizacion, items[], dietas[], pasteRaw? }
```

Migración: lecturas toleran `dietas` ausente → `[]`.

---

## 7. Pruebas unitarias (`med-receta-core.test.mjs`)

1. Pegado de ejemplo del usuario: cuenta correcta de meds, 1 dieta, cuidados/estudios skipped.
2. `MEDICAMENTOS P2` parseado igual que `MEDICAMENTOS`.
3. Extracción `kcal` y `proteinG` desde `2000 KCAL + 70 GR PROTEINA` (y variante `70 G DE PROTEINA`).
4. `shouldAutoSelectSoap`: MEROPENEM ✓, INSULINA GLARGINA ✓, DEXTROSA 50 PRN ✓, SULFATO DE MAGNESIO según reglas (otros sin extra → no pre-marcar).
5. `looksLikeSomeIndicacionesPaste` true con solo fila DIETAS; false sin tabs.
6. `parseMedicationPaste` retrocompatible (delega o mismo resultado para filas MEDICAMENTOS).

Pruebas EA (`estado-actual-meds.test.mjs`, `estado-actual-text.test.mjs`): confirmar propuesta dieta copia `dieta`, `kcal` y `proteinG` a `estadoClinico`; texto EA incluye `+ 70 GR PROTEINA`.

---

## 8. Deuda / límites conocidos

- ESTUDIOS quedan para iteración futura; el contador en UI prepara expectativa sin prometer volcado.
- Archivos `med-receta-*` conservan nombre legacy; renombrar módulo es opcional post-entrega.
- Ítems clasificados como `otros` no se pre-marcan SOAP salvo reglas extra explícitas (p. ej. DEXTROSA PRN).

---

## 9. Autorrevisión del spec

- [x] Sin placeholders TBD en reglas críticas.
- [x] Alcance acotado: meds + dietas; estudios explícitamente fuera.
- [x] Consistente: dieta usa propuesta pendiente; meds usan SOAP manual con pre-marcado.
- [x] Retrocompatibilidad: `parseMedicationPaste` y copiar egreso sin ruptura.
- [x] Un solo bloque por paciente, sobrescritura en Receta — alineado con spec 2026-05-02.

---

## 10. Próximo paso

Tras revisión del usuario: plan de implementación (`writing-plans`) en `docs/superpowers/plans/2026-06-10-indicaciones-parser.md`.
