## Why

El modelo actual (`AmbientDeclaration` = un `id` con sus `layers`) no puede expresar un entorno u oclusión que se comparta entre varios `Source`s activos a la vez — una lluvia y un viento sonando juntos en una misma cabaña necesitarían que cada uno declarara su propia copia del mismo entorno, y `audio-engine` ya prohíbe que una capa altere el volumen de otra activa, así que tampoco puede resolverse acoplando capas dentro de un mismo ambiente. La investigación previa (`handoff-ambientes.md`, archivada dentro de este change) documentó la brecha (`Environment`/`Occlusion` no existen en `domain/`) pero dejó la decisión de arquitectura abierta; una exploración posterior (ver `openspec/project.md`, sección "Filosofía de diseño del motor de audio procedural") concluyó que la opción de menor riesgo — capas adicionales dentro de la declaración de cada ambiente — resuelve el caso de un solo `Source` pero no escala a escenas con varios `Source`s compartiendo el mismo espacio, y que construir eso ahora sobre el motor actual generaría más trabajo de reversión que construir un motor nuevo desde el principio. Este change introduce ese motor nuevo, coexistente con el actual, pilotado únicamente en `rain`.

## What Changes

- Nuevo motor de composición, alcanzable por comandos propios, **coexistente** con el motor actual — no lo reemplaza. `rain`, `wind`, `river`, `ocean` y los ruidos de color siguen sonando exactamente igual que hoy por sus comandos actuales (`play`, `add`, `remove`...).
- El `Source` de `rain` (sus capas `cuerpo`/`impactos`/`goteo` ya existentes y validadas) se vuelve reproducible también a través del motor nuevo, sin modificar su propio timbre.
- `Environment`: un bus compartido por escena — como mucho uno activo a la vez, coloreando a cualquier `Source` que esté sonando por el motor nuevo, en vez de una capa privada de un ambiente.
- `Occlusion`: igual que `Environment`, compartida por escena — la barrera entre el oyente y el espacio, no propiedad de un `Source`. Su compatibilidad con un `Environment` se evalúa por presencia estructural/posicional (¿ese entorno tiene una superficie de ese tipo entre el oyente y la fuente?), no por coincidencia de material. Además de atenuar y filtrar, una `Occlusion` puede aportar su propia respuesta sonora excitada por el `Source` — estar bajo un techo no es lluvia con menos agudos, es lluvia golpeando un techo.
- `Modifiers`: parámetros por `Source` (distancia, dirección, movimiento aparente) — cada `Source` activo lleva los suyos. La intensidad **no** es un `Modifier`: sigue siendo una característica propia de cada `Source`, como ya es hoy.
- `Compatibility`: coincidencia de etiquetas entre `Environment`/`Occlusion`/`Modifiers` y el `Source`, con una puntuación de afinidad. **Nunca bloquea** — una combinación de baja afinidad se permite igual y produce una advertencia visible en la consola normal, no un rechazo.
- **Fuera de alcance de este change**: cualquier `Source` adicional (`wind`, `river`, `ocean`, `fuego`) en el motor nuevo; cualquier interacción cruzada entre `Source`s (p. ej. viento→lluvia); el catálogo final de entornos/oclusiones (se construye incrementalmente, ver `tasks.md`); la gramática exacta de comandos y los límites de módulo (`domain/`, `dsp/`, `audio/`, `commands/`) del motor nuevo, que se definen orgánicamente durante la implementación en vez de fijarse por adelantado (ver `design.md`); la validación objetiva contra grabaciones reales que menciona `openspec/project.md` como evolución futura.
- Supersede al change abandonado `improve-rain-environment-occlusion` (capas dentro de la declaración de `rain`, sin motor nuevo) — se eliminó en vez de reescribirse porque casi nada de su contenido sobrevive al cambio de dirección.

## Capabilities

### New Capabilities

- `ambient-composition-engine`: el motor nuevo en sí — coexistencia con el motor actual, alcance del piloto limitado a `rain`, garantías de mezcla equivalentes a las de `audio-engine`, y el principio de autonomía por componente (cada pieza suena/funciona bien aislada antes de combinarse).
- `ambient-environment`: `Environment` como bus compartido de escena.
- `ambient-occlusion`: `Occlusion` como barrera compartida de escena, con su eje de compatibilidad posicional/estructural.
- `ambient-modifiers`: `Modifiers` como parámetros por `Source`, excluyendo explícitamente la intensidad.
- `ambient-compatibility`: puntuación por coincidencia de etiquetas y advertencia no bloqueante.

### Modified Capabilities

- `command-console`: nueva capacidad de mostrar una advertencia no bloqueante en la salida normal cuando el usuario compone una combinación de baja afinidad.

## Impact

- Código nuevo para el motor de composición — su ubicación exacta dentro de `domain/`, `dsp/`, `audio/`, `commands/` se decide durante la implementación (ver `design.md`), no en este documento.
- `docs/synthesis-reference.md` gana entradas para los modelos de síntesis que respalden los `Environment`/`Occlusion` que se construyan.
- `src/domain/ambients/rain.ts` (motor actual) no se modifica — el `Source` de `rain` se reutiliza, no se reescribe.
- Sin cambios en `wind`, `river`, `ocean`, ruidos de color, ni en sus comandos actuales.
- `handoff-ambientes.md` deja de estar suelto en la raíz del repositorio y queda archivado dentro de este change, con un encabezado que distingue qué quedó superado por estas decisiones y qué sigue vigente como investigación de referencia.
- `docs/ambient-catalog-roadmap.md` gana la relectura que propone ese documento: **bosques** probablemente no necesita un `Source` propio, sino que es un `Environment` reutilizable por `rain` y `wind`, lo que reduce el trabajo de investigación pendiente del catálogo.
