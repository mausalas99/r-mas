# Copy Labs + Plantilla SOAP — Spec de diseño

**Fecha:** 2026-04-12
**Versión objetivo:** 1.5.0
**Features:** 📋 Botón "Copiar labs" · 📝 Plantilla de Evolución SOAP

---

## 1. 📋 Fix: Botón "Copiar labs"

### Qué hace
Agrega un botón "Copiar" en el header del card `#lab-output-section` (header morado `#312E81`), a la **izquierda** del botón "Enviar a nota". Copia el texto formateado de los labs al portapapeles — útil para pegar en SOME, WhatsApp u otro sistema sin necesitar un paciente activo.

### Comportamiento
- Llama `buildLabLines()` (misma función que usa `enviarLabsANota`) para obtener las líneas formateadas
- Une las líneas con `\n` y copia via `navigator.clipboard.writeText()`
- Toast éxito: `"Labs copiados al portapapeles ✓"`
- Si no hay `activeLab` con resultados: toast error `"No hay resultados procesados"` (igual que "Enviar a nota")
- **No requiere paciente activo** — funciona con solo tener labs parseados

### HTML del botón
Mismo estilo visual que el botón "Enviar a nota" existente: `background:rgba(255,255,255,0.15)`, borde blanco tenue, texto blanco, `border-radius:6px`. Icono de clipboard (SVG inline). Se ubica en el `span` de botones del header, antes de "Enviar a nota".

### Nueva función JS
```javascript
function copiarLabsAlPortapapeles() {
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    showToast('No hay resultados procesados', 'error'); return;
  }
  var text = buildLabLines().join('\n');
  navigator.clipboard.writeText(text)
    .then(function() { showToast('Labs copiados al portapapeles ✓', 'success'); })
    .catch(function() { showToast('Error al copiar', 'error'); });
}
```

---

## 2. 📝 Feature: Plantilla de Evolución SOAP

### Qué hace
Botón "Plantilla SOAP" en el header del card de Evolución (verde `#065F46`) que abre un modal con un formulario estructurado. El médico llena los campos clínicos y presiona "Insertar en evolución" para generar el texto formateado automáticamente en el textarea.

### Trigger
Botón en el header del card verde de Evolución, mismo estilo que otros botones de header de la app. Texto: "Plantilla SOAP" con icono de pulso (SVG).

### Flujo
1. Click en "Plantilla SOAP"
2. Si `notes[activeId].evolucion` tiene contenido → modal de confirmación:
   - Mensaje: `"La evolución ya tiene contenido. ¿Reemplazarlo con la plantilla?"`
   - Botón primario: `"Reemplazar"` (verde)
   - Botón cancelar: `"Cancelar"` (gris)
3. Se abre el modal del formulario SOAP
4. Usuario llena campos y presiona "Insertar en evolución"
5. Se genera texto → se escribe en `notes[activeId].evolucion` → se actualiza el textarea → `saveState()` → se cierra el modal → toast `"Plantilla insertada ✓"`

### Modal — estructura visual
- **Header:** verde `#065F46`, título "Plantilla de Evolución", botón × para cerrar
- **Body:** `overflow-y:auto`, `flex:1` — scrolleable
- **Secciones:** cada sección tiene `flex-shrink:0` (mismo fix que laboratoriazo) para que no se compriman
- **Footer:** `flex-shrink:0`, botones "Cancelar" y "Insertar en evolución"

### Campos del formulario

#### S — Subjetivo
| Campo | Tipo | Notas |
|-------|------|-------|
| Subjetivo | `textarea` rows=2 | Libre, sin `text-transform:uppercase` |

#### N — Neurológico
| Campo | Tipo | Placeholder |
|-------|------|-------------|
| FOUR Score | `number` | 16 |
| Esferas | `number` | 3 |
| Analgesia | `text` uppercase | PARACETAMOL 1G IV C/8H |

#### V — Ventilatorio
| Campo | Tipo | Notas |
|-------|------|-------|
| FR (rpm) | `number` | — |
| SatO2 (%) | `number` | — |
| Soporte O2 | `select` | Opciones: Aire ambiente / Puntillas nasales / Alto flujo / VM no invasiva |

#### HD — Hemodinámico
| Campo | Tipo | Notas |
|-------|------|-------|
| TAS (mmHg) | `number` | — |
| TAD (mmHg) | `number` | — |
| FC (lpm) | `number` | — |
| Antihipertensivos | `text` uppercase | Placeholder: NINGUNO |
| Vasopresores | `text` uppercase | Placeholder: NINGUNO |

#### HI — Infeccioso / Térmico
| Campo | Tipo | Notas |
|-------|------|-------|
| Temperatura (°C) | `number` step=0.1 | — |
| Antibióticos | `text` uppercase | Placeholder: NINGUNO \| MED DOSIS VÍA C/XH DÍA X DE X |

#### NM — Nutricional / Metabólico
| Campo | Tipo | Notas |
|-------|------|-------|
| Dieta | `text` uppercase | — |
| Kcal/kg | `number` | — |
| Total Kcal | `number` | — |
| Peso (kg) | `number` | — |
| Ingresos (cc) | `number` | — |
| Egresos (cc) | `number` | — |
| Balance (cc) | `text` readonly | Calculado: ingresos − egresos, prefijo `+` si positivo |
| Glucometría 1 | `number` | — |
| Glucometría 2 | `number` | — |
| Glucometría 3 | `number` | — |

### Generación del texto — `buildSOAPText(fields)`

Todos los campos de texto se escriben en **MAYÚSCULAS**. Los campos vacíos se insertan como `___`.

```
S: [subjetivo]

N: FOUR [score]/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN [esferas] ESFERAS, ALERTA || ANALGESIA CON [analgesia]
V: FR [fr] RPM, SATO2 [sat]% AL [soporte] | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS
HD: ESTABLE, TA [tas]/[tad] MMHG, FC [fc] LPM || ANTIHIPERTENSIVOS: [antihta] || VASOPRESORES: [vasop]
HI: AFEBRIL, TEMPERATURA [temp] °C || ANTIBIÓTICOS: [abx]
NM: DIETA [dieta] CALCULADA A [kcalkg] KCAL/KG ([kcal] KCAL) PARA PESO DE [peso] KG || INGRESOS [ing] CC, EGRESOS [egr] CC, BALANCE [balance] CC || GLUCOMETRÍAS CAPILARES ([glu1], [glu2], [glu3] MG/DL) || RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE
```

### Balance automático
`oninput` en los campos Ingresos y Egresos → `updateSOAPBalance()` → calcula `ingresos - egresos` → actualiza el campo Balance (readonly). Si positivo: `+250`, si negativo: `-50`.

### Campos vacíos
Cualquier campo que quede vacío al generar → se inserta `___` en su lugar para que sea obvio visualmente lo que falta en la nota.

### Nuevas funciones JS
| Función | Descripción |
|---------|-------------|
| `openSOAPModal()` | Verifica contenido existente en evolución → muestra confirmación si aplica → abre modal |
| `closeSOAPModal()` | Cierra modal y limpia todos los campos del formulario |
| `buildSOAPText(fields)` | Recibe objeto con todos los valores del form, retorna string formateado |
| `insertSOAPText()` | Llama `buildSOAPText` → escribe en `notes[activeId].evolucion` → actualiza textarea → `saveState()` → `closeSOAPModal()` → toast |
| `updateSOAPBalance()` | Calcula ingresos − egresos, actualiza campo readonly en tiempo real |

### Nuevo HTML
Backdrop + modal con clases `.soap-modal-backdrop` / `.soap-modal`, siguiendo el patrón de `lab-conflict-modal` y `templates-modal` ya existentes en el código.

### Modificaciones a funciones existentes
Ninguna — el botón es nuevo y el modal es independiente. Solo se agrega el botón al HTML del card de evolución en `renderNoteForm()`.

---

## Arquitectura de cambios

### Archivos a modificar
- `public/index.html` — único archivo (JS + HTML inline)

### Resumen de cambios
| Área | Cambio |
|------|--------|
| HTML — header `#lab-output-section` | Agregar botón "Copiar" a la izquierda de "Enviar a nota" |
| HTML — card evolución en `renderNoteForm()` | Agregar botón "Plantilla SOAP" en el header verde |
| HTML — modales | Agregar backdrop + modal `.soap-modal-backdrop` al final del body |
| CSS | Estilos `.soap-modal-backdrop`, `.soap-modal` (siguiendo patrón existente) |
| JS | Agregar 6 funciones nuevas: `copiarLabsAlPortapapeles`, `openSOAPModal`, `closeSOAPModal`, `buildSOAPText`, `insertSOAPText`, `updateSOAPBalance` |

---

## Criterios de éxito

- [ ] Botón "Copiar" aparece en header morado de Resultados, a la izquierda de "Enviar a nota"
- [ ] Copiar labs sin paciente activo funciona y muestra toast correcto
- [ ] Copiar labs sin resultados parseados muestra error
- [ ] Botón "Plantilla SOAP" aparece en header verde de Evolución
- [ ] Si evolución vacía: abre modal directamente sin confirmación
- [ ] Si evolución con texto: muestra confirmación antes de abrir modal
- [ ] Balance se calcula automáticamente al cambiar ingresos/egresos
- [ ] Campos vacíos generan `___` en el texto insertado
- [ ] Texto generado está en MAYÚSCULAS
- [ ] Secciones del modal no se comprimen (flex-shrink:0)
- [ ] Modal scrollea correctamente en pantallas pequeñas
- [ ] "Insertar en evolución" actualiza textarea y persiste con saveState()

---

## Out of scope (este ciclo)
- Vista previa antes de generar DOCX
- Plantillas personalizables por servicio
- Tendencias de laboratorio
- Rescates de insulina como campo configurable (texto fijo por ahora)
