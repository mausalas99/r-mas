# R+ UI Improvements — Design Spec
**Date:** 2026-04-11  
**Scope:** 4 independent UI/UX improvements to the R+ Clínica Electron app

---

## 1. Agregar Paciente — Reorganización del form (edad/sexo)

### Problema
El modal de "Agregar Paciente" tiene Nombre, Registro, Edad y Sexo en una sola fila usando `grid-template-columns: 2fr 1fr 1fr`, donde Edad y Sexo están metidos en un sub-grid dentro de la tercera columna. Esto causa scroll en la ventana del modal.

### Solución
Dividir en dos filas explícitas en ambas secciones del modal (prefilled desde lab y entrada manual):

- **Fila 1:** `grid-template-columns: 2fr 1fr` → Nombre | Registro  
- **Fila 2:** `grid-template-columns: 1fr 1fr` → Edad (número + unidad) | Sexo

Eliminar el sub-grid anidado. El modal debe caber en pantalla completa sin necesidad de scroll.

### Archivos afectados
- `public/index.html` — bloque HTML del modal (~líneas 308–373), dos secciones: `#modal-prefilled` y la sección de entrada manual.

---

## 2. Auto-Updater con Progreso de Descarga

### Problema
El auto-updater descarga silenciosamente en background y solo muestra un `dialog.showMessageBox` nativo después de completar la descarga. El usuario no sabe que hay una actualización hasta que ya está lista.

### Solución
Reemplazar el diálogo nativo por un banner inline en el renderer, con dos estados:

**Estado 1 — Descargando:**
```
[ ↓ Descargando actualización… 62% ████████░░░░░░░ ]
```
Banner fijo `position: fixed; top: 0; width: 100%; z-index: 9999`, oculto por defecto. Se activa al recibir el evento IPC `update-progress`.

**Estado 2 — Lista para instalar:**
```
[ R+ v1.x.x lista. [Instalar y reiniciar] [Más tarde] ]
```
Se activa al recibir el evento IPC `update-ready`.

**Botón "Instalar y reiniciar":** envía IPC `install-update` al main process → llama `autoUpdater.quitAndInstall()`.  
**Botón "Más tarde":** oculta el banner. `autoInstallOnAppQuit: true` ya garantiza instalación al cerrar.

### Cambios en `main.js`
1. Agregar listener `download-progress` → `mainWindow.webContents.send('update-progress', progress.percent)`
2. Cambiar listener `update-downloaded` → `mainWindow.webContents.send('update-ready', info.version)` (eliminar el `dialog.showMessageBox` actual)
3. Agregar listener IPC `install-update` → `autoUpdater.quitAndInstall()`

### Archivos afectados
- `main.js` — listeners del autoUpdater (~líneas 52–70) + nuevo listener IPC
- `public/index.html` — HTML del banner + CSS + listeners IPC del renderer

---

## 3. Dark Mode Global

### Solución
CSS variables + clase `dark` en `<html>` + toggle + persistencia en `localStorage`.

### Variables CSS

```css
/* Agregar en public/index.html después del bloque :root existente */
html.dark {
  --primary:      #3B82F6;
  --action:       #60A5FA;
  --action-hover: #3B82F6;
  --bg:           #0F1117;
  --surface:      #1A1D27;
  --border:       #2D3142;
  --text:         #E2E8F0;
  --text-muted:   #94A3B8;
  --error:        #F87171;
  --success:      #4ADE80;
  --lab-chip-bg:  #1E3A5F;
  --lab-chip-txt: #93C5FD;
}
```

### SVG Diagrams (dcards)
Los dcards tienen colores hardcodeados como atributos `fill`/`stroke`. Se agrega una regla CSS:
```css
html.dark .dcard { filter: invert(0.92) hue-rotate(180deg); }
```
Esto invierte los colores del SVG de forma simple, sin tocar el markup del SVG.

### Toggle
- Botón ☀️/🌙 en la barra de título (`.app-bar` o elemento header existente)
- Al hacer click: `document.documentElement.classList.toggle('dark')` + `localStorage.setItem('theme', ...)`
- Al cargar la app: `if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark')`

### Archivos afectados
- `public/index.html` — CSS (nuevo bloque `html.dark`), HTML del botón toggle, JS de inicialización y toggle

---

## 4. Fecha de Labs en Formato Abreviado DD/MM

### Problema
Cuando se envían labs a la nota de evolución (`enviarLabsANota()`), la fecha del reporte se incluye en formato completo `DD/MM/YYYY` (ej: `"10/04/2026"`).

### Solución
Al momento de usar la fecha en el output de texto/nota, truncar a los primeros 5 caracteres: `fecha.slice(0, 5)` → `"10/04"`.

El cambio es **solo en la presentación**, no en el almacenamiento. `activeLab.patient.fecha` sigue guardando `DD/MM/YYYY` completo.

### Lugares a cambiar
1. En `enviarLabsANota()` — donde se forma el header de los estudios con la fecha
2. En el render de la sección de labs en la nota (si la fecha del reporte aparece en el UI de notas)

### Archivos afectados
- `public/index.html` — función `enviarLabsANota()` (~línea 977–1000)

---

## Resumen de Archivos

| Archivo | Cambios |
|---------|---------|
| `public/index.html` | Form modal (1), Banner updater HTML+CSS+JS (2), Dark mode CSS+toggle+init JS (3), Fecha labs (4) |
| `main.js` | IPC events para updater progress (2) |

---

## Orden de Implementación Sugerido
1. Fecha de labs (más simple, sin riesgo)
2. Form agregar paciente (CSS layout)
3. Dark mode (CSS vars + toggle)
4. Auto-updater con progreso (IPC + HTML)
