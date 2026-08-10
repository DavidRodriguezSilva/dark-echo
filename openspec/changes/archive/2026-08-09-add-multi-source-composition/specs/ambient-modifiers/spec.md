## MODIFIED Requirements

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
