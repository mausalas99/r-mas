# API Reference — R+

Este documento describe las APIs expuestas por R+ para comunicación entre procesos (IPC) y Nube (Cloudflare Worker).

---

## IPC (preload.js → main process)

R+ usa `contextBridge` expuesto en `preload.js` para comunicación entre el renderer y el proceso principal de Electron.

### Canales IPC

| Canal | Dirección | Propósito |
|-------|-----------|-----------|
| `file:save` | Renderer → Main | Guardar archivo `.docx` via diálogo |
| `file:open` | Renderer → Main | Abrir archivo via diálogo |
| `db:get-password` | Renderer → Main | Obtener contraseña de SQLCipher |
| `db:set-password` | Renderer → Main | Establecer contraseña de SQLCipher |
| `db:unlock` | Renderer → Main | Desbloquear base de datos cifrada |
| `db:lock` | Renderer → Main | Bloquear base de datos cifrada |
| `db:status` | Renderer → Main | Estado de la base (bloqueada/desbloqueada) |
| `update:check` | Renderer → Main | Verificar actualizaciones |
| `update:download` | Renderer → Main | Descargar actualización |
| `update:install` | Renderer → Main | Instalar actualización |
| `update:status` | Main → Renderer | Estado de la actualización (checking, downloaded, error) |
| `app:version` | Renderer → Main | Obtener versión de la app |
| `app:quit` | Renderer → Main | Cerrar la app |
| `settings:get` | Renderer → Main | Leer ajustes |
| `settings:set` | Renderer → Main | Escribir ajustes |
| `shell:open-external` | Renderer → Main | Abrir URL en navegador |
| `shell:open-path` | Renderer → Main | Abrir carpeta en Finder/Explorer |

### Uso desde el renderer

```javascript
// Leer (invoke → Promise)
const version = await window.electronAPI.getVersion();

// Escribir (send → evento)
window.electronAPI.saveFile({ content, path });

// Escuchar (on → callback)
window.electronAPI.onUpdateStatus((event, status) => { ... });
```

---

## HTTP API (Nube)

Turn sync, Interno MIP, and R+ Móvil go through `cloud/sync-worker/` (HTTPS). There is no local `:3738` host.

See `cloud/sync-worker/README.md` for Worker routes.

---


## IPC de almacenamiento local

Los módulos en `lib/db/` exponen canales IPC para operaciones de base de datos SQLCipher:

| Canal | Propósito |
|-------|-----------|
| `db:patient:list` | Listar pacientes |
| `db:patient:get` | Obtener paciente por ID |
| `db:patient:save` | Guardar/actualizar paciente |
| `db:patient:delete` | Eliminar paciente |
| `db:note:list` | Listar notas de paciente |
| `db:note:save` | Guardar nota |
| `db:settings:get` | Leer ajustes |
| `db:settings:set` | Guardar ajustes |

---

## Referencias

- Nube HTTP: `cloud/sync-worker/`
- Bridge IPC: `preload.js`, `main.js`
- Almacenamiento: `lib/db/`
