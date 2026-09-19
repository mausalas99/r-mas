# Auto-ingesta a historial al procesar (paciente activo) — Spec de diseno

**Fecha:** 2026-05-01  
**Objetivo:** Que procesar un reporte agregue automaticamente el set al historial de labs solo cuando hay paciente activo, para alimentar Tendencias sin depender de "Enviar a nota".  
**Scope:** Flujo de Laboratorio (`procesarReporte`), `labHistory`, Tendencias, panel de historial.  
**Fuera de scope:** Rediseno de UI, cambios de formato de nota clinica, migraciones masivas de datos.

---

## 1. Problema actual

Hoy, las Tendencias dependen de que el usuario pulse "Enviar a nota".  
Aunque el reporte ya fue procesado, si no se envia a nota el set no entra a `labHistory`, por lo que:

- no aparece en historial de labs;
- no aporta puntos a Tendencias;
- se pierde consistencia entre "procesado" y "disponible para seguimiento".

Se requiere que el procesamiento por si solo alimente historial/tendencias, pero unicamente para el paciente activo.

---

## 2. Reglas de negocio validadas

1. Si se procesa un reporte y existe `activeId`, el set debe guardarse en `labHistory[activeId]`.
2. Si no hay paciente activo, no debe guardarse nada en historial.
3. `Enviar a nota` mantiene su semantica: actualizar `notes[activeId].estudios` de forma explicita.
4. El auto-guardado no debe introducir duplicados inmediatos por reprocesar el mismo reporte.
5. El orden cronologico descendente ya definido para historial/tendencias debe conservarse.

---

## 3. Enfoque elegido

Se implementa **auto-guardado al procesar + deduplicacion inmediata contra el ultimo set**.

Razon:

- Es el cambio minimo que cumple el objetivo clinico.
- Evita ruido en Tendencias por reprocesamiento accidental.
- Conserva clara separacion de responsabilidades:
  - `Procesar`: registrar resultado para seguimiento (historial/tendencias).
  - `Enviar a nota`: insertar bloque clinico en expediente (`estudios`).

---

## 4. Arquitectura de cambios

### 4.1 Punto de insercion

En `procesarReporte()`, despues de:

1. `renderOutput(result)`
2. `renderDiagramas(result.resLabs)`

se invoca un helper de auto-ingesta.

### 4.2 Nuevo helper de flujo

Crear `autoStoreProcessedLabResult(result)` con este comportamiento:

1. Guard clause si `!activeId`.
2. Guard clause si no hay `result.resLabs` o esta vacio.
3. Obtener `fecha` desde `result.patient.fecha` (si existe) para normalizacion en `pushLabHistory`.
4. Verificar deduplicacion inmediata (seccion 4.3).
5. Si no es duplicado:
   - `pushLabHistory(activeId, result.resLabs, fecha, '')`
   - `saveState()`
   - `renderLabHistoryPanel()`
   - si pestaña de tendencias esta activa, `renderTendencias()`.
6. Si es duplicado:
   - no insertar;
   - mostrar toast informativo no disruptivo.

### 4.3 Helper de deduplicacion

Crear `isDuplicateLatestLabSet(patientId, resLabs, fecha, hora)`:

- Compara solo contra el ultimo set del paciente (deduplicacion inmediata).
- Igualdad requerida:
  - `fecha` normalizada igual;
  - `hora` normalizada igual;
  - `resLabs` equivalente linea por linea tras `trim` y limpieza basica de espacios.

Si coincide todo, se considera duplicado.

### 4.4 Superficies que no cambian

- No modificar `checkStudiosAndInsertLabs()` ni `rebuildEstudiosFromLabHistory()`.
- No cambiar modal de conflicto de labs.
- No cambiar reglas de ordenamiento descendente existentes.

---

## 5. Flujo de datos objetivo

1. Usuario pega y procesa reporte.
2. Parser produce `result` (`patient`, `resLabs`).
3. UI muestra salida y diagramas.
4. Si hay paciente activo:
   - se intenta auto-ingesta en `labHistory` (con deduplicacion).
5. Si hay insercion:
   - estado se persiste;
   - historial/tendencias se refrescan.
6. Si despues usuario pulsa "Enviar a nota":
   - se mantiene flujo actual para `estudios`.

---

## 6. Compatibilidad y riesgos

### 6.1 Compatibilidad

- Compatible con estructura actual de `labHistory`.
- Reutiliza normalizacion existente (`normalizeFechaLabHistory`, `normalizeHoraLabHistory`).
- No exige migracion de datos previos.

### 6.2 Riesgos y mitigacion

- **Riesgo:** duplicados al reprocesar mismo reporte.
  - **Mitigacion:** deduplicacion inmediata contra ultimo set.
- **Riesgo:** confusion entre "procesar" y "enviar a nota".
  - **Mitigacion:** mantener semanticas separadas y mensajes toast claros.
- **Riesgo:** refrescos de UI costosos.
  - **Mitigacion:** refrescar Tendencias solo cuando su tab este activa (patron existente).

---

## 7. Criterios de aceptacion

- [ ] Procesar con paciente activo agrega set a historial sin pulsar "Enviar a nota".
- [ ] Procesar sin paciente activo no agrega historial.
- [ ] Tendencias usa el set auto-guardado cuando aplique (>=2 puntos por parametro).
- [ ] Reprocesar el mismo reporte de inmediato no duplica el ultimo set.
- [ ] "Enviar a nota" sigue siendo necesario para escribir `estudios`.
- [ ] Orden descendente de historial/tendencias se mantiene.

---

## 8. Pruebas manuales minimas

1. Seleccionar paciente A, procesar reporte valido:
   - Ver nuevo set en panel historial.
2. Ir a Tendencias de paciente A con al menos otro set previo:
   - Ver punto nuevo en graficas.
3. Reprocesar exactamente el mismo texto:
   - No crear set adicional.
4. Quitar seleccion de paciente (o iniciar sin `activeId`) y procesar:
   - No agregar historial.
5. Pulsar "Enviar a nota" tras procesar:
   - Confirmar actualizacion de `estudios` sin romper historial/tendencias.

---

## 9. Implementacion propuesta (alto nivel)

1. Agregar helpers:
   - `isDuplicateLatestLabSet(...)`
   - `autoStoreProcessedLabResult(result)`
2. Integrar `autoStoreProcessedLabResult(result)` en `procesarReporte()`.
3. Verificar toasts y refrescos UI.
4. Ejecutar pruebas manuales de seccion 8.
