# Quick Wins v2 — Spec de diseño

**Fecha:** 2026-04-12  
**Versión objetivo:** 1.4.0  
**Features:** ⚙️ Defaults de médico · 🧪 Múltiples fechas de labs · 🎓 Onboarding interactivo

---

## 1. ⚙️ Defaults de médico e indicaciones

### Qué hace
Panel de configuración persistido en `localStorage` (`rpc-settings`) que guarda datos del médico y plantillas de indicaciones por defecto. Se auto-aplica al crear nuevos pacientes.

### Ubicación
Sección colapsable **"Mi Perfil"** al fondo de la sidebar, debajo de la lista de pacientes.

- Estado colapsado: muestra `👤 Dr. [Nombre] · [Grado] ▾`
- Estado expandido: formulario completo + botón "Guardar perfil"
- Toggle con click en el encabezado

### Campos del perfil

| Campo | Key en localStorage | Ejemplo |
|-------|---------------------|---------|
| Médico Tratante | `settings.doctorName` | `Dr. Mauricio Salas` |
| Profesor / Responsable | `settings.profesorName` | `Dr. Eleuterio Campos` |
| Grado / Servicio | `settings.grado` | `R3MI · Medicina Interna` |
| Default Dieta | `settings.defaultDieta` | `Hiposódica, hiperproteica…` |
| Default Cuidados | `settings.defaultCuidados` | `CSV c/8h, glucometrías c/6h…` |
| Default Medicamentos | `settings.defaultMedicamentos` | *(vacío por defecto)* |

### Comportamiento
- Al hacer click en "Guardar perfil" → persiste en `rpc-settings` → toast "Perfil guardado ✓"
- Al crear nuevo paciente → `note.medico` se pre-llena con `doctorName` y `note.profesor` con `profesorName`
- Las secciones de indicaciones nuevas se pre-llenan con los defaults
- Cambios al perfil **no afectan** pacientes/notas ya existentes (solo futuros)
- Si `rpc-settings` no existe: campos vacíos, sidebar colapsado

### Botón "Editar plantillas…"
Abre un modal simple con 3 textareas (Dieta, Cuidados, Medicamentos) y botón "Guardar plantillas".

---

## 2. 🧪 Múltiples fechas de labs en nota

### Problema
El template de nota tiene **8 slots de estudios** organizados en 2 bloques:
- **Fecha anterior** (slots 0-2): Fecha 1 · QS · ESC
- **Fecha reciente** (slots 3-7): Fecha 2 · BH · QS · ESC · PFHs

Actualmente el botón "Agregar a nota" siempre escribe al bloque reciente.

### Solución: auto-detect con pregunta

**Comportamiento del botón "Agregar a nota":**

1. **Bloque reciente vacío** → llena slots 3-7 directamente (flujo actual, sin fricción)
2. **Bloque reciente con datos, bloque anterior vacío** → toast/modal: *"El bloque reciente ya tiene labs. ¿Qué hago?"* con 2 opciones:
   - **"Mover a fecha anterior"** → copia reciente → anterior (slots 3-7 → 0-2), escribe nuevos labs en reciente
   - **"Reemplazar fecha reciente"** → sobreescribe slots 3-7
3. **Ambos bloques con datos** → mismo modal pero opción "Reemplazar" solo afecta reciente

### Lógica de detección de "bloque vacío"
El bloque reciente está vacío si `noteLines[3]` (Fecha 2) es string vacío o placeholder del template.

### Slots mapping
```
noteLines[0] = Fecha 1 (dd/mm)
noteLines[1] = QS anterior (ej: "Glu 190 Cr 0.4 …")
noteLines[2] = ESC anterior (ej: "Na 139 Cl 105 …")
noteLines[3] = Fecha 2 (dd/mm)
noteLines[4] = BH (ej: "Hb 12.1 …")
noteLines[5] = QS reciente
noteLines[6] = ESC reciente
noteLines[7] = PFHs
```

### Modal de confirmación
Pequeño modal centrado (no alert nativo) con:
- Mensaje: `"El bloque reciente ya tiene datos del [fecha]. ¿Qué hago con los nuevos labs?"`
- Botón primario: `"Mover anterior + agregar reciente"` (verde)
- Botón secundario: `"Reemplazar fecha reciente"` (gris)
- Botón cancelar: `"×"` (esquina superior derecha)

---

## 3. 🎓 Onboarding interactivo

### Cuándo se activa
- Primera apertura de la app: `localStorage.getItem('rpc-onboarding-done')` es null
- También: botón **"Ver tutorial"** en la sección Mi Perfil del sidebar (permite repetirlo)

### Flujo — banner no-intrusivo

Barra fija en la parte superior del panel principal (debajo del header de tabs), color azul oscuro. Muestra: `"Tutorial — Paso X de 3: [instrucción]"` con botón `[Omitir tutorial]`. El paso 0 es la pantalla de bienvenida (sin numeración).

**Bienvenida** *(automático al cargar, sin número de paso)*
- El paciente demo "DEMO PÉREZ, Juan" ya aparece seleccionado en la sidebar
- Banner: `"Bienvenido a R+. Hemos cargado un paciente de ejemplo para mostrarte el flujo. →"`
- Botón: `"Empezar →"`

**Paso 2 — Parsear reporte** *(tab: Laboratorio)*
- El tab de Laboratorio está activo, el textarea tiene el reporte del paciente demo pre-cargado
- Banner: `"Paso 1 de 3 — Haz click en 'Parsear reporte' para extraer los valores de laboratorio."`
- Avanza automáticamente cuando se detectan labs parseados (`activeLab !== null`)

**Paso 3 — Agregar paciente** *(tab: Laboratorio, después de parsear)*
- Banner: `"Paso 2 de 3 — Excelente. Ahora haz click en '+ Agregar a nota' para cargar los labs."`
- Avanza cuando los labs se envían a la nota

**Paso 4 — Generar nota** *(tab: Nota)*
- Banner: `"Paso 3 de 3 — Los labs ya están en la nota. Llena los campos y haz click en 'Generar DOCX'."`
- Al generar el DOCX: confetti pequeño (CSS keyframes) + banner: `"¡Listo! Ya sabes usar R+."` + botón `"Cerrar tutorial"`
- Al cerrar: `localStorage.setItem('rpc-onboarding-done', '1')`, se destruye el paciente demo

### Paciente demo — datos fijos (hardcoded en JS)

```javascript
DEMO_PATIENT = {
  id: 'demo',
  nombre: 'DEMO PÉREZ',
  nombre2: 'Juan',
  edad: '67',
  sexo: 'M',
  cuarto: '101',
  cama: '1',
  dx: 'DM2, IRC estadio 3, HAS'
}

DEMO_LAB_REPORT = `
LABORATORIO CLÍNICO — Hospital General
Paciente: DEMO PÉREZ Juan
Fecha: 11/04/2026

BIOMETRÍA HEMÁTICA
Hemoglobina: 11.4 g/dL
Hematocrito: 34.8%
VCM: 86 fL
HCM: 28.2 pg
Leucocitos: 4.92 x10³/µL
Neutrófilos: 2.76 x10³/µL
Eosinófilos: 0.275 x10³/µL
Plaquetas: 198 x10³/µL

QUÍMICA SANGUÍNEA
Glucosa: 190 mg/dL
Creatinina: 1.8 mg/dL
BUN: 28 mg/dL
PCR: 0.3 mg/dL
Ácido Úrico: 6.2 mg/dL
Triglicéridos: 153 mg/dL
Colesterol Total: 166 mg/dL

ELECTROLITOS SÉRICOS
Sodio: 139.8 mEq/L
Cloro: 105 mEq/L
Potasio: 3.2 mEq/L
Calcio: 7.9 mg/dL
Fósforo: 3.4 mg/dL

PERFIL DE FUNCIÓN HEPÁTICA
Albúmina: 2.5 g/dL
AST: 11 U/L
ALT: 6 U/L
Fosfatasa Alcalina: 103 U/L
Bilirrubina Total: 0.3 mg/dL
Bilirrubina Directa: 0.1 mg/dL
Bilirrubina Indirecta: 0.2 mg/dL
LDH: 120 U/L
Amilasa: 25 U/L
`
```

### Destrucción del demo
- Al completar el tutorial O al hacer "Omitir tutorial": se llama `removePatient('demo')`, se borra el textarea del reporte
- El paciente demo **no persiste** entre sesiones (no se guarda en `rpc-patients`)

---

## Arquitectura de cambios

### Archivos a modificar
- `public/index.html` — todo el frontend (JS + HTML inline)

### Nuevas funciones JS a agregar
| Función | Feature | Descripción |
|---------|---------|-------------|
| `loadSettings()` | Settings | Lee `rpc-settings`, puebla campos del sidebar |
| `saveSettings()` | Settings | Persiste `rpc-settings`, aplica toast |
| `toggleProfileSection()` | Settings | Expande/colapsa sección Mi Perfil |
| `openTemplatesModal()` | Settings | Abre modal de edición de plantillas |
| `applyDefaultsToNewPatient()` | Settings | Se llama al crear paciente nuevo |
| `applyDefaultsToNewIndicaciones()` | Settings | Se llama al crear indicaciones nuevas |
| `checkStudiosAndInsertLabs(labs)` | Multilab | Detecta estado de slots, decide flujo |
| `showLabConflictModal(labs)` | Multilab | Muestra modal A/B/cancel |
| `moveRecentToAnterior()` | Multilab | Copia slots 3-7 → 0-2 |
| `startOnboarding()` | Onboarding | Inicializa demo patient, muestra paso 1 |
| `onboardingNext()` | Onboarding | Avanza al siguiente paso |
| `finishOnboarding()` | Onboarding | Confetti, marca done, destruye demo |
| `skipOnboarding()` | Onboarding | Destruye demo, oculta banner |

### Modificaciones a funciones existentes
| Función | Cambio |
|---------|--------|
| `savePatient()` | Llamar `applyDefaultsToNewPatient()` si hay settings |
| `enviarLabsANota()` | Llamar `checkStudiosAndInsertLabs()` en vez de escribir directo |
| `generateDocx()` (o equivalente) | Detectar si onboarding activo → trigger `finishOnboarding()` |
| `renderPatientList()` | Renderizar perfil Mi Perfil al fondo |

### Persistencia
```
rpc-settings     → { doctorName, profesorName, grado, defaultDieta, defaultCuidados, defaultMedicamentos }
rpc-onboarding-done → '1' (existe = ya hizo onboarding)
```
El paciente demo NO se guarda en `rpc-patients`.

---

## Criterios de éxito

- [ ] Settings persisten entre recargas
- [ ] Nuevo paciente se crea con médico/responsable pre-llenados
- [ ] "Agregar a nota" con bloque vacío: funciona igual que antes (sin interrupción)
- [ ] "Agregar a nota" con bloque ocupado: muestra modal, ambas opciones funcionan
- [ ] Primera apertura de la app: aparece paciente demo + banner paso 1
- [ ] Flujo completo de onboarding concluye con confetti y desaparece correctamente
- [ ] "Omitir tutorial" destruye demo sin afectar otros pacientes
- [ ] Botón "Ver tutorial" en Mi Perfil reinicia el onboarding

---

## Out of scope (este ciclo)
- Historial de notas generadas
- Vista previa antes de generar
- Plantillas de evolución
- Tendencias de laboratorio
- Búsqueda de pacientes
