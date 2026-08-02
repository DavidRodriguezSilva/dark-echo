## Context

Ver `proposal.md` para la motivación. En resumen: el motor actual (`AmbientDeclaration.layers`, compilado por `audio/layerCompiler.ts`) garantiza que una capa activa no puede alterar el volumen de otra (`audio-engine`, "Mezcla de capas con volumen independiente") — una garantía correcta para capas que pertenecen a un mismo `Source`, pero que hace imposible expresar un `Environment`/`Occlusion` compartido entre varios `Source`s sin romperla o sin duplicar el entorno una vez por cada `Source` que lo use. Este documento recoge las decisiones de una sesión de exploración extensa (`/opsx:explore`) que llegó a la conclusión de construir un motor nuevo en vez de forzar el actual.

La investigación previa que originó todo esto vive archivada en este mismo change, en `handoff-ambientes.md` (antes en la raíz del repositorio). Su encabezado marca qué partes quedaron superadas por estas decisiones y cuáles siguen vigentes como material de referencia — en particular el catálogo de candidatos de `Environment`/`Occlusion` por fenómeno, que alimenta el catálogo mínimo del piloto y los `Source`s posteriores.

## Goals / Non-Goals

**Goals:**
- Un motor donde `Source`, `Environment`, `Occlusion` y `Modifiers` son componentes desacoplados, cada uno capaz de sonar/funcionar aceptablemente en aislamiento.
- `Environment` y `Occlusion` como buses compartidos por escena, no propiedad de un `Source`.
- Un sistema de compatibilidad que oriente (puntuación + advertencia) sin bloquear nunca.
- Piloto validable de punta a punta con un único `Source` (`rain`) antes de invertir en más de uno.

**Non-Goals (de diseño, además de los ya listados en `proposal.md`):**
- No se fija en este documento la ubicación final del código nuevo dentro de `domain/`, `dsp/`, `audio/`, `commands/` — ver Decisión D7.
- No se diseña aquí el catálogo completo de `Environment`/`Occlusion`/`Modifiers` — `tasks.md` lo construye incrementalmente, empezando por el conjunto mínimo que valida cada requisito de las specs.
- No se resuelve cómo una interacción cruzada entre `Source`s (viento afectando la dirección aparente de la lluvia) se implementaría — well fuera de alcance mientras el piloto tenga un solo `Source`.

## Decisions

### D1 — Coexistencia por superficie de comandos separada, no reemplazo

El motor nuevo se alcanza por comandos propios; el motor actual y sus comandos (`play`, `add`, `remove`...) no cambian. Se descartó reemplazar `rain` directamente porque el motor nuevo es una arquitectura no probada — mantener el motor actual intacto preserva un resultado conocido y estable mientras el nuevo se valida, consistente con el principio original del proyecto de minimizar riesgo en la ruta ya probada.

### D2 — `Environment`/`Occlusion` como bus compartido de escena, no capas por `Source`

Confirmado tras varios contraejemplos durante la exploración: escenas como "océano + viento + lluvia desde un barco" necesitan que **un** `Environment` coloree a los tres `Source`s a la vez — si cada `Source` llevara su propia copia del entorno, no habría forma de garantizar que las tres copias sonaran igual, y se dispararía el costo de mantener N copias del mismo entorno. Esto también evita el choque con la garantía de independencia de capas de `audio-engine`: el bus es una etapa de procesamiento nueva por la que los `Source`s se enrutan, no una capa que altera a otra directamente.

**Alternativa descartada**: `Environment`/`Occlusion` como capas adicionales dentro de la declaración de cada `Source` (el enfoque del change abandonado `improve-rain-environment-occlusion`). Resuelve el caso de un solo `Source`, pero no generaliza a escenas multi-`Source` sin duplicar el entorno por cada uno — exactamente el problema que este motor nuevo existe para resolver.

### D3 — `Modifiers` por `Source`, no por escena

A diferencia de `Environment`/`Occlusion`, cada `Source` activo lleva su propio conjunto de `Modifiers` (distancia, dirección, movimiento). Justificación: en una escena con varios `Source`s, cada uno puede estar a su propia distancia/dirección aparente de forma simultánea e independiente (p. ej. "océano al fondo" mientras otro `Source` suena cerca) — agruparlos por escena en vez de por `Source` perdería esa expresividad.

### D4 — Intensidad excluida de `Modifiers`

La intensidad sigue siendo, sin excepción, una característica propia del `Source` — como ya lo es hoy en el catálogo (`rain` suave/media/fuerte/aguacero, etc.). Se decidió así explícitamente para evitar una ambigüedad real que surgió durante la exploración (un borrador de la filosofía del proyecto listó "Intensidad" como `Modifier`, contradiciendo la decisión ya tomada); queda fijado en `openspec/project.md` y en la capacidad `ambient-modifiers` para que no vuelva a reabrirse por accidente.

### D5 — Compatibilidad por coincidencia de etiquetas, nunca bloqueante

Se evaluó (a) una lista blanca por pares componente-a-componente, (b) coincidencia de etiquetas/rasgos, y (c) ninguna validación formal, solo criterio de quien cura el catálogo. Se eligió (b): escala mejor que una lista blanca a medida que el catálogo crece, y da una señal más rica que "ninguna validación" sin comprometerse a una taxonomía rígida. Se decidió explícitamente que la compatibilidad **nunca bloquea** — solo puntúa y, por debajo de un umbral, dispara una advertencia no bloqueante en la consola (capacidad `command-console`, requisito nuevo) — para no impedirle al usuario una combinación inusual pero deseada.

### D6 — Eje de compatibilidad de `Occlusion`: posicional/estructural, no material

Un intento inicial de puntuar la afinidad `Environment`↔`Occlusion` por coincidencia de material (madera con madera = alta afinidad) fue refutado por un contraejemplo concreto durante la exploración: una ventana de vidrio en una casa de concreto es la combinación *más* realista posible, no una de baja afinidad, precisamente porque una ventana es, por definición, un material distinto y más débil que la pared que la rodea. El eje que sobrevivió esa prueba es posicional/estructural: si el `Environment` activo tiene, de forma plausible, una superficie del tipo que la `Occlusion` representa (un campo abierto no tiene techo ni pared que ocluir; una casa sí tiene paredes y posiblemente una ventana).

### D7 — Límites de módulo, dejados abiertos deliberadamente

A diferencia del resto de decisiones, dónde vive el código nuevo dentro de `domain/`, `dsp/`, `audio/` y `commands/` no se fija en este documento. Se decidió explícitamente en la exploración que esto se plantea "orgánicamente" a medida que se construye, en vez de imponerse por adelantado — el motor nuevo es una arquitectura sin precedente en este repositorio y forzar una estructura de módulos antes de escribir el primer componente probablemente se equivocaría en algo que solo se ve al implementar. `tasks.md` incluye una tarea explícita para decidir esto antes de escribir el primer componente, no lo evita.

### D8 — Secuencia del piloto: un `Source` antes que composición multi-`Source`

El piloto se construye y valida con `rain` como único `Source`. Un `Source` adicional (para probar de verdad que `Environment`/`Occlusion` se comparten entre varios `Source`s a la vez, no solo en teoría) queda para un change posterior. Esto sigue el principio de "composición progresiva" de `openspec/project.md`: cada pieza se valida sola antes de exigirle que sostenga una composición más compleja — aquí aplicado también al *orden de construcción*, no solo al comportamiento en tiempo de ejecución.

### D9 — Una `Occlusion` no solo atenúa: puede aportar su propia respuesta sonora

`handoff-ambientes.md` señala la lluvia sobre un techo metálico como "un fenómeno de oclusión bien conocido y con identidad sonora propia". Modelar la `Occlusion` únicamente como atenuación + filtrado dejaría fuera precisamente el caso que más valor perceptual aporta al piloto de `rain`: estar bajo un techo no suena a lluvia con menos agudos, suena a lluvia *golpeando un techo*. Por eso una `Occlusion` puede declarar, además de su grado de atenuación, una respuesta excitada por el `Source` que incide sobre ella.

Esto no rompe la autonomía por componente ni convierte la `Occlusion` en un `Source`: la respuesta existe solo mientras un `Source` incide, escala con la intensidad de ese `Source`, y sin `Source` la `Occlusion` es muda — igual que un `Environment` sin nada que colorear. La distinción con un `Source` se mantiene: un `Source` se sostiene solo, una `Occlusion` no.

### D10 — La autonomía se define por familia, no de forma uniforme

Corolario de D9 y de la naturaleza de `Environment`: "cada componente debe funcionar en aislamiento" (`openspec/project.md`, composición progresiva) no puede significar lo mismo para las cuatro familias. Un `Source` es autónomo en sentido literal — suena solo. Un `Environment`, una `Occlusion` o un `Modifier` no producen sonido sin un `Source`, así que su criterio de autonomía es ser **validables con un único `Source` presente y ningún otro componente activo**. Se dejó explícito en la capacidad `ambient-composition-engine` porque la formulación uniforme original era literalmente inconsistente con D9 y con "el `Environment` es mudo sin `Source`".

## Risks / Trade-offs

- **[Riesgo]** Dos motores coexistiendo duplican superficie de mantenimiento (dos gramáticas de comandos, dos rutas de audio) → **Mitigación**: aceptado deliberadamente por D1 — el costo de mantener el motor actual intacto es el precio de no arriesgar la estabilidad de `rain`, `wind`, `river`, `ocean` mientras el motor nuevo se prueba. Si el piloto no se valida, el motor actual sigue siendo el producto sin cambios.
- **[Riesgo]** El vocabulario de etiquetas de compatibilidad (D5/D6) se define con un catálogo mínimo (ver `tasks.md`); podría no generalizar cuando el catálogo de `Environment`/`Occlusion` crezca más allá del piloto → **Mitigación**: es exactamente el tipo de ajuste que D7 deja abierto a propósito; revisar el vocabulario es más barato que haberlo sobre-diseñado antes de tener un segundo o tercer entorno real con el que contrastarlo.
- **[Riesgo]** Sin bloqueo de compatibilidad (D5), una combinación genuinamente sin sentido queda a un clic de distancia → **Mitigación**: decisión de producto explícita, no un descuido — se prefiere no bloquear al usuario sobre prevenir un resultado raro; la advertencia es la barrera, no un rechazo.

## Migration Plan

No hay migración de datos ni de escenas guardadas: el motor actual no cambia, y el motor nuevo empieza sin escenas persistidas propias. El despliegue es puramente aditivo — no hay paso de "reemplazo" que revertir; si el piloto no convence, se retira el comando de acceso al motor nuevo sin afectar el catálogo actual.

## Open Questions

- **Límites de módulo exactos** (D7): qué vive en `domain/` vs. un espacio nuevo, y si el motor nuevo necesita su propio `AudioWorklet` o reutiliza el compilador de capas actual. No cambia ninguna spec — todas están escritas a nivel de comportamiento observable, no de estructura interna.
- **Gramática de comandos exacta** del motor nuevo (nombres de verbos, sintaxis). Las specs ya fijan el comportamiento requerido (coexistencia, advertencias no bloqueantes) sin depender de la sintaxis concreta.
- **Vocabulario de etiquetas** para la puntuación de compatibilidad (D5/D6) más allá de los ejemplos ilustrativos usados durante la exploración (madera, concreto, vidrio, construido/natural). Se define en `tasks.md` al construir el catálogo mínimo del piloto.
- **Umbral numérico** de afinidad por debajo del cual se dispara la advertencia (`ambient-compatibility`). Se calibra empíricamente contra los primeros `Environment`/`Occlusion` reales, no se fija a priori.
- **Mecanismo de síntesis de un `Environment`** — heredada sin resolver de `handoff-ambientes.md` (pregunta abierta 2): ¿reverberación convolucional con una respuesta al impulso por entorno, un banco de filtros paramétrico, o capas de síntesis adicionales condicionadas al entorno activo? Es la única de las cinco preguntas de aquel documento que este change no cierra, porque es una decisión de investigación de síntesis, no de arquitectura. `tasks.md` la resuelve antes de declarar el primer `Environment`, con la disciplina que `docs/synthesis-reference.md` ya exige (unidades físicas, rangos, criterios de aceptación medibles).
- **Mecanismo de la respuesta sonora de una `Occlusion`** (D9): si se modela como un `Source` secundario excitado por el principal, como un filtro resonante sobre la señal del `Source`, o como una capa propia de la oclusión. Misma disciplina y mismo momento que la anterior.
- **Interacciones cruzadas entre `Source`s** (viento→lluvia, lluvia→fuego...): `handoff-ambientes.md` conserva el catálogo completo de las identificadas. Están fuera de alcance mientras el piloto tenga un solo `Source`, pero son la razón por la que `Environment`/`Occlusion` se diseñan compartidos desde ya — un diseño por `Source` las haría imposibles más adelante.
