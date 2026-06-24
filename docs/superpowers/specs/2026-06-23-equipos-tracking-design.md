# Equipos (Lumify / EKG / Ultrasonido) — tracking

**Date:** 2026-06-23  
**Status:** Approved  
**Dependencies:** Interno mobile pattern, LAN host (`server.js` :3738), `CLINICAL_SALA_VALUES`

## Summary

Program-wide custody + waitlist for one Lumify, one EKG, and one Ultrasonido. Host-authoritative SQLCipher on the LAN host Mac; mobile web micro-app at `/equipos` (QR + token); desktop board in Modo Guardia; R4/Admin QR, purge, and reports.

## Product decisions

| Topic | Decision |
|-------|----------|
| Scope | Program-wide (single queue) |
| Identity | Name + rotación (honor system) |
| Lumify pickup | Photo required; charge optional |
| Lumify return | Photo + charge required + gel vacío |
| EKG | Photo on pickup and return |
| Ultrasonido | No photos |
| Photos | Web server only; 06:00 UTC purge when idle |
| Failover | Temporary host on user R+ until higher rank returns |
| Admin | Manual queue purge; team reports permanent |
| UI | 100 % español |

## Architecture

See implementation plan and `lib/equipos/`, `public/equipos/`, `public/js/features/equipos-*.mjs`.

## API

`/api/equipos/v1` — ping, board, checkout, return, waitlist, alert, ack, reports, admin/purge-queue, photos, ws, host promote/merge.
