# Orden Descendente de Labs en Nota + Historial + Tendencias — Spec de diseno

**Fecha:** 2026-04-24
**Objetivo:** Consistencia total de orden cronologico en labs
**Scope:** Nota de evolucion (`estudios`), Historial de labs, Tendencias

---

## 1. Problema actual

Hoy existen flujos donde los sets de laboratorio pueden quedar en orden ascendente o depender del orden de captura, lo que rompe la expectativa clinica de ver primero lo mas reciente.

Caso reportado:
- Existen labs de `18/03` y `22/04`.
- Se capturan retrospectivamente labs de `31/03`.
- El resultado esperado es: `22/04`, `31/03`, `18/03` (descendente por fecha).

Actualmente, el comportamiento no es consistente en todas las vistas porque:
- El historial se ordena cronologicamente ascendente.
- La nota puede usar una logica de insercion por bloques fijos.
- Tendencias puede consumir orden distinto al de la nota/historial.

---

## 2. Reglas de negocio validadas

1. El orden global debe ser **descendente por fecha** (mas reciente arriba).
2. Si hay misma fecha, desempatar por **hora descendente**.
3. Si no hay hora en ambos sets, mantener orden de captura como desempate final.
4. Si la fecha llega como `dd/mm` sin anio, asumir **anio actual**.
5. Fechas no parseables no deben romper la app; se muestran al final.
6. `Anterior` se mantiene como caso especial legacy y se coloca al fondo.
7. La regla debe aplicarse de forma consistente en:
   - `nota de evolucion` (campo `estudios`)
   - panel de historial de labs
   - tendencias

---

## 3. Enfoque elegido

Se adopta el enfoque recomendado de **fuente unica desde `labHistory`**:

- `labHistory` es la fuente canonica de sets de laboratorio.
- Se implementa/usa un unico comparador de orden temporal descendente.
- Nota, historial y tendencias consumen ese mismo orden.
- Se evita que cada vista tenga logica propia de ordenamiento.

Razon:
- Minimiza divergencias.
- Facilita mantenimiento.
- Reduce errores al capturar labs retrospectivos.

---

## 4. Arquitectura de cambios

### 4.1 Ordenador unico

Definir (o ajustar) una sola funcion para ordenar sets de `labHistory`:
- Entrada: array de sets `{ fecha, hora, id, ... }`
- Salida: copia ordenada descendente por timestamp y desempates estables.

El comparador debe:
1. Parsear fecha/hora a milisegundos.
2. Ordenar por timestamp descendente.
3. Si empate, desempatar por hora (ya incluida en timestamp).
4. Si sigue empate/falta hora, usar orden de captura (id/indice) para estabilidad.

### 4.2 Normalizacion de fecha y hora en entrada

En `pushLabHistory(...)`:
- Normalizar fecha al guardar (`dd/mm/yyyy`).
- Si llega `dd/mm`, completar anio actual.
- Normalizar hora recortando a formato consistente (`HH:mm[:ss]` aceptado para parse).
- No guardar sets vacios.

### 4.3 Historial de labs

`renderLabHistoryPanel()` debe:
- Obtener historial parseado/normalizado.
- Consumir exclusivamente el ordenador descendente unico.
- Mostrar metadatos con fecha normalizada sin alterar la logica visual existente.

### 4.4 Tendencias

`renderTendencias()` y helpers asociados deben:
- Consumir los sets en el mismo orden descendente.
- Mantener integridad de series/labels sin alterar calculos clinicos.

### 4.5 Nota de evolucion (`estudios`)

Al enviar labs:
1. Guardar set en `labHistory`.
2. Reordenar con comparador unico descendente.
3. Regenerar bloque de labs para `notes[activeId].estudios` desde historial ordenado.

Importante:
- Evitar dependencia de "slots fijos" (`lineas 3/5/6`) para mezclar anterior/reciente.
- Priorizar una proyeccion deterministica desde fuente canonica.

---

## 5. Flujo de datos objetivo

1. Usuario procesa y envia un reporte.
2. `pushLabHistory` guarda set normalizado.
3. Se obtiene historial ordenado descendente.
4. Se reconstruye `estudios` con ese orden.
5. Se persiste `saveState`.
6. Se refrescan historial y tendencias.

Resultado: cualquier insercion retrospectiva queda en su posicion temporal correcta automaticamente.

---

## 6. Manejo de compatibilidad y errores

### 6.1 Compatibilidad con datos existentes

- Historiales previos deben seguir funcionando.
- Aplicar normalizacion en lectura/escritura sin migraciones destructivas.
- Si falta hora en datos legacy, ordenar por fecha y mantener estabilidad por captura.

### 6.2 Fechas invalidas/no parseables

- No lanzar errores.
- Mantener el set visible y utilizable.
- Ubicarlo al final del listado ordenado.

### 6.3 Caso especial `Anterior`

- Preservar identificacion de bloque legacy.
- Ubicar al final para no contaminar la cronologia real por fecha.

---

## 7. Criterios de aceptacion

- [ ] Historial de labs muestra siempre primero la fecha mas reciente.
- [ ] Tendencias usa el mismo orden temporal que historial y nota.
- [ ] `estudios` en nota queda en orden descendente por fecha.
- [ ] Insercion retrospectiva `31/03` entre `22/04` y `18/03` queda correcta.
- [ ] Misma fecha con diferente hora se ordena por hora descendente.
- [ ] `dd/mm` sin anio se interpreta con anio actual.
- [ ] Fechas invalidas no rompen y quedan al final.
- [ ] Caso `Anterior` se mantiene y se visualiza al final.

---

## 8. Pruebas manuales minimas

1. Cargar set `18/03` y luego `22/04`:
   - Esperado: `22/04` arriba.
2. Agregar retrospectivo `31/03`:
   - Esperado: `22/04`, `31/03`, `18/03`.
3. Dos sets mismo dia, horas `08:00` y `15:00`:
   - Esperado: `15:00` arriba.
4. Fecha `31/03` sin anio:
   - Esperado: se asume anio actual.
5. Set con fecha no parseable:
   - Esperado: visible al final, sin error.
6. Verificar consistencia simultanea en:
   - Nota (`estudios`)
   - Historial
   - Tendencias

---

## 9. Fuera de alcance (este ciclo)

- Cambios de UI mayor en tarjetas/labels de labs.
- Migracion historica completa de formatos antiguos de fecha.
- Nuevos filtros por rango de fecha en historial de labs.
