# ambient-modifiers Specification

## Purpose
Define `Modifiers` como parámetros dinámicos propios de cada `Source` activo — distancia, dirección, movimiento aparente — distintos de `Environment`/`Occlusion` (compartidos por escena) y excluyendo explícitamente la intensidad, que sigue siendo una característica propia del `Source`.
## Requirements
### Requirement: Un `Modifier` pertenece a un `Source`, no a la escena

Cada `Source` activo SHALL llevar su propio conjunto independiente de
`Modifiers`. Cambiar el `Modifier` de un `Source` MUST NOT afectar el
`Modifier` de otro `Source` activo en la misma escena.

Esa independencia SHALL sostenerse en la ruta de señal y no solo en el estado
registrado: la señal de cada `Source` SHALL atravesar sus propios
`Modifiers` **antes** de sumarse con la de los demás `Source` de la escena.
Un `Modifier` MUST NOT aplicarse sobre la suma de varios `Source`.

Las órdenes que ajustan un `Modifier` SHALL identificar explícitamente el
`Source` al que se aplican. El sistema MUST NOT deducir el destinatario de un
estado que el usuario no pueda observar, como el orden de activación.

#### Scenario: Ajustar la distancia de un `Source` no afecta a otro

- **GIVEN** dos `Source`s compatibles suenan en la misma escena, cada uno con
  su propio `Modifier` de distancia
- **WHEN** el usuario cambia la distancia de uno de ellos
- **THEN** solo ese `Source` cambia de distancia percibida; el otro conserva
  la suya sin alteración

#### Scenario: La independencia se verifica sobre el render real

- **GIVEN** dos `Source` sonando, uno con `Modifier` de distancia activo a una
  distancia lejana y el otro sin `Modifier`
- **WHEN** se mide la señal renderizada de la escena
- **THEN** la contribución del `Source` sin `Modifier` conserva su nivel y su
  reparto espectral, comparada con la misma escena sin el `Modifier` del otro

#### Scenario: Orden de `Modifier` sin destinatario explícito

- **GIVEN** varios `Source` activos en la escena
- **WHEN** el usuario emite una orden de `Modifier` sin identificar sobre cuál
  de ellos actúa
- **THEN** el sistema no aplica el cambio a ninguno y explica que debe
  nombrarse el `Source` destinatario

#### Scenario: Retirar un `Source` retira sus `Modifiers`

- **GIVEN** dos `Source` activos, cada uno con su `Modifier` de distancia
- **WHEN** el usuario retira uno de los `Source`
- **THEN** los `Modifiers` de ese `Source` desaparecen con él, y los del
  `Source` restante conservan su valor sin alteración

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

