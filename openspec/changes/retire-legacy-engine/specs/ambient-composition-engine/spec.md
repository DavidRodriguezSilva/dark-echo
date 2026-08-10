## REMOVED Requirements

### Requirement: Motor de composición coexistente con el motor actual

**Reason**: La coexistencia era un andamiaje, no un objetivo. Existía para no
arriesgar la estabilidad del catálogo mientras el motor nuevo se probaba, y
para conservar una referencia A/B con la que validarlo perceptualmente. El
propietario completó esa comparación el 2026-08-09 y confirmó que ambos
motores suenan igual, así que las dos razones se agotaron.

**Migration**: Ninguna acción para el usuario. Los comandos clásicos
(`play`, `add`, `remove`, `stop`, `reset`, `volume`) conservan exactamente su
semántica declarada en `command-console`; lo único que cambia es qué motor los
atiende. Las escenas guardadas se siguen cargando (`session-persistence`).

## ADDED Requirements

### Requirement: Motor único de reproducción

El sistema SHALL reproducir todo el audio a través de un único motor. No SHALL
existir una segunda ruta de audio ni un segundo registro del estado de
reproducción.

El estado observable de la reproducción SHALL tener una única fuente de
verdad, de modo que lo que el sistema muestre no pueda diferir de lo que
realmente suena.

#### Scenario: Una sola fuente de verdad del estado

- **WHEN** el usuario consulta el estado de la reproducción
- **THEN** lo mostrado procede del mismo motor que produce el audio, sin ningún
  registro paralelo que pudiera haberse desincronizado

#### Scenario: El catálogo se reproduce por la vía única

- **WHEN** el usuario reproduce cualquier ambiente del catálogo
- **THEN** suena a través del motor de composición, con la misma semántica de
  mezcla que el vocabulario de comandos declara

### Requirement: Ciclo de reproducción sobre la escena compuesta

El motor SHALL sostener el ciclo completo de reproducción sobre la escena que
compone: detener conservando la composición, reanudarla con una sola acción,
vaciarla, y distinguir de forma observable si no hay nada, si hay una mezcla
detenida, si está sonando o si el entorno la suspendió.

Detener la reproducción SHALL conservar también los componentes de escena
—recinto, barrera y modificadores— junto con las capas y sus volúmenes, de
modo que reanudar devuelva la escena completa y no solo los sonidos.

#### Scenario: Detener y reanudar conserva la escena completa

- **GIVEN** una escena con varios sonidos, un recinto, una barrera y un sonido
  a cierta distancia
- **WHEN** el usuario detiene la reproducción y después la reanuda con una sola
  acción
- **THEN** vuelve a sonar la misma escena, con los mismos sonidos, volúmenes,
  recinto, barrera y distancia

#### Scenario: Vaciar la escena

- **GIVEN** existe una escena conservada tras detenerla
- **WHEN** el usuario la vacía y después intenta reanudar
- **THEN** el sistema informa de que no hay nada que reanudar y no se produce
  sonido

#### Scenario: Suspensión impuesta por el entorno

- **GIVEN** una escena estaba sonando y el navegador o el sistema operativo
  suspendió la reproducción
- **WHEN** el usuario vuelve a la aplicación
- **THEN** el estado refleja que está suspendida —no que está sonando— y una
  única acción del usuario la reanuda

### Requirement: Direccionamiento por capa dentro de un `Source`

El motor SHALL permitir dirigirse a una capa individual de un `Source` activo,
además de al `Source` completo, para ajustar su volumen o retirarla.

#### Scenario: Volumen de una capa concreta

- **GIVEN** un `Source` de varias capas está sonando
- **WHEN** el usuario fija el volumen de una de sus capas
- **THEN** solo esa capa cambia de volumen, y las demás del mismo `Source`
  continúan sin alteración

#### Scenario: Volumen de un `Source` completo

- **GIVEN** un `Source` de varias capas está sonando
- **WHEN** el usuario fija el volumen del `Source` nombrándolo entero
- **THEN** todas sus capas cambian de volumen
