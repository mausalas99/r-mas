# Perfil farmacoterapéutico histórico — Spec de diseño

**Fecha:** 2026-05-31  
**Mockup aprobado:** `docs/mockups/perfil-farmacoterapeutico-mockup.html` (v12 — tabla unificada SOME)  
**Referencias:** `docs/superpowers/specs/2026-05-02-medicamentos-receta-design.md`, `docs/superpowers/specs/2026-05-04-medicamentos-tendencias-design.md`

**Objetivo:** En la pestaña **Medicamentos**, ofrecer un **perfil farmacoterapéutico mensual** al estilo calendario SOME del hospital: indicación por día, adherencia (indicado vs no administrado), vista colapsada por medicamento y modal de mes completo en pantalla completa. La **Receta** diaria alimenta el perfil; el usuario corrige con marcas **no administrado** por celda.

**Fuera de scope (v1):** Exportar TSV SOME; sincronizar con expediente hospitalario; catálogo clínico nuevo; ML; segunda fuente distinta al pegado SOME mensual + merge desde Receta.

---

## 1. Contexto

R+ ya tiene **Receta actual** (`medRecetaByPatient`): pegado TSV de listado SOME → ítems con suspender, SOAP, copiar egreso, **+1 día** en ATB con `DIA#`. Eso es un **snapshot** del día, no un calendario mensual.

En planta se usa además la **matriz mensual** (una fila por medicamento, columnas 01–31, celdas violetas = indicado). El residente necesita:

- Ver el mes y qué días “pasaron” (administrados por defecto si hubo indicación).
- Marcar días **no administrados** sin confundir con “no indicado”.
- Estadísticas por fila (días efectivos vs no pasados) y filas con fallos visibles.

---

## 2. Usuario y éxito

| Dimensión | Decisión |
|-----------|----------|
| Usuario | Residente de sala con paciente activo en Medicamentos |
| Entrada principal | Pegado del **bloque SOME mensual** (misma familia TSV que Receta, formato matriz) |
| Entrada secundaria | Tras **Receta**, merge al mes vigente |
| Corrección | Clic en celda indicada → alternar **no administrado** |
| Vista rápida | Lista colapsada: medicamento + adherencia, Freq, Vía, botón **Días** |
| Vista completa | Modal pantalla completa, tabla unificada (mockup v12) |
| Primera victoria | Tras pegar mes SOME, ver calendario alineado y poder marcar un día no administrado |

---

## 3. Reglas de negocio

### 3.1 Indicado vs administrado

1. **Indicado** = celda con valor en el pegado SOME (`1` o `2` para doble indicación). Sin valor visible en UI (solo color violeta / badge `×2`).
2. **Administrado por defecto:** todo día **indicado** cuenta como **pasado** hasta que el usuario marque **no administrado** en esa celda.
3. **No administrado** = override por celda; no borra la indicación; estilo borde rojo (mockup).
4. **No indicado** = día sin marca en `days`; celda vacía; no entra en adherencia.

### 3.2 Adherencia por fila

- **Días indicados** = conteo de días con `days[d] > 0`.
- **Días efectivos** = indicados − no administrados marcados.
- **No pasados** = días indicados marcados no administrados.
- Texto en columna **Medicamento:** p. ej. `4 d efectivos · 1 no` (mockup).
- **Hover** en el resumen de adherencia: lista de días no pasados (`05, 12`).
- Fila con `missed > 0`: clase visual distinta (fondo/borde suave en lista y fila en grid).

### 3.3 Receta y relleno de huecos (v1)

1. Al pulsar **Receta** con éxito, además de sobrescribir `medRecetaByPatient`, se ejecuta **merge al perfil del mes** de `fechaActualizacion`:
   - Por cada ítem activo (no suspendido), resolver o crear fila en el perfil (clave estable, ver §4).
   - Marcar el **día calendario** de `fechaActualizacion` como **indicado** (`1`) si el medicamento sigue en receta.
   - Para cada fila, entre el **último día ya indicado** en ese mes y el día de la Receta (excluyendo días ya con indicación explícita del pegado mensual), rellenar días intermedios como **indicado + administrado** (sin `notAdmin`).
2. Si **no** hay nueva Receta pero avanza el día en el hospital, **no** se rellena automáticamente en v1 (evita suposiciones sin datos). El hueco se cierra en la **siguiente Receta** o al **repegar** el mes SOME.
3. El botón existente **+1 día** (`incrementMedDiaTratamiento`) sigue solo para `DIA#` en ítems de Receta; **no** sustituye el relleno del perfil en v1.
4. **v1.1 (opcional, no bloqueante):** botón «Avanzar día perfil» que aplica la misma regla de relleno que Receta usando la fecha local de hoy.

### 3.4 Pegado SOME mensual

1. Textarea dedicado en subvista **Perfil histórico** (o reutilizar área con modo claro «Pegar mes SOME»).
2. Parser detecta filas de medicamento + columnas día `01`…`31` (o hasta fin de mes).
3. **Sobrescribe** el mes objetivo del pegado (derivado de cabecera o selector de mes); conserva `notAdmin` solo si la misma `rowKey` existe y el día sigue indicado (política: **reemplazar `days` del pegado, fusionar `notAdmin` por intersección** día a día).
4. Toast con resumen: filas importadas, omitidas, mes aplicado.

### 3.5 UI (mockup v12)

| Elemento | Comportamiento |
|----------|----------------|
| Toggle | **Receta actual** \| **Perfil histórico** en cabecera de Medicamentos |
| Toolbar perfil | Filtro por categoría, «Último pegado», **Vista SOME (pantalla completa)**, navegación mes ‹ › |
| Lista | Columnas: Medicamento (nombre + adherencia + dosis), **Freq** (no «Horas»; `24H` no `Q24H`), Vía |
| Modal por med | Botón **Días** → calendario del medicamento |
| Modal mes | Tabla única `some-grid-unified`, `border-collapse: collapse`, meta sticky, encabezado días en **2 filas** (1–⌈n/2⌉, resto), **hoy** en amarillo |
| Celdas | Sin texto `0`/`1`; violeta = indicado; `×2` si valor 2 |

### 3.6 Persistencia y paciente

- Un documento por paciente: `medPharmProfileByPatient[patientId]`.
- Sin paciente activo: mensajes guía como Receta; sin mutar datos globales.
- Respaldo/import/LAN: misma política que `medRecetaByPatient` (excluir `demo-*` en persistencia local).

---

## 4. Modelo de datos

### 4.1 Paciente

```javascript
medPharmProfileByPatient[patientId] = {
  months: {
    "2026-05": {
      monthKey: "2026-05",       // YYYY-MM
      year: 2026,
      monthIndex: 4,             // 0-based
      daysInMonth: 31,
      lastSomePasteAt: "2026-05-31T12:00:00.000Z", // ISO opcional
      lastRecetaMergeDate: "31/05/2026",           // DD/MM/YYYY como Receta
      rows: [/* MedPharmRow */]
    }
  }
}
```

### 4.2 Fila `MedPharmRow`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rowKey` | string | `normalizeKey(med, dosis, freq, via)` estable para merge |
| `med` | string | Nombre SOME |
| `dosis` | string | Texto dosis |
| `freq` | string | Frecuencia cruda |
| `via` | string | Vía cruda |
| `cat` | string | Categoría para filtro (parser o catálogo) |
| `days` | `Record<string, 1\|2>` | Claves `"1"`…`"31"` |
| `notAdmin` | `Record<string, true>` | Solo días indicados |

### 4.3 Clave de fila

Normalizar: trim, mayúsculas en nombre, quitar espacios duplicados; incluir dosis/freq/vía para distinguir dos líneas del mismo fármaco (p. ej. dos CEFALOTINA con distinto `DIA#`).

---

## 5. Arquitectura técnica

| Módulo | Responsabilidad |
|--------|-----------------|
| `public/js/med-pharm-profile-core.mjs` | Parse SOME mensual, `mergeRecetaIntoMonth`, stats, `monthKey`/`splitAt`, tipos puros |
| `public/js/med-pharm-profile-core.test.mjs` | Tests dorados parse + merge + adherencia |
| `public/js/features/med-pharm-profile-panel.mjs` | Render lista, modales, handlers, CSS classes |
| `public/js/features/medications.mjs` | Toggle subvista, llamar merge tras `procesarRecetaMed` |
| `public/js/storage.js` | `rpc-medPharmProfileByPatient` |
| `public/js/app-state.mjs` | Estado + `replaceAppStateFromBackupData` |
| `public/js/features/platform.mjs`, `lan-sync.mjs` | Export/import/LAN |
| `public/css/` o bloque en CSS med existente | Estilos tabla unificada (extraer variables del mockup) |
| `public/partials/layout/app-body.html`, `public/index.html` | Markup subvista + modales |

**Referencia visual:** portar estructura DOM/ CSS de mockup v12 sin copiar datos demo.

---

## 6. Parser SOME mensual (criterios)

1. Entrada: líneas TSV; detectar fila cabecera con `01`, `02`, … o patrón día.
2. Filas datos: columna medicamento + columnas día en orden; valores `1`, `2`, vacío, `-`, `0` → normalizar a `days`.
3. Extraer **mes/año** de cabecera o primeras filas si existe; si no, usar mes del selector UI.
4. Filas inválidas: omitir + contador; no abortar todo el pegado.
5. Heurística `looksLikeSomePharmMonthPaste(raw)` para toast de error amigable (paralelo a `looksLikeSomeMedicationPaste`).

---

## 7. Pruebas

- Parse: fragmento TSV → `months["2026-05"].rows` con `days` esperados.
- Merge Receta: ítems receta + mes existente → día de fecha indicado + huecos rellenados.
- Adherencia: `adherenceStats(days, notAdmin)` → effective/missed/missedDays.
- Toggle `notAdmin` idempotente.
- Storage round-trip en `storage.test.mjs` o test dedicado mínimo.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Desalineación UI | Una sola `<table class="some-grid-unified">`; no dos tablas sincronizadas |
| Duplicar filas al merge Receta | `rowKey` estable; actualizar fila existente |
| Mes incorrecto al pegar | Selector mes visible; confirmación si pegado contradice selector |
| LAN desincronizado | Incluir clave en payload paciente como `medReceta` |

---

## 9. Autorrevisión del spec

- Mockup v12 aprobado por usuario; reglas indicado/administrado explícitas.
- Relleno de huecos v1 acotado a **Receta** (sin botón extra).
- Modelo y módulos nombrados; sin placeholders en reglas críticas.
- Fuera de scope export TSV documentado.

---

## 10. Próximo paso

Plan de implementación: `docs/superpowers/plans/2026-05-31-perfil-farmacoterapeutico.md` (skill **writing-plans**).
