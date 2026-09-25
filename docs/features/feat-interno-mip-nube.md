---
type: "feature"
name: "Interno MIP (Nube)"
status: "stable"
description: "Internos de pregrado — tablero MIP por QR/enlace Nube (sin LAN :3738)."
---

# Interno MIP (Nube)

Board móvil para **internos de pregrado (MIP)**: censo por sala, signos vitales y glucometrías desde el celular, sincronizados con el turno vía **R+ Cloud**.

## Flujo

1. R4/admin abre **⇄ Conexión** en escritorio (sesión Nube activa).
2. En **QR Internos (MIP)** activa la sala, copia enlace o comparte QR.
3. El interno abre el enlace en el navegador (`/interno/{sala-slug}?t=…`) — sin app ni IP local.
4. Las mediciones entran al censo Nube con `recordedBy` tipo `interno`.

## Código

| Pieza | Ruta |
|-------|------|
| QR / panel Conexión | `interno-access-sync.mjs` |
| Worker routes + vitals | `cloud/sync-worker/src/interno/`, `interno-access-sidecar.js` |
| UI móvil (assets) | `cloud/sync-pages/` (ruta `/interno/`) |
| Tokens locales | SQLCipher `sala_interno_access` → push sidecar `internoAccessUpsert` |

## Relacionado

- **R+ Móvil / iPad** (residentes): `panel-mobile-invite.mjs`, `cloud-mobile/` — distinto alcance y login @usuario.
- Spec histórica LAN: [interno-guardia-mobile](../superpowers/specs/2026-06-02-interno-guardia-mobile-design.md) (referencia UX; auth ahora es Nube).

**Índice:** [features-index.md](./features-index.md)
