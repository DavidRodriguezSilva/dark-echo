## Purpose

Establece el motor de composición nuevo — coexistente con el motor de ambientes actual, no un reemplazo — que ensambla una escena sonora a partir de componentes independientes (`Source`, `Environment`, `Occlusion`, `Modifiers`). Este documento cubre lo que el motor garantiza como conjunto; el comportamiento propio de cada familia de componente vive en su propia capacidad (`ambient-environment`, `ambient-occlusion`, `ambient-modifiers`, `ambient-compatibility`).

## ADDED Requirements

### Requirement: Motor de composición coexistente con el motor actual

El sistema SHALL ofrecer un segundo motor, alcanzable mediante sus propios comandos, distinto de los comandos existentes (`play`, `add`, `remove`...) del motor actual. Reproducir un ambiente del catálogo actual por sus comandos existentes MUST NOT verse afectado por la existencia del motor nuevo.

#### Scenario: El motor actual sigue funcionando sin cambios

- **WHEN** el usuario reproduce `rain` mediante los comandos existentes del motor actual
- **THEN** suena exactamente igual que antes de este change, sin ninguna capa de `Environment`, `Occlusion` ni `Modifiers` involucrada

#### Scenario: El motor nuevo se invoca por su propia vía

- **WHEN** el usuario compone una escena mediante los comandos del motor de composición nuevo
- **THEN** el sistema ensambla la escena a partir de `Source`, `Environment`, `Occlusion` y `Modifiers` según corresponda, sin pasar por la gramática de comandos del motor actual

### Requirement: Alcance del piloto limitado a `rain`

El motor de composición SHALL ofrecer únicamente el `Source` de `rain` en esta entrega. Ningún otro fenómeno (`wind`, `river`, `ocean`, `fuego`) SHALL estar disponible como `Source` del motor nuevo hasta un change posterior.

#### Scenario: Único `Source` disponible

- **WHEN** el usuario consulta qué `Source`s admite el motor de composición
- **THEN** únicamente `rain` aparece disponible

### Requirement: Autonomía de cada componente

Cada componente SHALL ser validable por sí solo, sin depender de que otro componente esté presente para completar la experiencia. Un `Source` SHALL sonar como una representación completa por sí mismo. Un `Environment`, una `Occlusion` o un `Modifier` — que por definición actúan sobre un `Source` y no producen sonido sin él — SHALL ser validables con un único `Source` presente y ningún otro componente activo. Añadir un componente adicional a una escena SHALL mejorar o mantener la experiencia, MUST NOT degradar el comportamiento de los componentes ya presentes.

#### Scenario: `Source` solo, sin ningún otro componente

- **WHEN** el usuario reproduce `rain` por el motor nuevo sin ningún `Environment`, `Occlusion` ni `Modifier` activo
- **THEN** suena como una representación convincente y completa de lluvia, sin sensación de estar incompleta

#### Scenario: Un componente modulador se valida contra un solo `Source`

- **GIVEN** `rain` suena por el motor nuevo sin ningún otro componente activo
- **WHEN** se activa un único `Environment`, `Occlusion` o `Modifier`
- **THEN** su efecto es reconocible y evaluable de forma aislada, sin necesitar ningún otro componente que lo complete

### Requirement: Ningún componente es indispensable

Retirar cualquier `Environment`, `Occlusion` o `Modifier` de una escena activa SHALL dejar los `Source`s restantes sonando de forma completa y aceptable, nunca en un estado audiblemente roto o incompleto.

#### Scenario: Desmontar la escena hasta el `Source` desnudo

- **GIVEN** una escena con `rain`, un `Environment`, una `Occlusion` y un `Modifier` activos
- **WHEN** el usuario retira uno a uno todos los componentes salvo `rain`
- **THEN** en cada paso intermedio la escena sigue sonando de forma coherente, y al final `rain` suena igual que si nunca se hubiera agregado nada

#### Scenario: Agregar un componente no degrada lo que ya sonaba

- **GIVEN** una escena con `rain` sonando, con o sin otros componentes activos
- **WHEN** el usuario agrega un componente adicional compatible
- **THEN** los componentes que ya sonaban continúan sin degradarse ni interrumpirse

### Requirement: Garantías de mezcla equivalentes a las del motor actual

El motor de composición SHALL cumplir las mismas garantías de mezcla sin artefactos que `audio-engine` ya exige para el motor actual: transiciones graduales de amplitud al agregar, retirar o cambiar de volumen cualquier componente, salida estéreo, y salida acotada sin distorsión por recorte cuando varios componentes suenan a la vez.

#### Scenario: Transición sin artefactos al agregar o retirar un componente

- **WHEN** el usuario agrega o retira cualquier componente de una escena activa
- **THEN** la transición es gradual, sin clics ni cortes abruptos, igual que exige `audio-engine` para el motor actual
