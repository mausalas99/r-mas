# Carpeta de salida configurable + Avisos de duplicado de paciente

**Fecha:** 2026-04-13
**Versión objetivo:** 1.8.0 (bump de 1.7.1)

## Resumen

Dos funcionalidades independientes para R+:

1. **Carpeta de salida configurable** — Permitir al usuario elegir dónde se guardan los DOCX generados, en lugar del hardcoded `~/Downloads`.
2. **Avisos de duplicado de paciente** — Al crear un paciente, detectar coincidencias por nombre normalizado o registro y mostrar confirmación antes de guardar.

Ambas incluyen actualizaciones al onboarding existente.

---

## 1. Carpeta de salida configurable

### Motivación

`server.js` escribe todos los DOCX a `~/Downloads` (constante `DOWNLOADS`). Los usuarios necesitan poder elegir otra carpeta (p.ej. una carpeta clínica compartida, escritorio, etc.).

### Arquitectura

| Capa | Cambio |
|------|--------|
| `main.js` | Nuevo IPC handler `select-output-dir`: abre `dialog.showOpenDialog({ properties: ['openDirectory'] })` y devuelve la ruta seleccionada (o `undefined` si cancela) |
| `preload.js` | Exponer `electronAPI.selectOutputDir()` → `ipcRenderer.invoke('select-output-dir')` |
| `public/index.html` (Mi Perfil) | Nueva sección "Carpeta de documentos" con ruta actual y botón "Cambiar". Llama `electronAPI.selectOutputDir()`, persiste en `rpc-settings.outputDir` via `saveSettings()` |
| `public/index.html` (fetch) | Los POST a `/generate` y `/generate-indicaciones` incluyen campo `outputDir` en el body JSON, leído de settings |
| `server.js` | Ambos endpoints leen `req.body.outputDir`; si viene y pasa validación, lo usan; si no, fallback a `~/Downloads` |

### Flujo del usuario

1. Abre Mi Perfil → ve sección "Carpeta de documentos" mostrando ruta actual (default: `~/Downloads` representado como "Descargas")
2. Clic en "Cambiar" → diálogo nativo del OS para elegir carpeta
3. Selecciona carpeta → se muestra la nueva ruta truncada, se persiste en `rpc-settings.outputDir`
4. Cada generación de DOCX envía `outputDir` en el request automáticamente

### Persistencia

- Se guarda en `localStorage` dentro del objeto `rpc-settings` como `rpc-settings.outputDir`
- Se lee con `loadSettings()` al arrancar
- Si el campo no existe o está vacío, el renderer no envía `outputDir` → el servidor usa `~/Downloads`

### Validación en servidor

En ambos endpoints (`/generate` y `/generate-indicaciones`), antes de escribir el archivo:

```javascript
var outputDir = req.body.outputDir || DOWNLOADS;
if (!fs.existsSync(outputDir)) {
  return res.status(400).json({ error: 'La carpeta seleccionada ya no existe' });
}
try {
  fs.accessSync(outputDir, fs.constants.W_OK);
} catch (_) {
  return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada' });
}
fs.writeFileSync(path.join(outputDir, fileName), buf);
```

### Edge cases

| Caso | Comportamiento |
|------|---------------|
| Nunca configura carpeta | `outputDir` no se envía → servidor usa `~/Downloads` |
| Carpeta borrada / USB removido | POST falla con 400, renderer muestra toast "La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil." |
| Carpeta sin permisos de escritura | POST falla con 400, renderer muestra toast descriptivo |
| Cancela el diálogo de selección | No cambia nada, la ruta anterior se mantiene |

### UI en Mi Perfil

Sección nueva debajo de las configuraciones existentes:

- Label: "Carpeta de documentos"
- Texto mostrando ruta actual (truncada si es larga, tooltip con ruta completa)
- Botón "Cambiar" alineado a la derecha
- Si es el default, mostrar "Descargas (predeterminado)"

---

## 2. Avisos de duplicado de paciente

### Motivación

Los usuarios pueden crear pacientes duplicados por accidente (mismo nombre tecleado de nuevo, o re-admisión con mismo registro). Un aviso simple previene datos fragmentados sin bloquear flujos legítimos.

### Lógica de detección

Se ejecuta en `savePatient()` antes de persistir, con una función `findDuplicatePatient(nombre, registro)`:

```javascript
function normalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalize(nombre);
  return patients.find(function(p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalize(p.nombre) === nombreNorm;
  });
}
```

### Reglas de coincidencia

| Criterio | Tipo de match | Ejemplo |
|----------|--------------|---------|
| Registro idéntico | Exacto (ambos deben tener valor) | Registro `0012345` en nuevo y existente |
| Nombre normalizado idéntico | Sin acentos, lowercase, espacios colapsados | "JUAN GARCÍA LÓPEZ" = "juan garcia lopez" |

- Los pacientes demo (`isDemo: true`) se ignoran
- El registro tiene prioridad: si ambos tienen registro y coinciden, es match aunque el nombre difiera
- Si el nuevo paciente no tiene registro, solo se compara nombre

### Modal de confirmación

Reutiliza el patrón visual de `lab-conflict-modal` (backdrop + modal centrado):

- **Título:** "Paciente similar encontrado"
- **Cuerpo:** información del paciente existente:
  - Nombre
  - Cuarto / Cama
  - Registro (si tiene)
  - Fecha de ingreso (leída de `notes[id].fecha`, que se asigna al crear el paciente)
- **Botones:**
  - "Cancelar" → cierra modal, vuelve al formulario de nuevo paciente (datos intactos)
  - "Agregar de todas formas" → continúa con `savePatient()` saltando la verificación

### Flujo

1. Usuario llena formulario y clic en "Agregar Paciente"
2. `savePatient()` extrae nombre y registro del formulario
3. Llama `findDuplicatePatient(nombre, registro)`
4. **Si hay match:** muestra modal de confirmación, pausa el guardado
5. **Si confirma:** ejecuta el guardado (misma lógica actual de `savePatient()` post-validación)
6. **Si cancela:** cierra modal, formulario queda abierto con datos intactos
7. **Si no hay match:** guarda directo (comportamiento actual sin cambios)

### Edge cases

| Caso | Comportamiento |
|------|---------------|
| Múltiples pacientes coinciden | Se muestra el primero encontrado (suficiente para el aviso) |
| Paciente desde lab (`openAddModalFromLab`) | Misma detección aplica — nombre y registro vienen pre-llenados |
| Nombre vacío | Ya validado antes (`!nombre` → toast error), nunca llega a detección |
| Solo espacios o acentos diferentes | `normalize()` los trata como iguales |

---

## 3. Actualizaciones al onboarding

### Cambios en pasos existentes

| Paso | Cambio |
|------|--------|
| `TOUR_STEP_MAP` (paso 1, vista general) | Agregar mención: "Si agregas un paciente con nombre o registro similar a uno existente, la app te avisará." |
| `TOUR_STEP_PROFILE` (paso 8, Mi Perfil) | Agregar mención: "Aquí también puedes elegir dónde se guardan tus documentos." |

### Versión

- Bump `package.json` de `1.7.1` a `1.8.0`
- El tour se re-dispara automáticamente porque `rpc-guided-tour-done-for-version` no coincidirá con la nueva versión

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `main.js` | Agregar `ipcMain.handle('select-output-dir', ...)` |
| `preload.js` | Agregar `selectOutputDir` a `electronAPI` |
| `server.js` | Ambos endpoints: leer `outputDir` del body, validar, usar o fallback |
| `public/index.html` | Sección Mi Perfil (UI carpeta), `savePatient()` (detección duplicados), modal confirmación, fetch con `outputDir`, textos de onboarding |
| `package.json` | Bump versión a `1.8.0` |
| `README.md` | Documentar ambas funcionalidades nuevas |

## Fuera de alcance

- La plantilla SOAP / ventilación en mayúsculas: ya funciona correctamente en el código actual
- Migración de localStorage a otra persistencia
- Refactoring de `public/index.html` (archivo grande pero fuera de alcance de este spec)
