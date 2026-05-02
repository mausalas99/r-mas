# Pestaña Medicamentos y botón Receta — Spec de diseño

**Fecha:** 2026-05-02  
**Objetivo:** Ofrecer una vía sencilla, por paciente activo, para pegar el listado de medicamentos del hospital, normalizarlo a redacción de nota de egreso, suspender ítems puntuales, y copiar todo al portapapeles (mismo patrón que Laboratorio).  
**Scope:** Nueva pestaña **Medicamentos**, modelo de datos local por paciente, parseo TSV, generación de texto, pruebas unitarias del núcleo.  
**Fuera de scope:** Integración con fuentes distintas al pegado de texto; envío automático al expediente; catálogo clínico de antibióticos; sugerencias con ML.

---

## 1. Contexto

En hospital el listado llega en líneas separadas por tabuladores, con columnas de fecha/hora, tipo, medicamento, vía, dosis e indicaciones, frecuencia, etc. La salida deseada son frases en español listas para nota de egreso (ejemplos validados por el usuario en la sesión de diseño).

La app ya tiene pestañas **Laboratorio** y **Expediente**; Laboratorio usa textarea de entrada, procesamiento, área de salida y **Copiar** que vuelca el bloque completo al portapapeles con `navigator.clipboard.writeText` y toasts.

---

## 2. Reglas de negocio validadas

1. **Pestaña:** se llama **Medicamentos** (nivel de `app-tabs`, junto a Laboratorio y Expediente).
2. **Entrada:** el usuario pega en un **textarea** el texto copiado del hospital; el botón **Receta** (ubicado al final del flujo de la pestaña) **procesa** ese contenido (parseo + construcción de ítems + persistencia). No se requiere leer el portapapeles al pulsar Receta; el texto copiado del hospital se pega primero en el textarea.
3. **Salida y Copiar:** un botón **Copiar** copia **todo** el texto generado (solo medicamentos no suspendidos) al portapapeles, **igual que en labs**: si no hay nada que copiar, toast de error; si hay, `writeText` + toast de éxito.
4. **Suspender:** cada medicamento puede marcarse **suspendido**; los suspendidos **no** se incluyen en el texto que genera Copiar.
5. **Día de tratamiento:** solo si el pegado incluye señal explícita (p. ej. patrón tipo `DIA#` en el campo de dosis/indicaciones). No hay lista de antibióticos ni día 1 por defecto si no hay señal en el texto.
6. **Persistencia por paciente:** un **solo** estado vigente de medicamentos por `patientId` (lista de ítems + metadatos). Cada vez que se pulsa **Receta** con éxito, **se sobrescribe por completo** ese estado (no se acumulan lotes tipo historial de labs).
7. **Fecha de actualización:** al guardar tras Receta, se registra la **fecha de actualización** mostrada en UI. **Criterio:** preferir fecha extraída del propio pegado (p. ej. parte de fecha de la primera fila, o la fecha mayoritaria entre filas válidas); si no es posible determinarla de forma fiable, usar la **fecha local del día** en que se pulsó Receta.
8. **Paciente activo:** sin paciente seleccionado, mensajes guía coherentes con el resto de la app (análogo a historial de labs); Receta / guardado no deben corromper datos globales.

---

## 3. Enfoque técnico

- **Núcleo aislado:** funciones puras de parseo y de generación de una línea de egreso en un módulo `.mjs` (y `.test.mjs`), con casos de prueba basados en los ejemplos proporcionados por el usuario.
- **UI y estado:** `public/index.html` + `public/js/app.js` (o extracción mínima si ya existe patrón); persistencia en el mismo mecanismo que pacientes/notas (p. ej. extensión del objeto de estado y `storage.js`), clave dedicada por paciente para el bloque `{ fechaActualizacion, items[] }`.
- **Copiar:** reutilizar el patrón de `copiarLabsAlPortapapeles`: construir un string multilínea (p. ej. líneas en blanco entre medicamentos como en el ejemplo de salida), `navigator.clipboard.writeText`, manejo de rechazo con toast.

---

## 4. Modelo de datos (ítem)

Cada ítem tras parseo (campos orientativos; nombres finales en implementación):

- Identificador estable dentro del lote (índice o id generado al procesar).
- Campos crudos o normalizados mínimos para regenerar la frase (nombre, vía, dosis, criterios PRN, frecuencia, etc.).
- `suspendido`: boolean.
- `diaTratamiento`: número o `null` si no hubo patrón `DIA#` (u equivalente acordado en parser).

El texto final por ítem se puede generar **al vuelo** al renderizar / al copiar, o cachearse en el ítem; debe invalidarse o recalcularse si cambia `suspendido`.

---

## 5. Parseo

- Entrada: líneas no vacías; separador de campo **tabulador**.
- Validar número mínimo de columnas; filas inválidas: política explícita en implementación (omitir con contador en resumen o mostrar aviso) sin bloquear todo el pegado si el resto es válido.
- Detección de cabecera: si la primera línea no coincide con el patrón de fila de medicamento, opción de saltarla (definir heurística simple en plan de implementación).

---

## 6. Generación de texto (redacción)

- Mapas de expansión de abreviaturas del hospital a términos de egreso (p. ej. `SOL INY` → `SOLUCIÓN INYECTABLE`), respetando los ejemplos validados.
- Elección de verbo según vía: TOMAR / ADMINISTRAR / APLICAR (según tablas derivadas de los ejemplos).
- PRN vs programado: detectar desde columna de frecuencia y/o texto de criterio en dosis/indicaciones.
- Frase de continuidad tipo “sin suspender hasta nuevo aviso” cuando corresponda al patrón de los ejemplos no PRN.
- Inyectar mención de día de tratamiento solo cuando `diaTratamiento` no sea `null`.

---

## 7. UI resumida

- Pestaña **Medicamentos**: columna principal con textarea de pegado, lista/tabla de resultados con toggle **Suspender**, área de previsualización del texto final.
- Botón **Receta** al final del flujo (debajo del textarea o del bloque de entrada según maquetación alineada a Laboratorio).
- Botón **Copiar** visible con la salida, comportamiento equivalente a labs.

---

## 8. Pruebas

- Tests unitarios del parser (filas de ejemplo del hospital → estructura intermedia).
- Tests del generador (estructura → línea de egreso esperada, incluyendo PRN, vías y caso con `DIA#`).
- Caso de copiar sin ítems activos: no llamar a clipboard con string vacío; toast de error.

---

## 9. Autorrevisión del spec

- Sin placeholders TBD en reglas críticas; criterio de fecha y sobrescritura explícitos.
- Alcance acotado a pegado + estado local; sin contradicción con “un solo estado por paciente”.
- Copiar alineado explícitamente con el patrón de Laboratorio.

---

## 10. Próximo paso

Tras aprobación del usuario sobre este archivo: plan de implementación detallado (`writing-plans`) sin ampliar alcance aquí descrito.
