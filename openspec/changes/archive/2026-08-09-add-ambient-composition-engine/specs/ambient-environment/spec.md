## Purpose

Define `Environment` como un bus compartido por escena que colorea la percepción de cualquier `Source` que suene a través de él — reutilizable entre escenas, sin pertenecer a ningún `Source` en particular.

## ADDED Requirements

### Requirement: Un solo `Environment` activo por escena, compartido entre `Source`s

El sistema SHALL permitir como máximo un `Environment` activo a la vez por escena. Un `Environment` activo SHALL colorear por igual a todos los `Source`s que estén sonando en esa escena a través del motor de composición, sin que ninguno lleve su propia copia privada del entorno.

#### Scenario: Activar un entorno mientras `rain` suena

- **GIVEN** `rain` está sonando por el motor de composición, sin `Environment` activo
- **WHEN** el usuario activa un `Environment`
- **THEN** se escucha la coloración característica de ese entorno superpuesta a `rain`, y `rain` continúa sonando sin interrupción

#### Scenario: Sustitución de entorno

- **GIVEN** un `Environment` está activo en la escena
- **WHEN** el usuario activa un `Environment` distinto
- **THEN** el entorno anterior se sustituye por el nuevo sin interrumpir los `Source`s activos, y nunca hay dos `Environment`s sonando a la vez

#### Scenario: Retirar el `Environment`

- **GIVEN** un `Environment` está activo junto con `rain`
- **WHEN** el usuario retira el `Environment`
- **THEN** la coloración se desvanece hasta silencio y `rain` continúa sonando sin alteración de su propio volumen

### Requirement: Resultado consistente sin importar el `Source` conectado

Un `Environment` SHALL producir un resultado coherente con cualquier `Source` compatible que se le conecte, sin estar afinado exclusivamente para uno en particular.

#### Scenario: El mismo entorno con el único `Source` disponible en esta entrega

- **WHEN** un `Environment` se activa junto a `rain`, el único `Source` disponible en esta entrega
- **THEN** el resultado es coherente y no revela ajustes específicos a `rain` que impedirían generalizarse a otro `Source` compatible en el futuro

### Requirement: Un `Environment` colorea, no genera sonido por sí mismo

Un `Environment` SHALL producir su efecto únicamente sobre los `Source`s que suenan a través de él. Activado sin ningún `Source` en la escena, MUST NOT producir sonido audible por sí solo.

#### Scenario: Entorno activo sin ningún `Source`

- **WHEN** el usuario activa un `Environment` sin ningún `Source` sonando
- **THEN** no se produce sonido audible, y al activar después un `Source` este suena ya coloreado por ese entorno

### Requirement: Un `Environment` declara las superficies que lo componen

Cada `Environment` SHALL declarar las superficies estructurales que plausiblemente contiene (p. ej. paredes, techo, aberturas, o la ausencia de estructura construida). Esas superficies declaradas SHALL ser la base sobre la que `ambient-compatibility` evalúa la afinidad posicional/estructural de una `Occlusion` con ese entorno.

#### Scenario: Las superficies declaradas determinan qué oclusiones encajan

- **GIVEN** dos `Environment`s, uno que declara estructura construida con aberturas y otro que declara no tener estructura construida
- **WHEN** el sistema evalúa la afinidad de una `Occlusion` que representa una superficie construida
- **THEN** puntúa alto con el primero y bajo con el segundo, derivándolo de las superficies declaradas y no del material de la oclusión
