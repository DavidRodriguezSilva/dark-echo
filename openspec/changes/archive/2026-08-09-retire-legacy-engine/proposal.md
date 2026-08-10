# Change: Retirar el motor de ambientes y dejar el de composición como único motor

## Why

El motor de composición ya alcanza todo el catálogo, sostiene varios `Source`
a la vez y ha pasado la comparación perceptual A/B contra el motor actual: el
propietario confirmó (2026-08-09) que ambos suenan igual, y que los defectos
que quedan son **los mismos en los dos motores**, es decir, defectos de los
ambientes y no del motor que los reproduce.

Con eso, la razón que justificaba la coexistencia desaparece. Los dos motores
se mantuvieron en paralelo deliberadamente (design.md D1 del piloto) para no
arriesgar la estabilidad del catálogo mientras el motor nuevo se probaba, y
para conservar una referencia A/B. Ya no hace falta ninguna de las dos cosas,
y el coste de mantenerlas sí sigue: dos gramáticas de comandos, dos rutas de
audio, dos fuentes de verdad del estado de reproducción, y dos límites de
capas distintos (8 y 12).

Retirarlo además desbloquea el trabajo siguiente. Mejorar los defectos
compartidos —empezando por hacer variable la intensidad de un `Source`, que
es lo que le falta a la composición progresiva para cerrarse— es trabajo
sobre un motor, no sobre dos.

## What Changes

- La gramática clásica pasa a operar el motor de composición, con la
  semántica que `command-console` ya declara y sin cambios para el usuario:
  `play`, `add`, `remove`, `stop`, `reset`, `volume`, `list`, `status`,
  `scene`, `help`, `clear`.
- `compose` **se conserva**, pero cambia de significado: deja de ser "el otro
  motor" y pasa a ser el espacio de nombres de los **componentes de escena**
  —`compose environment`, `compose occlusion`, `compose modifier`,
  `compose distance`, más `compose list`/`compose status`—. El reparto queda
  legible: `play`/`add`/`remove` gobiernan los sonidos, `compose` gobierna el
  espacio donde suenan.
- **BREAKING**: `compose source`, `compose remove`, `compose stop` y
  `compose volume` desaparecen. Con un solo motor duplican exactamente a
  `add`, `remove`, `stop` y `volume`, y mantener dos formas de hacer lo mismo
  es justo la confusión que este change viene a quitar.
- **La consola pasa a sugerir qué se puede combinar.** Hoy deja ejecutar
  comandos pero no ayuda a descubrirlos: sin saberse de memoria los entornos y
  las oclusiones disponibles, armar una escena es adivinar. Cada orden que
  cambia la escena responde ahora con una línea de "siguiente" que lista lo
  combinable, marcando lo que encaja con la escena activa sin ocultar lo que
  no (coherente con "advertir sin bloquear", design.md D5 del piloto).
- El motor de composición **absorbe el ciclo de reproducción** que hoy vive en
  `AmbientMixer`: mezcla conservada tras `stop` y reanudable con `play` sin
  argumento, estados observables (vacío / detenido / sonando / suspendido),
  reacción a la suspensión impuesta por el navegador, y volumen por capa.
- **BREAKING (formato persistido)**: una escena deja de ser solo un conjunto
  de capas con volumen y pasa a incluir el `Environment`, la `Occlusion` y los
  `Modifiers` activos. El formato sube a la versión 2. Las escenas guardadas
  en v1 se siguen cargando (ver `design.md` D2): sus ids de capa
  `"<ambiente>.<capa>"` son los mismos en ambos motores, así que la migración
  es una ampliación sin pérdida y sin acción del usuario.
- Se eliminan `src/audio/ambientMixer.ts`, `src/audio/workletEngine.ts` y sus
  tests. Con ellos desaparece `MAX_SIMULTANEOUS_LAYERS` (8); el límite pasa a
  ser el medido del motor de composición (12).

## Impact

- Affected specs:
  - `command-console` — el vocabulario clásico se conserva; `compose` se
    redefine como espacio de los componentes de escena; y se añade la
    sugerencia contextual como requisito de descubribilidad.
  - `session-persistence` — una escena pasa a incluir los componentes de
    escena; se declara la compatibilidad hacia atrás.
  - `ambient-composition-engine` — el motor deja de ser "coexistente" y pasa a
    ser el único; absorbe el ciclo de reproducción.
  - `audio-engine` — las garantías siguen siendo las mismas, pero las cumple
    un solo motor.
- Affected code: `src/audio/ambientMixer.ts` y `src/audio/workletEngine.ts`
  (eliminados), `src/audio/composition/compositionEngine.ts`,
  `src/commands/commands.ts`, `src/domain/scene.ts`,
  `src/platform/lastMix.ts`, `src/platform/sceneStore.ts`, `src/ui/App.tsx`,
  `src/ui/StatusBar.tsx`, `src/ui/TouchControls.tsx`.
- **Reversión**: revertir el change devuelve los dos motores. No hay pérdida
  de datos al revertir, porque el lector de escenas v2 se añade sin retirar el
  de v1.
