# Modo Interno (MIP) — Guardia móvil por QR

**Date:** 2026-06-02  
**Status:** Approved  
**Dependencies:** Sala + Guardia V3 (`active_guardias`, entrega), LAN host (`server.js` :3738), Estado actual (`appendMedicion`)

## Overview

Micro-app web móvil para **médicos internos de pregrado (MIP)** en guardia nocturna. Acceso mediante **QR permanente e imprimible por sala**. Sin cuenta clínica, sin permisos read/write del expediente. Solo pueden ver el censo entregado al R1 de guardia y **registrar signos vitales + glucometrías**. Los datos fluyen a **Estado actual** del paciente y al **Modo Guardia** del residente, incluyendo alertas por alteraciones.

## Decisiones acordadas

| Tema | Decisión |
|------|----------|
| Enfoque | Micro-app dedicada (Enfoque 1), no R+ Móvil completo |
| Actualización | Polling ligero v1 (30s) **+** WebSocket push |
| Acceso | QR fijo por sala + token secreto regenerable |
| Alcance pacientes | Entregados al R1 de guardia (`active_guardias`) de esa sala |
| Pendientes | Signos vencidos/por vencer + `pendientes_json` de entrega |
| Identidad MIP | Nombre **opcional** por medición (sin fila en `users`) |
| Gestión QR | Admin + R4: activar / desactivar / regenerar / imprimir |
| Campos registro | Signos base (TA, FC, FR, TEMP, SAT) + **glucometrías** (valor + hora) |

## Architecture

```
┌─────────────┐   QR scan    ┌──────────────────────────────────┐
│  Celular    │─────────────▶│  /interno/sala-{1|2|e}?t=TOKEN   │
│  (Safari)   │◀── WS/poll ──│  public/interno/ (micro-app)     │
└─────────────┘              └──────────────┬───────────────────┘
                                            │ GET board / POST vitals
                                            ▼
                              ┌──────────────────────────────────┐
                              │  interno-router.js (Express)     │
                              │  · valida token + sala           │
                              │  · scope = active_guardias R1    │
                              └──────────────┬───────────────────┘
                                            │
                    appendMedicion + alteredAt + last_vitals_check
                                            ▼
                              ┌──────────────────────────────────┐
                              │  LAN host store + clinical DB    │
                              │  broadcast → R+ desktop clients  │
                              └──────────────────────────────────┘
```

**Host discovery:** el QR codifica sala + token (no IP fija). Al abrir, el cliente descubre el host LAN activo (mismo patrón que auto-discovery del hub) y reconecta API/WS al host encontrado.

## Patient scope

Un paciente aparece en el board del interno si:

1. `patient.sala` coincide con la sala del QR.
2. Existe fila `active_guardias` con `status = 'Active'` cuyo `covering_user_id` es el **R1 de guardia on-call** de esa sala hoy (misma lógica que `salaOnCallR1` / entrega R1→R1 guardia).

Si no hay guardia activa o no hay entregas, el board muestra estado vacío: *«Guardia no iniciada o sin pacientes entregados»*.

## Data model

### Nueva tabla `sala_interno_access`

```sql
CREATE TABLE IF NOT EXISTS sala_interno_access (
  sala          TEXT PRIMARY KEY,   -- 'Sala 1' | 'Sala 2' | 'Sala E'
  access_token  TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  rotated_at    TEXT,
  rotated_by    TEXT              -- user_id (Admin/R4)
);
```

Bootstrap: insertar filas para las 3 salas con tokens aleatorios al migrar schema.

### Medición desde interno

Extensión opcional en cada entrada de `monitoreo.historial`:

```json
{
  "id": "uuid",
  "recordedAt": "ISO",
  "vitals": { "tas", "tad", "fc", "fr", "temp", "sat" },
  "glucometrias": [{ "value": 142, "time": "22:15" }],
  "alteredAt": { "fc": "22:15" },
  "recordedBy": { "kind": "interno", "sala": "Sala 1", "name": "Ana López" }
}
```

- `name` omitido si el MIP no se identifica → `"Interno Sala 1"`.
- `alteredAt` vía `buildAlteredAtDefaults` (`estado-actual-ranges.mjs`).
- Glucosa alterada: `< 70` o `> 180` mg/dL (misma convención clínica usada en gráficas EA).

## API (`/api/interno/v1`)

Autenticación: header `X-Interno-Token: <token>` + query/path `sala`.

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/ping` | Health + host discovery |
| GET | `/board` | Censo filtrado para la sala |
| POST | `/vitals` | Registrar medición |
| GET | `/ws` | WebSocket (token en primer mensaje auth) |

### GET `/board` response

```json
{
  "sala": "Sala 1",
  "active": true,
  "summary": { "total": 12, "vitalsOverdue": 3, "vitalsDueSoon": 2 },
  "patients": [
    {
      "id": "uuid",
      "bedLabel": "412",
      "nameShort": "GARCÍA L.",
      "vitals": { "banner": "Toca en: 12 min", "cls": "warning", "frequency": "2h" },
      "pendingCount": 2,
      "pendientes": [
        { "text": "Endoscopia HOY", "time": "14:00" },
        { "text": "Control Hb mañana" }
      ],
      "isCritical": false
    }
  ]
}
```

- `pendientes` parseados de `active_guardias.pendientes_json` (líneas de texto; hora extraída si el residente la incluyó en entrega).
- `vitals.banner` reutiliza `calcVitalsBanner(last_vitals_check, vitals_frequency)`.

### POST `/vitals` body

```json
{
  "patientId": "uuid",
  "reporterName": "Ana López",
  "vitals": { "tas": 120, "tad": 80, "fc": 88, "fr": 18, "temp": 36.8, "sat": 97 },
  "glucometrias": [{ "value": 142, "time": "22:15" }]
}
```

**Server-side:**

1. Validar token activo + paciente en scope.
2. Construir medición; rechazar si `medicionHasCoreData` es false.
3. `appendMedicion(patient.monitoreo, medicion)`.
4. `UPDATE active_guardias SET last_vitals_check = now()`.
5. Aplicar mutación vía conflict resolver (mismo path que LAN PUT patient).
6. `broadcast('interno', { type: 'board-changed', sala })` + `broadcast('sync', { type: 'patients-updated' })`.

Rate limit: 60 POST/min por token.

## Web UI (`public/interno/`)

Ruta estática: `/interno/sala-1`, `/interno/sala-2`, `/interno/sala-e`.

### Layout móvil (alta densidad)

- Header: sala, resumen (vencidos / total), botón refrescar.
- Lista compacta: filas de ~56px con cama, apellido abreviado, chip temporalidad signos, badge pendientes.
- Tap → panel expandido: lista completa de pendientes + botón «Registrar signos».
- Modal registro: grid 2 columnas para signos; sección glucometrías (+ agregar fila valor/hora); campo nombre opcional; enviar.

### Sync

- **Polling:** cada 30s GET `/board` (fallback si WS cae).
- **WebSocket:** canal `interno:<sala>`; eventos `board-changed`, `patient-vitals-updated`.
- Tras POST exitoso: optimista local + esperar confirmación WS.

### Estilos

CSS dedicado `public/interno/interno.css` — tokens Hallmark existentes vía import de variables; touch targets ≥ 44px; sin cargar `app.bundle.mjs`.

## Resident-facing updates (R+ desktop)

Tras cada POST del interno:

| Superficie | Cambio |
|------------|--------|
| Modo Guardia grid | Banner signos actualizado; chip ámbar/rojo si alterado o vencido |
| Estado actual | Nueva fila en historial; snapshot con alertas `alteredAt` |
| Notificación opcional v1 | Toast en cliente host si `guardiaMode` activo y signos alterados |

No se expone expediente completo al interno. El residente conserva read/write normal.

## Admin / R4 controls

Sección **«QR Internos»** en panel Conexión guardia (R4 + Admin):

- Por sala: estado activo/inactivo, regenerar token, copiar URL, **vista previa QR** (canvas/lib QR), botón imprimir.
- Regenerar invalida token anterior inmediatamente.
- Desactivar muestra mensaje genérico al escanear (sin filtrar si existía guardia).

## Security

- Token ≥ 32 bytes hex; nunca en logs.
- Endpoints interno **no** usan Bearer LAN de residentes; canal separado.
- POST limitado a `monitoreo.historial` append + `last_vitals_check`; sin mutación de otros campos del paciente.
- CORS: mismo host LAN (patrón existente puerto 3738).
- WS: auth message `{ type: 'auth', token, sala }` dentro de 3s o cierre.

## Files (planned)

| File | Role |
|------|------|
| `lib/interno/interno-scope.mjs` | Resolver pacientes + R1 guardia por sala |
| `lib/interno/interno-vitals.mjs` | Construir medición, alteredAt, glu alerts |
| `lib/interno/interno-router.js` | Express router API + WS |
| `lib/db/schema.mjs` | Tabla `sala_interno_access` |
| `lib/db/clinical-access-db.mjs` | CRUD token sala |
| `public/interno/index.html` | Shell micro-app |
| `public/interno/interno-app.mjs` | UI + poll + WS |
| `public/interno/interno.css` | Estilos móvil |
| `public/js/features/interno-qr-panel.mjs` | Panel QR en hub guardia |
| `server.js` | Montar router + ruta estática |
| `public/js/features/guardia-board.mjs` | Badge alteración post-sync (ligero) |

## Out of scope v1

- I/O, bomba insulina, eventualidades editables por MIP
- Lista pre-cargada de internos del turno
- Historial de escaneos / analytics
- Acceso fuera de LAN hospitalaria
- R2 gestión de QR (solo R4 + Admin)

## Test plan

- Unit: scope filter, token validation, medición builder, glu alterada
- Integration: POST vitals → patient monitoreo + active_guardias updated
- E2E manual: QR → board → registrar → residente ve en Modo Guardia y EA
