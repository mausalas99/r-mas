# R+ Live Sync - Sesion Completa Entre Dispositivos

**Fecha:** 2026-05-11
**Rama:** `feature/live-sync`
**Status:** Diseno aprobado, pendiente de revision del spec

## Resumen

R+ agregara una funcion de **Sesion en vivo** para sincronizar todos los datos locales entre dos dispositivos mientras ambos estan abiertos. Un equipo inicia la sesion, genera un link de invitacion temporal y el segundo equipo se une desde ese link. La conexion intenta primero LAN/WebSocket directo y, si falla, usa un relay por internet como fallback.

La sesion sincroniza la base completa de R+, no paciente por paciente. Al entrar, el dispositivo receptor recibe un snapshot completo; despues, cada cambio se transmite como evento incremental casi en tiempo real.

## Motivacion

El paquete sync actual por archivo ya permite mover datos entre equipos, pero no resuelve el flujo de guardia donde dos dispositivos necesitan mantenerse actualizados al momento. Abrir o sincronizar paciente por paciente seria lento y facil de olvidar. La sesion completa permite que una laptop y otra computadora compartan el mismo estado de R+ durante el trabajo activo, con UI clara y respaldo ante conflictos.

## Alcance

Esta version incluye:

- Accion **Compartir sesion en vivo** desde Ajustes -> Respaldo/Sync.
- Link de invitacion temporal, copiable y abrible desde otro dispositivo.
- Union por link `rplus://sync/join?...` y campo manual para pegar link si el protocolo no abre.
- Sincronizacion inicial completa de datos locales de R+.
- Sincronizacion incremental en vivo despues del snapshot inicial.
- Conexion LAN/WebSocket directa como ruta primaria.
- Fallback por relay de internet si LAN falla.
- Estado visible de sesion: esperando, conectado, sincronizando, reconectando, conflicto, finalizada.
- Confirmacion visible en el host antes de permitir que otro dispositivo se una.
- Respaldo local pre-sync antes de aplicar snapshot o cambios remotos.
- Registro de actividad reciente de eventos relevantes.

Esta version no incluye:

- Sync paciente por paciente como flujo principal.
- Edicion colaborativa caracter por caracter tipo Google Docs.
- Cuentas permanentes o login de nube.
- Sincronizacion cuando R+ esta cerrado.
- Resolucion avanzada de conflictos campo por campo.
- Almacenamiento en nube de expedientes.
- Mas de dos dispositivos conectados a la misma sesion.

## Decisiones De Diseno

### Decision: sesion completa por link

El usuario aprobo que la sesion abra R+ completo, no un paciente individual. La invitacion sera por link, no QR, porque es mas rapida de compartir por Mensajes, WhatsApp, AirDrop, correo o copia manual.

El link no contiene datos clinicos. Solo incluye informacion de conexion, token temporal, expiracion y material publico necesario para establecer la sesion segura.

### Decision: LAN primero, relay despues

La ruta primaria sera WebSocket directo dentro de la misma red local. Esto reduce latencia y evita depender de internet cuando ambos equipos estan cerca. Si no hay conexion LAN en pocos segundos, R+ usara un relay por internet.

El relay solo transporta mensajes cifrados entre clientes. No interpreta ni almacena datos clinicos en claro.

### Decision: snapshot inicial y eventos incrementales

Al unirse, el receptor recibe un snapshot completo basado en el modelo actual de respaldo/sync. Despues, no se reenvia todo `localStorage` por cada cambio. R+ emite eventos incrementales por entidad, con identificadores de dispositivo y evento para deduplicar y ordenar.

### Decision: merge conservador para MVP

El MVP usara reglas simples:

- Cambios en entidades distintas se aplican automaticamente.
- Cambios concurrentes sobre la misma entidad usan ultimo cambio gana.
- Antes de aplicar cambios remotos, R+ guarda respaldo local pre-sync.
- Labs se tratan como colecciones acumulativas con append/dedupe cuando sea posible.
- Borrados se propagan, pero quedan en actividad reciente y deben tener respaldo/undo reciente.

Esto evita una arquitectura demasiado pesada, pero da sync real para el flujo clinico.

## Arquitectura

### Componentes

- **Renderer (`public/js/app.js`)**: UI para compartir/unirse, barra de estado, captura de cambios del usuario y aplicacion de cambios remotos.
- **Modulo de sync nuevo**: construye snapshots, normaliza eventos, deduplica, aplica merge y registra conflictos.
- **Main process (`main.js`)**: registra el protocolo `rplus://`, coordina lifecycle de sesion y expone APIs seguras al renderer via preload.
- **Preload (`preload.js`)**: expone metodos IPC para iniciar, unirse, pausar y finalizar sesiones sin habilitar Node en renderer.
- **Servidor LAN**: WebSocket local dedicado para sesiones en vivo.
- **Relay de internet**: servicio separado para transportar mensajes cifrados cuando LAN no funciona.

### Flujo De Conexion

1. Host toca **Compartir sesion en vivo**.
2. R+ crea `sessionId`, `deviceId`, token temporal y expiracion.
3. R+ abre servidor WebSocket LAN y genera link de invitacion.
4. Receptor abre el link o lo pega manualmente.
5. Receptor intenta LAN directo.
6. Si LAN falla, intenta relay por internet.
7. Host confirma la union del receptor.
8. Host envia snapshot inicial cifrado.
9. Ambos dispositivos intercambian eventos incrementales.

## Modelo De Datos

### Snapshot Inicial

El snapshot debe cubrir las mismas familias de datos que el respaldo completo actual:

```js
{
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  listadoProblemas,
  settings,
  medCatalog
}
```

El snapshot se versiona para permitir migraciones futuras:

```js
{
  format: 'r-plus-live-sync-snapshot',
  version: 1,
  createdAt,
  sourceDeviceId,
  data
}
```

### Evento Incremental

Cada cambio posterior al snapshot viaja como evento:

```js
{
  format: 'r-plus-live-sync-event',
  version: 1,
  eventId,
  sessionId,
  sourceDeviceId,
  entityType,
  entityId,
  op,
  baseVersion,
  createdAt,
  payload
}
```

Tipos iniciales de evento:

- `patient.upsert`
- `patient.delete`
- `notes.update`
- `indicaciones.update`
- `listado.update`
- `labHistory.append`
- `labHistory.delete`
- `medReceta.update`
- `settings.update`
- `medCatalog.update`

## Seguridad Y Privacidad

- El link de invitacion expira.
- El host debe aprobar explicitamente la entrada de otro dispositivo.
- La carga clinica viaja cifrada de extremo a extremo.
- El relay no debe poder leer el contenido clinico.
- La sesion muestra aviso previo: "Esta sesion sincroniza todos los pacientes locales de R+ con el otro dispositivo".
- Antes del primer snapshot remoto, R+ crea respaldo pre-sync local.
- La UI permite finalizar sesion en cualquier momento.

## UI

En Ajustes -> Respaldo/Sync se agrega una tarjeta **Sesion en vivo**.

Acciones:

- **Compartir sesion en vivo**
- **Unirse con link**
- **Pausar sync**
- **Finalizar sesion**
- **Ver actividad reciente**

Estados visibles:

- `Esperando dispositivo...`
- `En vivo - conectado con <nombre de dispositivo>`
- `Sincronizando cambios...`
- `Reconectando...`
- `Conflicto detectado - revisar`
- `Sesion finalizada`

## Manejo De Conflictos

Para el MVP, el conflicto se maneja con reglas predecibles:

- Si un evento remoto llega sobre una entidad no modificada localmente desde la misma base, se aplica.
- Si hay cambios concurrentes sobre la misma entidad, gana el evento mas reciente por `createdAt` y se registra conflicto.
- Si el conflicto afecta texto clinico reemplazable, R+ guarda copia anterior en respaldo/actividad reciente.
- Si el conflicto afecta labs, se prefiere merge acumulativo con dedupe.
- Si el conflicto afecta borrado, el borrado se aplica solo con respaldo recuperable.

La UI no intentara resolver campo por campo en el MVP; mostrara aviso y dejara rastro recuperable.

## Pruebas

Pruebas unitarias:

- Construccion de snapshot completo.
- Aplicacion de snapshot inicial.
- Dedupe por `eventId`.
- Merge de cambios en entidades distintas.
- Ultimo cambio gana en misma entidad.
- Append/dedupe de `labHistory`.
- Propagacion de borrados con respaldo previo.
- Serializacion y validacion de links de invitacion.

Pruebas manuales:

- Dos instancias locales de R+ en la misma maquina.
- Dos dispositivos reales en la misma LAN.
- LAN fallida con fallback por relay.
- Apertura de link `rplus://` en macOS y Windows.
- Desconexion y reconexion durante edicion.
- Finalizar sesion desde host y receptor.

## Riesgos

- Firewalls de macOS/Windows pueden bloquear conexiones LAN.
- El protocolo `rplus://` requiere integracion correcta en instaladores.
- Un bug de sync puede propagarse rapido a ambos equipos.
- El relay agrega infraestructura y obligaciones de privacidad.
- El modelo actual de blobs en `localStorage` obliga a instrumentar cuidadosamente los puntos donde se guarda estado.

## Criterios De Exito

- Un dispositivo puede compartir sesion y generar link temporal.
- Otro dispositivo puede unirse con el link.
- El receptor obtiene snapshot completo.
- Cambios posteriores aparecen en el otro dispositivo sin accion manual.
- La sesion funciona por LAN cuando ambos equipos se ven.
- La sesion cae a relay cuando LAN no conecta.
- Antes de aplicar datos remotos existe respaldo recuperable.
- El usuario puede ver estado de conexion y finalizar la sesion.
