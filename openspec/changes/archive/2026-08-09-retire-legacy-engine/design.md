## Context

El motor de composición ya alcanza todo el catálogo y sostiene varios
`Source` a la vez (`add-multi-source-composition`). El propietario confirmó
la comparación perceptual A/B el 2026-08-09: ambos motores suenan igual, y
los defectos que quedan son los mismos en los dos —es decir, defectos de los
ambientes, no del motor—. Con eso se cumple la condición que el piloto puso
para poder retirar el motor actual.

Retirarlo no es solo borrar dos archivos y redirigir comandos. `AmbientMixer`
sostiene hoy cosas que el motor de composición nunca tuvo que resolver
porque el otro motor las cubría:

- La mezcla conservada tras `stop`, reanudable con `play` sin argumento.
- Los cuatro estados observables de reproducción (vacío, detenido, sonando,
  suspendido) y la reacción a `visibilitychange`.
- El volumen por capa, direccionable como `"<ambiente>.<capa>"`.
- El formato de escena que `scene save/load` y el recuerdo de la última mezcla
  persisten.

Todo eso hay que absorberlo, no descartarlo: son requisitos vigentes de
`command-console`, `session-persistence` y `offline-playback`.

Se suma un problema que el propietario planteó al revisar la gramática, y que
este change trata como parte del mismo trabajo: **la consola deja ejecutar
comandos pero no ayuda a descubrirlos**. Sin saberse de memoria qué entornos
y qué oclusiones existen, armar una escena es adivinar. Renombrar verbos no
lo arregla; solo cambia lo que hay que memorizar.

## Goals / Non-Goals

**Goals**

- Un único motor de audio, sin pérdida de ninguna capacidad declarada.
- Una gramática donde cada cosa se hace de una sola forma.
- Que la consola sugiera qué se puede combinar, en el momento en que sirve.
- Que las escenas guardadas con el motor anterior sigan cargando.

**Non-Goals**

- El modo de interfaz visual: es el change `add-visual-control-mode`, que
  depende de que este aterrice primero (la gramática y el estado observable
  tienen que estar quietos antes de construir una UI sobre ellos).
- Hacer variable la intensidad de un `Source`. Sigue siendo el trabajo
  siguiente y sigue siendo lo que le falta a la composición progresiva para
  cerrarse, pero es trabajo sobre los `Source`, no sobre el motor.
- Corregir los defectos que el propietario oyó en la escucha A/B. Están en los
  ambientes, son anteriores a este change y sobreviven a él sin cambiar.

## Decisions

### D1 — `compose` se conserva, pero cambia de significado

Decisión del propietario, y da un reparto más legible que el que se había
propuesto (promover `environment`/`occlusion` a primer nivel):

- `play` / `add` / `remove` / `stop` / `reset` / `volume` gobiernan **los
  sonidos**: qué suena y a qué volumen.
- `compose …` gobierna **el espacio donde suenan**: `compose environment`,
  `compose occlusion`, `compose modifier`, `compose distance`, más
  `compose list` y `compose status`.

`compose` deja de significar "el otro motor" y pasa a significar "los
componentes de la escena". No queda ningún verbo huérfano ni ninguna acción
alcanzable por dos caminos.

**Consecuencia**: `compose source`, `compose remove`, `compose stop` y
`compose volume` se retiran. Con un solo motor duplicaban exactamente a `add`,
`remove`, `stop` y `volume`. Mantener dos formas de hacer lo mismo es
precisamente la confusión que este change viene a quitar.

**Alternativa descartada**: retirar `compose` por completo y subir
`environment`/`occlusion`/`modifier`/`distance` a comandos de primer nivel.
Era la recomendación inicial, pero deja cuatro verbos sueltos sin nada que los
agrupe, y `distance` a secas no dice sobre qué actúa. El prefijo `compose`
hace de categoría y el autocompletado lo aprovecha: escribir `compose` y
tabular enumera los componentes de escena, que es exactamente la pregunta que
el usuario tiene.

### D2 — La escena crece a versión 2, y la versión 1 se sigue leyendo

Una escena era `{ layers: Record<"<ambiente>.<capa>", volumen> }`. Ahora tiene
que capturar también el `Environment`, la `Occlusion` y los `Modifiers`
activos, porque si no, cargar una escena guardada dejaría la mitad de la
composición fuera:

```ts
interface Scene {
  layers: Record<string, number>;
  environment?: string | null;
  occlusion?: string | null;
  modifiers?: Record<string, { id: string; meters: number }>; // por Source
}
```

La compatibilidad hacia atrás sale gratis y no por casualidad: el id de capa
`"<ambiente>.<capa>"` es **idéntico** en los dos motores, porque el motor de
composición reutiliza las mismas declaraciones de `domain/ambients/`. Una
escena v1 es, literalmente, una escena v2 sin componentes de escena. La
migración es una ampliación de campos opcionales, sin pérdida y sin acción del
usuario.

**Alternativa descartada**: invalidar las escenas v1 y avisar al usuario. Se
descartó porque no hay ninguna incompatibilidad real que lo justifique —
sería tirar datos del usuario por comodidad de implementación.

### D3 — El ciclo de reproducción se absorbe en `CompositionEngine`, no en una clase intermedia

Se consideró conservar `AmbientMixer` como fachada delgada sobre el motor
nuevo, para no mover el ciclo de reproducción. Se descartó: dejaría dos
fuentes de verdad del estado observable —el mixer y el motor— y el proyecto ya
tiene una regla explícita de que el panel de estado nunca puede mostrar algo
distinto de lo que realmente suena. Dos snapshots que hay que mantener
sincronizados son exactamente la forma en que esa garantía se rompe.

`CompositionEngine` pasa a exponer un snapshot único con la forma que la UI ya
consume, ampliado con los componentes de escena:

```ts
interface PlaybackSnapshot {
  mix: { kind: "empty" } | { kind: "stopped" | "playing" | "suspended"; layers: LayerSnapshot[] };
  masterVolume: number;
  environment: { id: string } | null;
  occlusion: { id: string } | null;
  sources: CompositionSourceSnapshot[];
}
```

### D4 — El volumen por capa obliga a direccionar capas, no solo `Source`

`command-console` declara `volume <capa> <valor>` y `remove <capa>`, y
`session-persistence` exige restaurar "las mismas capas con los mismos
volúmenes". Así que el motor tiene que seguir direccionando capas
individuales por su id compuesto, no solo `Source` enteros.

`ActiveSource.layers` pasa de `Map<string, CompiledLayer>` a guardar también
el volumen vigente de cada capa. `volume rain 0.4` (un `Source` entero) y
`volume rain.cuerpo 0.4` (una capa) se resuelven ambos, igual que hacía
`AmbientMixer.setLayerVolume`.

### D5 — Las sugerencias se calculan en `domain/`, puras y testeables

La lógica de "qué se puede combinar ahora" es una función de datos: recibe qué
está activo y devuelve qué se ofrece, con una marca de afinidad por opción. No
toca Web Audio ni React, así que vive en `domain/composition/suggestions.ts`
y se prueba en Node, sin navegador.

```ts
function suggestNext(state: {
  sourceIds: string[];
  environmentId: string | null;
  occlusionId: string | null;
}): SuggestionGroup[];
```

`commands/` la invoca y la formatea; `audio/` no la conoce. Respeta la
dirección de dependencias que `eslint.config.js` hace cumplir.

### D6 — Las sugerencias marcan la afinidad, no la filtran

Decisión del propietario, y es la coherente con lo ya decidido: la
compatibilidad advierte pero no bloquea (design.md D5 del piloto). Si una
combinación de baja afinidad se puede ejecutar, esconderla de las sugerencias
sería contradictorio — el usuario que quiere probar una barrera rara a
propósito no encontraría cómo.

Cada opción se lista con su marca: las que encajan con la escena activa se
distinguen de las que se aplicarán igual pero avisando. La marca se deriva de
`scoreOcclusionAgainstEnvironment`, la misma función que ya decide la
advertencia — no hay un segundo criterio de afinidad que pueda divergir del
primero.

### D7 — La sugerencia acompaña a la respuesta, no ocupa la pantalla

Se muestra tras las órdenes que **cambian la escena**, no tras todas. `help`,
`list`, `status`, `clear`, `theme` o `scene list` no la llevan: no cambian qué
suena, así que no hay un "siguiente" que ofrecer. Sugerir en cada línea
convertiría el aviso en ruido, y el ruido se deja de leer.

## Risks / Trade-offs

- **[Riesgo]** Absorber el ciclo de reproducción toca la ruta que sostiene la
  restauración de sesión y la suspensión del navegador — fallos que no se ven
  en tests unitarios y sí en uso real → **Mitigación**: los escenarios de
  `session-persistence` y `offline-playback` se trasladan como tests sobre el
  motor nuevo antes de borrar el viejo, no después.
- **[Riesgo]** Borrar `AmbientMixer` y `WorkletEngine` elimina la referencia
  A/B → **Aceptado explícitamente por el propietario**, que ya hizo la
  comparación. Además el historial de git la conserva si hiciera falta
  reconstruirla.
- **[Trade-off]** El snapshot único crece y mezcla dos preocupaciones (estado
  de reproducción y composición de escena) → **Aceptado**: es una sola fuente
  de verdad, que es exactamente la propiedad que se quiere. Partirlo en dos
  reintroduciría el problema que D3 evita.

## Migration Plan

1. El motor de composición absorbe el ciclo de reproducción y el volumen por
   capa, con sus tests, **mientras el motor actual sigue en el repositorio**.
2. Los comandos se redirigen al motor de composición.
3. Solo cuando 1 y 2 están en verde se borran `ambientMixer.ts`,
   `workletEngine.ts` y sus tests.

Ese orden importa: hasta el paso 3 el change es reversible sin pérdida, y los
tests del motor viejo siguen sirviendo de red mientras se traslada su
comportamiento.

**Datos**: las escenas y la última mezcla en v1 se leen sin intervención (D2).
No hay paso de migración que ejecutar ni que revertir.

## Open Questions

- **Qué hacer con los defectos compartidos** que el propietario oyó en la
  escucha A/B. No están caracterizados todavía —"algunos errores, los mismos
  en ambos motores"— y corregirlos exige primero saber cuáles son. Queda para
  un change posterior, una vez haya un solo motor sobre el que trabajar.
- **Si la sugerencia debe recordar lo ya ofrecido** para no repetirse cuando
  el usuario encadena varias órdenes sin cambiar de escena. Se implementa sin
  memoria en esta entrega, por simplicidad; si la repetición molesta en uso
  real, es un ajuste local a `suggestNext`.
