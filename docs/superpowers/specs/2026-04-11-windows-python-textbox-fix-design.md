---
title: Windows Fixes — Python Bundleado + Foco de Textboxes
date: 2026-04-11
status: approved
---

## Contexto

R+ es una app Electron que usa scripts Python (solo stdlib) para generar archivos `.docx`. En Windows se presentan dos problemas:

1. **Python no encontrado** — `server.js` solo tiene paths de Mac/Linux; en Windows `python3` no existe como comando estándar, lo que produce el error "no se encontró Python" al intentar generar un documento.
2. **Textboxes bloqueados tras cualquier error** — Cuando `showToast` modifica el DOM en Windows + Electron/Chromium, el foco de teclado se pierde del input activo, impidiendo escribir hasta hacer clic manualmente.

---

## Fix 1 — Python Embebido para Windows

### Objetivo

Bundlear el Python embeddable oficial de Windows x64 dentro del instalador `.exe`, eliminando la dependencia de Python del sistema.

### Decisiones de diseño

- **Solo Windows x64** — Mac ya tiene Python en los paths del sistema (`/usr/local/bin/python3`, `/opt/homebrew/bin/python3`, `/usr/bin/python3`), que el código ya detecta correctamente.
- **Python 3.12 embeddable** (~12 MB comprimido) — solo contiene el intérprete y stdlib; suficiente porque los scripts no usan paquetes externos.
- **No se commitea el binario a git** — se descarga con un script `scripts/fetch-python.js` que se invoca automáticamente vía `prebuild:win`.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `scripts/fetch-python.js` | Nuevo script: descarga y descomprime el Python embeddable a `python-runtime/win-x64/` |
| `package.json` | Agrega `scripts.prebuild:win` y modifica `build:win` para llamarlo primero |
| `package.json` (sección `build.win`) | Agrega `extraResources` para incluir `python-runtime/win-x64/` en el `.exe` |
| `.gitignore` | Agrega `python-runtime/` |
| `server.js` | Reemplaza la resolución estática de `PYTHON` por una función `resolvePython()` |

### Lógica de resolución en `server.js`

```
resolvePython()
  ├── Windows → busca <resourcesPath>/python-runtime/win-x64/python.exe
  │     └── si existe → usa el bundleado ✓
  │     └── si no (dev mode) → fallback a 'python3' del sistema
  └── Mac/Linux → paths existentes (sin cambio)
```

`process.resourcesPath` es inyectado por Electron en producción; en dev apunta al directorio del proyecto.

### `electron-builder` — `extraResources`

```json
"win": {
  "extraResources": [
    { "from": "python-runtime/win-x64", "to": "python-runtime/win-x64" }
  ]
}
```

Los archivos quedan en `<install>/resources/python-runtime/win-x64/python.exe`.

---

## Fix 2 — Restaurar Foco de Textboxes tras Toast

### Causa raíz

En Windows + Chromium, modificar el DOM (cambiar `className` o `textContent` de un elemento `fixed`) puede disparar un evento de foco hacia `document.body`, quitando el foco de teclado del input activo. Es un comportamiento conocido del engine en Windows.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `public/index.html` | `showToast`: guarda y restaura `document.activeElement` |
| `public/index.html` | `<div id="toast">`: agrega `tabindex="-1"` para que nunca capture foco |

### Implementación

```javascript
function showToast(msg, type) {
  var focused = document.activeElement;
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  if (focused && focused.tagName !== 'BODY') {
    setTimeout(function () { focused.focus(); }, 0);
  }
  setTimeout(function () { t.className = 'toast'; }, 3500);
}
```

El `setTimeout(..., 0)` asegura que la restauración del foco ocurra después de que el engine procese cualquier evento de reenfoque generado por la mutación del DOM.

---

## Flujo completo de build en Windows

```
npm run build:win
  → prebuild:win ejecuta scripts/fetch-python.js
      → descarga python-3.12.x-embed-amd64.zip de python.org
      → extrae a python-runtime/win-x64/
  → electron-builder empaqueta la app
      → incluye python-runtime/win-x64/ como extraResource
  → resultado: R+-1.x.x-x64.exe (~102 MB)
      → al instalar: <install>/resources/python-runtime/win-x64/python.exe
      → server.js lo resuelve automáticamente en runtime
```

---

## Sin cambios

- Scripts Python (`generate_note.py`, `generate_indicaciones.py`)
- Build de Mac
- Templates `.docx`
- UI / lógica de negocio
- `asarUnpack` (no aplica a Python runtime)
