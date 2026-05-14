# LAN: host único, LiveSync con salas conocidas y calendario global de procedimientos — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los steps usan checkboxes (`- [ ]`) para tracking.

**Fecha:** 2026-05-13  
**Estado:** Aprobado en sesión de diseño (brainstorming); pendiente de revisión final del archivo por producto antes del plan de implementación.

**Goal:** Un solo entregable que combine:

1. **LiveSync por LAN** — una computadora actúa como **servidor host**; el resto son **clientes**. Lista de **salas compartida** en el host (cualquier miembro puede crear, renombrar o quitar). Primera conexión puede usar **enlace/código con dirección del host**; **sesiones posteriores** eligen sala desde la lista sin repetir el ritual del link. Soporte explícito para **equipos de más de dos personas** (mismo flujo de signaling/coordinación vía host).
2. **Calendario global de procedimientos** — **pestaña independiente** de LiveSync (misma barra de pestañas que el resto de la app), actualizada con el **mismo mecanismo de refresco/suscripción** que el resto de vistas conectadas al host. Cada evento está **obligatoriamente ligado a un paciente canónico en el host**. Campos: **qué procedimiento**, **dónde (lugar)**, **material listo** como **un solo checkbox** por evento (sí/no).
3. **Equipo** — identificación por **código de equipo** que alguien genera y los demás ingresan **una vez** por cliente (junto con dirección/puerto del host en LAN).
4. **Alta desde cliente** — si un **cliente** da de alta un **paciente completo** y un **procedimiento** en calendario, los datos se **persisten en el host** (el host es **copia maestra** del expediente, misma riqueza que un paciente creado en el host). El cliente mantiene **mapeo** entre identificador local y el **id canónico del host** tras la respuesta del servidor.

**Fuera de alcance explícito de este spec (salvo mención):** descubrimiento automático del host por mDNS (opcional futuro); réplica bidireccional completa de **todo** el expediente entre máquinas fuera del flujo “alta/edición dirigida al host” definido aquí; notificaciones push fuera de LAN.

---

## Arquitectura

- **Host:** proceso en la máquina designada que expone un **servicio en IP:puerto de la LAN** (mismo proceso Electron que ya sirve recursos locales, o servidor embebido acoplado — decisión de implementación sin cambiar el modelo lógico).
- **Responsabilidades del host:**
  - Persistencia **canónica** de **pacientes** (expediente completo según el modelo actual de R+).
  - **Calendario global** (eventos referenciando `patientId` del host).
  - **Lista de salas LiveSync** y **canal de signaling** (WebSocket u otro) para sesiones en vivo con **N participantes**.
  - Autenticación mínima de LAN: p. ej. **código de equipo** obligatorio para operaciones mutantes; lectura puede ser más abierta solo si producto lo acepta — **recomendación:** código requerido para cualquier mutación y para unirse a salas.
- **Clientes:** configuran **host, puerto, código de equipo**. Consumen API del host para calendario y pacientes canónicos; participan en LiveSync vía el mismo host.
- **Sin internet** para estas funciones: si el host no está disponible, no hay fuente canónica en red (ver errores).
- **Pestaña Calendario:** no anidada bajo LiveSync; **paridad de actualización** con otras vistas “modo conectado al host”.

---

## Modelo de datos (host)

### Paciente (canónico)

- Misma estructura que el expediente en R+ hoy (campos requeridos, migraciones compatibles con `storage.js` / evolución del modelo).
- Cada registro tiene **versión** o `updatedAt` (ISO) para política de conflictos.

### Evento de calendario

| Campo | Descripción |
|--------|-------------|
| `id` | Identificador estable en el host |
| `patientId` | FK al paciente canónico en el host |
| `start` / `end` o `date` | Ventana temporal (granularidad mínima: día + opcional hora — fijar en implementación según UI) |
| `procedure` | Texto o enum según producto (texto libre en v1 salvo restricción posterior) |
| `location` | Dónde se realiza |
| `materialReady` | Boolean (un checkbox en UI) |
| `createdAt`, `updatedAt`, `createdBy` | Auditoría mínima |

### Sala LiveSync (metadatos en host)

| Campo | Descripción |
|--------|-------------|
| `id` | Identificador estable de sala |
| `displayName` | Nombre visible en lista |
| `createdAt`, `updatedBy` | Opcional; cualquier miembro puede CRUD según decisión ya tomada |

Estado en tiempo real de la sesión (peers, orden) vive en memoria o en capa de signaling — detalle en plan de implementación según stack LiveSync existente o nuevo.

---

## Cliente: mapeo y copia local

- El cliente conserva su **localStorage** (u otro almacén local) para trabajo **offline** y para UI actual.
- Tras **crear paciente en host**, el host devuelve **`hostPatientId`** (y versión); el cliente **persiste mapeo** `localId → hostPatientId` y opcionalmente **sincroniza** el objeto local con la respuesta canónica.
- **Calendario en UI del cliente:** lectura/escritura contra API del host; al desconectar, mostrar estado cacheado con indicador **“desconectado — solo lectura o cola”** según política de Sección 4.

---

## Política de conflictos (recomendación v1)

- **Optimistic locking:** cada escritura de paciente envía `version` o `updatedAt` previo que el cliente conoce.
- Si el host rechaza por conflicto: **última escritura no gana automáticamente sin aviso** — mostrar **toast o modal breve** y ofrecer **recargar desde host** o **reintentar** según el caso.
- Para **simplificar v1** en eventos de calendario poco concurrentes: **LWW por `updatedAt`** en eventos, con toast si se sobrescribió una edición concurrente detectada por el host.

---

## Flujos principales

1. **Arranque del host:** usuario habilita “servidor de sala”, confirma puerto, anota IP en la LAN (mensaje claro sobre firewall del SO).
2. **Unión de cliente:** ingresa IP/puerto + código de equipo; validación; guardar configuración.
3. **LiveSync — primera vez:** enlace o asistente que incluye **base URL del host** + sala (o creación de sala); **posteriormente:** elegir sala de la **lista compartida** y unirse; **3+ usuarios** en la misma sala sin flujo distinto.
4. **Calendario:** pestaña global; CRUD de eventos solo con **paciente existente en el host** (selector busca en catálogo canónico del host vía API).
5. **Cliente crea paciente + procedimiento:** formulario completo → transacción lógica **POST al host** (paciente + evento) → host persiste ambos → cliente actualiza mapeo y cache → **broadcast** o **pull** para que la pestaña Calendario y el resto se actualicen **igual** que otras vistas conectadas.

---

## Sección 4 — Errores y casos borde

| Situación | Comportamiento esperado |
|-----------|-------------------------|
| Host apagado o inalcanzable | Banner global “Sin conexión al servidor de sala”. Calendario y lista de salas: **último estado cacheado** si existe; **sin edición remota** o **cola local limitada** — **recomendación v1:** **solo lectura** de cache + deshabilitar mutaciones al host (evitar colas complejas sin resolver). |
| IP del host cambia | El cliente debe **reconfigurar** IP/puerto (mensaje de ayuda). Opcional v2: mDNS. |
| Firewall bloquea puerto | Diagnóstico en host (“escuchando en …”) y en cliente (“no se pudo conectar”); enlace a documentación corta. |
| Fallo parcial (paciente creado, evento falla) | API debe ser **atómica** en el sentido producto: **commit único** paciente+evento en una solicitud, o **compensación** (rollback del paciente si el evento falla). No dejar estado huérfano sin aviso. |
| Código de equipo incorrecto | Rechazo claro; no filtrar si existe enumeración de salas. |
| Dos clientes editan el mismo paciente | Ver política de conflictos; refresco tras escritura exitosa. |
| Host sin SSL en LAN | Aceptable en red local de confianza; el spec asume **red de confianza**; documentar riesgo de sniffing en LAN compartida. |

---

## Sección 5 — Pruebas

- **Unitarias (Node):** serialización de payloads paciente/evento; resolución de conflictos por versión; validación de que evento sin `patientId` válido en host es rechazado.
- **Integración (manual o automatizada en CI si hay entorno):** checklist: host + 2 clientes en misma LAN; crear sala; 3º se une; crear evento; toggle material; cliente crea paciente completo + evento y verifica en host y en segundo cliente tras refresco/suscripción.
- **Regresión:** modo sin host (solo local) no rompe flujos actuales de R+ sin configuración LAN.

---

## Tech stack (orientativo)

- **Electron + Express (u HTTP existente)** en el host para REST; **WebSocket** para eventos de calendario / lista de salas / signaling LiveSync según unificación posible.
- **Persistencia host:** SQLite o archivo JSON versionado en perfil de usuario del host — elección en plan (SQLite preferible si el volumen crece).
- **Tests:** `node --test` para módulos puros; pruebas E2E opcionales.

---

## Criterios de éxito

- Equipo puede operar **solo en LAN** con **un host** y **varios clientes**.
- **Pestaña Calendario** visible e independiente; datos coherentes con el host; **checkbox material** por evento.
- **Lista de salas** compartida; **reunión diaria** sin repetir link complejo tras la primera configuración.
- **Sesiones con más de dos** participantes sin degradar el modelo de flujo.
- **Cliente** puede dar **alta completa** de paciente + procedimiento y el **host** queda como referencia canónica.

---

## Transición a implementación

Tras revisión y aprobación explícita del archivo por producto, usar **superpowers:writing-plans** para generar el plan de implementación por tareas (sin otras skills de implementación en la misma transición).
