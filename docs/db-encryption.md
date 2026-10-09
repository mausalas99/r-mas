# Base de datos local (driver SQLCipher, sin clave)

R+ guarda datos clínicos en `rplus-clinical.db`, en el proceso principal de Electron, con el driver `better-sqlite3-multiple-ciphers`. **Desde 8.4.2 la base se abre sin clave**: es un archivo SQLite normal. La protección real es la cuenta del sistema y el cifrado de disco (FileVault/BitLocker). Decisión 2026-10-09: sigue así en 8.5.1 (ver `core/18-knowledge-capture.md`). Esta nota es para operaciones y soporte **en el Mac**.

**Nube (Cloudflare D1) no usa SQLCipher.** Room snapshots there are plaintext JSON over HTTPS. See [docs/core/15-security.md](./core/15-security.md).

## Recompilar el módulo nativo

Tras cambiar la versión de Electron o clonar el repo en otra arquitectura (macOS arm64/x64, Windows x64), recompila el binding nativo:

```bash
npm run rebuild:db-native
```

El script ejecuta `@electron/rebuild` sobre `better-sqlite3-multiple-ciphers`. Si falla en CI sin Electron instalado, es esperado; en máquina de desarrollo debe completarse antes de empaquetar o probar la app.

## Instalación y scripts postinstall

`better-sqlite3-multiple-ciphers` compila código nativo en `npm install`. Con npm 11+ puede pedirse aprobación explícita de scripts:

```bash
npm approve-scripts better-sqlite3-multiple-ciphers@12.10.0
```

En `package.json` ya está en `allowScripts` para esa versión. Sin el binario `.node` compilado, la app muestra error de ABI y cierra (no hay respaldo en JSON plano).

## Base cifrada antigua (antes de 8.4.2)

No hay contraseña que olvidar: la base actual no tiene clave. Argon2id, el código de recuperación y `wrapped_dek` siguen en el código pero no se usan.

Si al arrancar existe una base cifrada antigua (meta con `kdf_salt`, sin clave recordada), R+ la **mueve** (no la borra) a `userData/rplus-clinical-encrypted-backup-<fecha>/`, abre una base vacía y avisa con un toast. Los pacientes de Nube vuelven al sincronizar. Para recuperar datos solo-locales hace falta la frase o el código de recuperación de esa instalación.

## Tipos de respaldo

| Tipo | Contenido | Cuándo usarlo |
|------|-----------|---------------|
| **Export JSON** | Datos clínicos en texto plano | Migrar a otra instalación, auditoría legible |
| **Copia `.db`** | Archivo SQLite completo (`VACUUM INTO`), **sin cifrar** | Restauración rápida idéntica |

Las dos copias contienen PHI sin cifrar. Guárdalas solo en medios seguros.

## Prueba rápida con archivo en disco

Los tests unitarios usan `:memory:`. Para validar el binario nativo contra un archivo real:

```javascript
// Proceso principal (DevTools → consola de main), ruta temporal:
const Database = require('better-sqlite3-multiple-ciphers');
const path = require('path');
const os = require('os');
const dbPath = path.join(os.tmpdir(), 'rplus-smoke.db');
const db = new Database(dbPath);
db.pragma("key = 'smoke-test-pass'");
db.exec('CREATE TABLE IF NOT EXISTS smoke (id INTEGER PRIMARY KEY)');
db.close();
// Borrar dbPath cuando termines
```

Si esto falla con error de carga del `.node`, ejecuta `npm run rebuild:db-native` y vuelve a empaquetar (`build.asarUnpack` incluye `node_modules/better-sqlite3-multiple-ciphers/**/*`).

## Empaquetado Electron

El release incluye el addon en `build.files` y lo extrae del asar en `build.asarUnpack` (misma ruta). Los binarios de `@node-rs/argon2` van en el mismo `asarUnpack` (si quedan dentro del asar, macOS/Windows muestran *failed to load native binding*).

Antes de `npm run build:mac` en un Mac Apple Silicon, `prebuild:mac` descarga `argon2.darwin-x64.node` para el artefacto **x64** (`scripts/fetch-argon2-darwin-x64.mjs`). Al empaquetar **Windows desde macOS**, `prebuild:win` usa `scripts/fetch-argon2-win.mjs` y `scripts/fetch-sqlite-win.mjs` (prebuild `better_sqlite3.node` win32-x64 para la ABI de Electron actual). Sin el segundo script, el `.exe` incluye el binario Mach-O y Windows muestra *not a valid Win32 application*.

Sincronizar patrones de empaquetado con:

```bash
node scripts/lib/electron-pack-files.js --write
```

## Referencias

- Diseño: `docs/superpowers/specs/2026-05-31-sqlcipher-forensic-audit-design.md`
- Plan de implementación: `docs/superpowers/plans/2026-05-31-sqlcipher-forensic-audit.md`
