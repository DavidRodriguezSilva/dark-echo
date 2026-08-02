## Purpose

Define `Modifiers` como parámetros dinámicos propios de cada `Source` activo — distancia, dirección, movimiento aparente — distintos de `Environment`/`Occlusion` (compartidos por escena) y excluyendo explícitamente la intensidad, que sigue siendo una característica propia del `Source`.

## ADDED Requirements

### Requirement: Un `Modifier` pertenece a un `Source`, no a la escena

Cada `Source` activo SHALL llevar su propio conjunto independiente de `Modifiers`. Cambiar el `Modifier` de un `Source` MUST NOT afectar el `Modifier` de otro `Source` activo en la misma escena.

#### Scenario: Ajustar la distancia de un `Source` no afecta a otro

- **GIVEN** dos `Source`s compatibles suenan en la misma escena, cada uno con su propio `Modifier` de distancia
- **WHEN** el usuario cambia la distancia de uno de ellos
- **THEN** solo ese `Source` cambia de distancia percibida; el otro conserva la suya sin alteración

### Requirement: La intensidad no es un `Modifier`

La intensidad SHALL seguir siendo una característica propia del `Source` (como ya lo es en el catálogo actual), no un `Modifier`. El sistema MUST NOT exponer la intensidad como un componente de la familia `Modifiers`.

#### Scenario: Ajustar la intensidad de `rain`

- **WHEN** el usuario cambia la intensidad de `rain`
- **THEN** el sistema lo trata como un parámetro propio del `Source` `rain`, no como la activación o ajuste de un `Modifier`

### Requirement: Un `Modifier` de movimiento es autocontenido

Un `Modifier` que exprese el movimiento aparente de un `Source` (p. ej. que se perciba acercándose o alejándose) SHALL producir ese comportamiento sin necesitar leer el estado de ningún otro `Source` activo en la escena.

#### Scenario: `rain` percibida acercándose o alejándose

- **GIVEN** `rain` suena con un `Modifier` de distancia activo
- **WHEN** ese `Modifier` varía su valor a lo largo del tiempo
- **THEN** `rain` se percibe acercándose o alejándose de forma coherente, sin que el comportamiento dependa de que exista otro `Source` activo

### Requirement: Un `Modifier` produce un resultado válido en aislamiento

Cada `Modifier` SHALL producir un comportamiento coherente aplicado solo, y SHALL mantenerse coherente al combinarse con otros `Modifiers`, `Environment` u `Occlusion` compatibles.

#### Scenario: Un solo `Modifier` activo

- **WHEN** el usuario activa un único `Modifier` sobre `rain`, sin `Environment` ni `Occlusion`
- **THEN** el resultado es coherente y perceptible como el efecto que ese `Modifier` representa
