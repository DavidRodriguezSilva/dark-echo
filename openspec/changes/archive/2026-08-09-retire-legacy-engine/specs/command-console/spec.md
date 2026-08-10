## MODIFIED Requirements

### Requirement: Vocabulario de comandos y semántica de la mezcla

El sistema SHALL ofrecer un vocabulario estable con esta semántica, y ningún comando SHALL tener sobre la reproducción un efecto distinto del declarado:

- `play <ambiente>` — sustituye la mezcla activa por el ambiente indicado.
- `play` sin argumento — reanuda la mezcla conservada tras un `stop`.
- `add <ambiente|capa>` — incorpora a la mezcla activa sin retirar lo que ya suena.
- `remove <capa>` — retira una capa de la mezcla activa.
- `stop` — desvanece la reproducción y **conserva** la composición de la mezcla.
- `reset` — vacía la mezcla activa.
- `volume <valor>` — fija el volumen maestro; `volume <capa> <valor>` fija el de una capa.
- `list` — muestra el catálogo de ambientes; `status` muestra la mezcla activa y sus volúmenes.
- `scene save|load|list|delete <nombre>` — gestiona las escenas guardadas.
- `help [<comando>]` — muestra la ayuda.
- `clear` — vacía la salida de la consola sin afectar a la reproducción.

Los componentes que definen el espacio donde suena la mezcla —recinto, barrera y parámetros por sonido— SHALL agruparse bajo el prefijo `compose`, distinguiéndolos de los comandos que gobiernan qué suena:

- `compose environment <id|off>` — fija o retira el recinto de la escena.
- `compose occlusion <id|off>` — fija o retira la barrera de la escena.
- `compose modifier <sonido> <tipo|off>` — activa o retira un modificador de un sonido concreto.
- `compose distance <sonido> <metros>` — fija la distancia de un sonido concreto.
- `compose list` — muestra los componentes de escena disponibles; `compose status`, la escena activa.

Ninguna acción SHALL ser alcanzable por dos comandos distintos: el sistema MUST NOT ofrecer bajo `compose` un verbo que duplique a `play`, `add`, `remove`, `stop`, `reset` o `volume`.

La distinción entre sustituir (`play`) y acumular (`add`) SHALL ser explícita: `play` con argumento MUST NOT dejar sonando capas anteriores.

#### Scenario: `play` sustituye la mezcla

- **GIVEN** la mezcla activa contiene `rain` y `wind`
- **WHEN** el usuario ejecuta `play ocean`
- **THEN** la mezcla queda compuesta únicamente por `ocean`, y `rain` y `wind` se retiran con transición suave

#### Scenario: `add` acumula sobre la mezcla

- **GIVEN** la mezcla activa contiene `rain`
- **WHEN** el usuario ejecuta `add wind`
- **THEN** la mezcla contiene `rain` y `wind`, y `rain` continúa sin alteración

#### Scenario: `stop` conserva la composición

- **GIVEN** la mezcla activa contiene varias capas con volúmenes distintos
- **WHEN** el usuario ejecuta `stop` y después `play` sin argumento
- **THEN** vuelven a sonar las mismas capas con los mismos volúmenes que antes de detenerse

#### Scenario: `reset` vacía la mezcla

- **GIVEN** existe una mezcla conservada tras un `stop`
- **WHEN** el usuario ejecuta `reset` y después `play` sin argumento
- **THEN** el sistema informa de que no hay mezcla que reanudar y no se produce sonido

#### Scenario: `clear` no afecta al audio

- **GIVEN** un ambiente está sonando
- **WHEN** el usuario ejecuta `clear`
- **THEN** la salida de la consola queda vacía y la reproducción continúa sin alteración

#### Scenario: Los componentes de escena se agrupan bajo `compose`

- **GIVEN** hay un ambiente sonando
- **WHEN** el usuario ejecuta `compose environment` seguido de un identificador válido
- **THEN** el recinto se aplica a todo lo que suena, sin que el usuario haya tenido que repetir la orden por cada sonido activo

#### Scenario: Un solo camino por acción

- **WHEN** el usuario consulta la ayuda general
- **THEN** ninguna acción sobre la mezcla aparece ofrecida a la vez como comando clásico y como subcomando de `compose`

## ADDED Requirements

### Requirement: Sugerencia contextual de composición

Tras cada orden que **cambie la composición de la escena**, la consola SHALL ofrecer, junto a la confirmación, qué componentes pueden combinarse a continuación, derivados del catálogo y del estado actual de la escena.

La sugerencia SHALL indicar, por cada componente ofrecido, si encaja con la escena activa. Los componentes de baja afinidad MUST NOT ocultarse de la sugerencia: se listan igualmente, distinguidos de los que encajan, de forma coherente con que el sistema advierte pero no bloquea.

La sugerencia MUST NOT aparecer tras órdenes que no cambian la composición —consultas de ayuda, listados, cambios de apariencia o limpieza de la salida—, para que no se convierta en ruido repetido.

La sugerencia MUST NOT requerir ninguna acción del usuario ni impedir que escriba cualquier otra orden.

#### Scenario: Sugerencia tras activar un sonido

- **GIVEN** la escena está vacía
- **WHEN** el usuario reproduce un ambiente
- **THEN** la consola confirma la reproducción y, además, ofrece los recintos, barreras y modificadores disponibles para combinar con él

#### Scenario: La sugerencia refleja lo que ya está activo

- **GIVEN** hay un ambiente sonando y un recinto ya activo
- **WHEN** el usuario ejecuta una orden que cambia la escena
- **THEN** la sugerencia ofrece lo que todavía puede añadirse, sin volver a ofrecer el recinto ya activo como si faltara

#### Scenario: Afinidad marcada, no filtrada

- **GIVEN** hay un recinto activo con el que alguna barrera del catálogo encaja mal
- **WHEN** la consola sugiere las barreras disponibles
- **THEN** aparecen todas, y las que encajan con el recinto activo se distinguen de las que se aplicarían igual pero con advertencia

#### Scenario: Sin sugerencia cuando no cambia la escena

- **GIVEN** hay una escena activa
- **WHEN** el usuario consulta la ayuda o limpia la salida de la consola
- **THEN** la consola responde sin añadir ninguna sugerencia de composición
