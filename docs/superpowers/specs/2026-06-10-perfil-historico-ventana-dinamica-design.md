# Perfil histórico — ventana dinámica y filas continuas

**Fecha:** 2026-06-10  
**Estado:** Aprobado  
**Base:** `docs/superpowers/specs/2026-05-31-perfil-farmacoterapeutico-design.md`  
**Módulos:** `med-pharm-profile-core.mjs`, `med-pharm-profile-panel.mjs`, `med-pharm-view-window.mjs` (nuevo)

---

## 1. Problema

El perfil farmacoterapéutico guarda y muestra datos **por mes calendario** (`YYYY-MM`). Para pacientes internados que cruzan fin de mes:

- No se puede ver en una sola grilla la cola de mayo y el inicio de junio.
- Medicamentos que continúan del mes anterior no aparecen como fila continua en el mes nuevo hasta pegado SOME o Receta.
- La grilla SOME fija 1–31 deja muchas columnas vacías (días futuros o previos al ingreso).

Además, los botones flotantes **Copiar** de Laboratorio y Estado actual (`lab-copy-fab`, `ea-copy-fab`) permanecen visibles al cambiar de pestaña aunque no haya contenido copiable en la vista actual.

---

## 2. Objetivo

1. **Ventana dinámica de columnas** anclada al mes en navegación, con solape automático cerca de fin/inicio de mes y sin días vacíos innecesarios.
2. **Filas continuas** por `rowKey` que cruzan meses en la vista (persistencia sigue por mes).
3. **Mes pasado:** solo días con indicación, acotados por `fimiFecha` y fin de mes calendario.
4. **Fix FAB Copiar:** visible solo en pestaña y contexto con contenido copiable.

**Fuera de scope:** cambio de schema SQLCipher; export TSV SOME; sustituir pegado mensual.

---

## 3. Decisiones de producto (acordadas)

| Tema | Decisión |
|------|----------|
| Rango en mes **actual** | Mes calendario + solape dinámico (opción C) |
| Medicamentos cross-mes | Fila continua unificada por `rowKey` (opción A) |
| Mitad de mes actual | Sin mes anterior; columnas `1 … hoy` |
| Inicio de mes actual | Cola del mes anterior solo si hay `rowKey` con indicación en ambos meses |
| Mes **pasado** en navegación | Primer día con indicación → último con indicación; piso = `fimiFecha`; techo = último día del mes (opción B) |
| Sin `fimiFecha` | Piso = primer día con indicación en ese mes |
| Días futuros en mes actual | Nunca mostrar columnas después de `hoy` |

**Umbral mitad de mes:** `OVERLAP_CUTOFF_DAY = 14` (constante en core, ajustable en un solo lugar).

**Ejemplo:** ATB 20 may – 10 jun, visto el 5 jun → `20…31 may | 01…05 jun`. Visto el 15 jun → `01…15 jun`. En ‹ Mayo › (pasado) con ingreso 22 may → `22…31 may`.

---

## 4. Modelo de ventana (capa de vista)

### 4.1 Columna

```javascript
/** @typedef {{ year: number, monthIndex: number, day: number, monthKey: string }} PharmViewColumn */
```

### 4.2 Resultado `PharmViewWindow`

```javascript
{
  columns: PharmViewColumn[],  // orden cronológico
  splitAt: number,             // splitMonthAt(columns.length) para encabezado 2 filas
  viewYear: number,
  viewMonthIndex: number,
  isCurrentMonth: boolean,
  label: string                // ej. "Junio 2026" o "28 may – 5 jun 2026"
}
```

### 4.3 Fila unificada `PharmViewRow`

Misma forma que `MedPharmRow` para render, más metadatos de lectura:

```javascript
{
  rowKey, med, dosis, freq, via, cat, catOverride, hidden,
  // getters vía funciones puras, no almacenar days duplicados:
  // getCellValue(column) → 0 | 1 | 2
  // getNotAdmin(column) → boolean
}
```

Implementación recomendada: funciones `cellValueForColumn(profile, rowKey, column)` y `toggleNotAdminAtColumn(profile, rowKey, column)` que resuelven el bucket `months[monthKey].rows`.

---

## 5. Algoritmo `buildPharmViewWindow`

**Entradas:** `profile`, `viewYear`, `viewMonthIndex`, `today` (`{year, monthIndex, day}`), `fimiFecha` (ISO `YYYY-MM-DD` o vacío).

### 5.1 Mes actual (`viewYear/viewMonthIndex === today`)

1. `endDay = today.day`.
2. Si `today.day >= OVERLAP_CUTOFF_DAY`:
   - `columns = days 1..endDay` del mes en vista.
3. Si `today.day < OVERLAP_CUTOFF_DAY`:
   - `continuingKeys` = `rowKey` con indicación en mes anterior **y** en mes actual (días 1..endDay).
   - Si `continuingKeys` vacío: `columns = 1..endDay` del mes actual.
   - Si no: `prevStart` = mínimo día indicado en mes anterior entre filas en `continuingKeys`; respetar piso `fimiFecha` si cae en mes anterior.
   - `columns = [prevStart..prevEnd]` del mes anterior + `[1..endDay]` del mes actual.

### 5.2 Mes pasado (`view` anterior a mes de `today`)

1. Recolectar todos los días indicados en `months[viewMonthKey].rows`.
2. Si ninguno: ventana vacía (UI estado vacío existente).
3. `first = min(indicatedDays)`, `last = max(indicatedDays)`.
4. Si `fimiFecha` en el mismo mes: `first = max(first, fimiDay)`.
5. Si `fimiFecha` posterior al mes en vista: ventana vacía o mensaje guía (ingreso posterior).
6. `columns = first..last` (≤ último día del mes calendario).

### 5.3 Mes futuro

Ventana vacía; sin columnas.

### 5.4 `unifyRowsForWindow`

- Unión de `rowKey` presentes en cualquier mes tocado por `columns`.
- Orden: nombre medicamento (locale `es`), luego `rowKey`.
- Categoría/filtro: usar datos del mes en vista como primario; fallback al otro mes.

---

## 6. UI

### 6.1 Grilla SOME (`buildSomeGridTable`)

- Sustituir iteración `1..daysInMonth` por `window.columns`.
- Encabezado día: `DD`; en primer día de cada bloque mensual, clase `day-hdr-month` con abreviatura (`May`, `Jun`).
- `today-col` si columna coincide con `today`.
- `data-year`, `data-month`, `data-day` en celdas para `onGridDayClick`.
- `splitAt` desde `window.splitAt`, no `month.daysInMonth`.

### 6.2 Lista resumen y adherencia

- `adherenceDayDetail` y stats sobre `columns` visibles, no 1..31.
- Etiqueta mes navegación: `window.label` cuando hay solape; si no, `Mes Año` actual.

### 6.3 Modal pantalla completa y modal por medicamento

Misma ventana que lista.

### 6.4 `fimiFecha`

Panel obtiene paciente activo vía `patients` en runtime (`getPatientFimiFecha(patientId)` en core o panel).

---

## 7. Persistencia

Sin cambios en `medPharmProfileByPatient.months`. LAN/backup/import siguen igual.

---

## 8. Fix FAB Copiar huérfano

En `switchAppTab` (`pase-board.mjs`):

```javascript
syncLabCopyFab(tab === 'lab' && labOutputHasCopyableContent());
syncEaCopyFab(tab === 'nota' && activeInner === 'estadoActual' && eaHasCopyableContent());
```

Extraer helpers en `lab-panel.mjs` / `estado-actual-panel.mjs`:

- `labOutputHasCopyableContent()` → `activeLab?.resLabs?.length > 0` y sección visible.
- `eaHasCopyableContent()` → paciente activo y texto EA no vacío.

Llamar también al cambiar subvista Manejo (`setMedSubview('perfil')`) por simetría (FABs no aplican a Manejo, pero sí ocultar si salimos de EA/lab).

---

## 9. Arquitectura de archivos

| Archivo | Rol |
|---------|-----|
| `public/js/med-pharm-view-window.mjs` | `buildPharmViewWindow`, `unifyRowsForWindow`, `cellValueAtColumn`, `toggleNotAdminAtColumn`, `parseFimiFecha` |
| `public/js/med-pharm-view-window.test.mjs` | Tests ventana + unificación + escritura |
| `public/js/features/med-pharm-profile-panel.mjs` | Consumir ventana; grilla multi-mes; clic con columna |
| `public/css/med-pharm-profile.css` | Estilo `day-hdr-month` |
| `public/js/features/pase-board.mjs` | Sync FAB al cambiar pestaña |
| `public/js/features/lab-panel.mjs` | `labOutputHasCopyableContent` |
| `public/js/features/estado-actual-panel.mjs` | `eaHasCopyableContent` |

---

## 10. Pruebas

### Unitarias (`med-pharm-view-window.test.mjs`)

- Mes actual día 5 con cruce may→jun (columnas 20–31 + 1–5).
- Mes actual día 15 sin may (1–15).
- Mes pasado mayo ingreso 22, indicación 22–31.
- `fimiFecha` eleva piso en mes pasado.
- `toggleNotAdminAtColumn` escribe en bucket correcto.
- Ventana vacía mes futuro.

### Manual

- Perfil histórico fin/inicio de mes; modal SOME; marcar no administrado en celda de mes anterior desde vista de junio.
- Cambiar Lab → Manejo → Nota: FAB no visible fuera de contexto.

---

## 11. Criterios de aceptación

1. Internado con ATB cross-mes ve fila continua sin cambiar manualmente a ‹ mes anterior › cuando `hoy < 14`.
2. A mitad de mes solo se ven días 1–hoy del mes actual (sin colas ni futuros vacíos).
3. Navegar a mayo pasado muestra solo días con indicación desde ingreso.
4. Pegado SOME y Receta por mes siguen funcionando; LAN sin regresión.
5. FAB Copiar no aparece en pestañas sin contenido copiable.

---

## 12. Referencias

- Spec v1: `docs/superpowers/specs/2026-05-31-perfil-farmacoterapeutico-design.md`
- Plan: `docs/superpowers/plans/2026-06-10-perfil-historico-ventana-dinamica.md`
