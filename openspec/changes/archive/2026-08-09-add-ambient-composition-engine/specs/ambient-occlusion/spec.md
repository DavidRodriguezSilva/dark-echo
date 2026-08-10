## Purpose

Define `Occlusion` como la barrera compartida por escena entre el oyente y el `Source` — no una propiedad de un `Source` en particular — y establece que su afinidad con el `Environment` activo se evalúa por presencia posicional/estructural, no por coincidencia de material.

## ADDED Requirements

### Requirement: Una sola `Occlusion` activa por escena, compartida entre `Source`s

El sistema SHALL permitir como máximo una `Occlusion` activa a la vez por escena. Una `Occlusion` activa SHALL atenuar y filtrar por igual a todos los `Source`s que estén sonando en esa escena a través del motor de composición.

#### Scenario: Activar una oclusión mientras `rain` suena

- **GIVEN** `rain` está sonando por el motor de composición, sin `Occlusion` activa
- **WHEN** el usuario activa una `Occlusion`
- **THEN** se escucha una versión atenuada y filtrada de `rain`, coherente con la barrera elegida, sin interrumpir la reproducción

#### Scenario: Sustitución de oclusión

- **GIVEN** una `Occlusion` está activa en la escena
- **WHEN** el usuario activa una `Occlusion` distinta
- **THEN** la oclusión anterior se sustituye por la nueva sin interrumpir los `Source`s activos

### Requirement: Grado propio de atenuación, independiente del `Environment`

Cada `Occlusion` SHALL declarar su propio grado de atenuación y filtrado (p. ej. una barrera del mismo material puede ser delgada o gruesa), como una característica propia suya, no derivada del `Environment` activo.

#### Scenario: Misma oclusión, distinto grado

- **WHEN** el usuario compara dos variantes de la misma `Occlusion` con distinto grado de aislamiento declarado
- **THEN** la variante de mayor aislamiento atenúa de forma perceptiblemente mayor, sin necesidad de cambiar el `Environment` activo

### Requirement: Afinidad posicional/estructural, no coincidencia de material

La afinidad entre una `Occlusion` y el `Environment` activo SHALL evaluarse por si ese entorno tiene, de forma plausible, una superficie del tipo que la oclusión representa entre el oyente y el `Source` — no por si comparten la misma etiqueta de material. Una oclusión y un entorno de materiales distintos MUST NOT puntuar bajo únicamente por esa diferencia de material.

#### Scenario: Vidrio en un entorno de concreto sigue siendo una combinación coherente

- **GIVEN** un `Environment` cuyo material predominante es concreto
- **WHEN** el usuario activa una `Occlusion` de vidrio (p. ej. una ventana)
- **THEN** el sistema la trata como una combinación de buena afinidad, porque el entorno tiene una superficie plausible de ese tipo (una ventana), pese a que vidrio y concreto no comparten material

#### Scenario: Una oclusión sin superficie que la sostenga puntúa bajo

- **GIVEN** un `Environment` sin ninguna estructura construida (p. ej. campo abierto)
- **WHEN** el usuario activa una `Occlusion` que representa una superficie construida (p. ej. un techo)
- **THEN** el sistema la trata como una combinación de baja afinidad, porque ese entorno no tiene una superficie de ese tipo entre el oyente y el `Source`

### Requirement: Una `Occlusion` puede aportar sonido propio, no solo atenuar

Una `Occlusion` SHALL poder declarar, además de su atenuación y filtrado, una respuesta sonora propia producida por el `Source` al incidir sobre ella (p. ej. el repiqueteo de la lluvia sobre un techo). Esa respuesta SHALL depender del `Source` activo y de la intensidad de este: sin `Source` incidiendo, la `Occlusion` MUST NOT producir sonido por sí sola.

#### Scenario: Repiqueteo sobre la superficie ocluyente

- **GIVEN** `rain` está sonando por el motor de composición
- **WHEN** el usuario activa una `Occlusion` que declara respuesta sonora propia (p. ej. un techo)
- **THEN** además de la atenuación y el filtrado de `rain`, se escucha el impacto de la lluvia sobre esa superficie, con el carácter propio del material declarado

#### Scenario: La respuesta sigue a la intensidad del `Source`

- **GIVEN** una `Occlusion` con respuesta sonora propia está activa junto a `rain`
- **WHEN** el usuario cambia la intensidad de `rain`
- **THEN** la respuesta de la superficie cambia en consecuencia, sin necesidad de ajustar la `Occlusion`

#### Scenario: Sin `Source`, la oclusión es muda

- **GIVEN** ningún `Source` está sonando por el motor de composición
- **WHEN** el usuario activa una `Occlusion` con respuesta sonora propia declarada
- **THEN** no se produce ningún sonido hasta que un `Source` incida sobre ella
