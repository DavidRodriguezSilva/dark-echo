# ambient-composition-engine Specification

## Purpose
Establece el motor de composición nuevo — coexistente con el motor de ambientes actual, no un reemplazo — que ensambla una escena sonora a partir de componentes independientes (`Source`, `Environment`, `Occlusion`, `Modifiers`). Este documento cubre lo que el motor garantiza como conjunto; el comportamiento propio de cada familia de componente vive en su propia capacidad (`ambient-environment`, `ambient-occlusion`, `ambient-modifiers`, `ambient-compatibility`).
## Requirements
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

### Requirement: Catálogo de `Source` derivado del catálogo de ambientes

Los `Source` que el motor de composición admite SHALL derivarse del catálogo
de ambientes (`procedural-ambiences`, "Catálogo de ambientes consultable"),
que es su única fuente de verdad. El motor MUST NOT mantener una lista propia
de `Source` disponibles en paralelo a ese catálogo.

Un ambiente incorporado al catálogo SHALL quedar disponible como `Source` del
motor de composición sin necesidad de declararlo por segunda vez.

#### Scenario: Todo el catálogo es alcanzable como `Source`

- **WHEN** el usuario consulta qué `Source`s admite el motor de composición
- **THEN** aparecen todos los ambientes del catálogo, sin excepciones

#### Scenario: Un ambiente nuevo no requiere declaración adicional

- **GIVEN** un ambiente nuevo se incorpora al catálogo de ambientes
- **WHEN** el usuario consulta los `Source` del motor de composición
- **THEN** el ambiente nuevo aparece disponible, sin que se haya declarado en
  ningún otro sitio

### Requirement: Varios `Source` simultáneos en una escena

El motor de composición SHALL sostener varios `Source` sonando a la vez en la
misma escena. Incorporar un `Source` a una escena que ya tiene otros
MUST NOT interrumpir, reiniciar ni alterar los que ya sonaban.

Retirar un `Source` concreto SHALL dejar intactos los demás, junto con el
`Environment`, la `Occlusion` y los `Modifiers` de los `Source` restantes.

El motor SHALL declarar un límite de capas simultáneas propio, medido para
este motor (`synthesis-reference`, "Presupuesto de coste declarado"), y
SHALL rechazar con un mensaje accionable la incorporación de un `Source` que
lo excedería, en vez de degradar la reproducción en curso.

#### Scenario: Incorporar un `Source` sin perturbar los presentes

- **GIVEN** una escena con un `Source` sonando
- **WHEN** el usuario incorpora un segundo `Source` compatible
- **THEN** ambos suenan a la vez, y el primero continúa sin interrupción ni
  cambio audible atribuible a la incorporación

#### Scenario: Retirar un `Source` concreto

- **GIVEN** una escena con varios `Source` sonando y un `Environment` activo
- **WHEN** el usuario retira uno de los `Source` por su identificador
- **THEN** ese `Source` deja de sonar y los demás continúan sin alteración,
  con el `Environment` todavía activo

#### Scenario: Escena que excedería el límite de capas

- **GIVEN** una escena cuyas capas activas están en el límite declarado
- **WHEN** el usuario intenta incorporar un `Source` que no cabe
- **THEN** la escena en curso continúa sin alteración y el sistema explica que
  no hay sitio, indicando cuántas capas se necesitan y cuál es el límite

### Requirement: Los componentes compartidos alcanzan a todos los `Source`

El `Environment` y la `Occlusion` activos SHALL aplicarse por igual a todos
los `Source` de la escena, por ser propiedades de la escena y no de un
`Source` concreto. Activar un `Environment` o una `Occlusion` con varios
`Source` sonando MUST NOT requerir repetir la orden por cada uno.

#### Scenario: Un `Environment` colorea toda la escena

- **GIVEN** una escena con dos `Source` sonando y ningún `Environment` activo
- **WHEN** el usuario activa un `Environment`
- **THEN** ambos `Source` se perciben dentro de ese recinto, con una sola
  orden y sin que ninguno quede fuera de él

#### Scenario: Un `Source` incorporado después hereda la escena

- **GIVEN** una escena con un `Environment` y una `Occlusion` ya activos
- **WHEN** el usuario incorpora un `Source` nuevo
- **THEN** ese `Source` suena ya afectado por el `Environment` y la
  `Occlusion` vigentes, sin necesidad de reactivarlos

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

