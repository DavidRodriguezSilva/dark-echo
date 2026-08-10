## REMOVED Requirements

### Requirement: Alcance del piloto limitado a `rain`

**Reason**: El piloto se cerró. Su propósito era validar el motor de
composición contra un único `Source` antes de exigirle sostener una
composición más compleja (design.md D8 de `add-ambient-composition-engine`),
y esa validación ya ocurrió. Mantener la restricción impediría precisamente
lo que este change entrega.

**Migration**: Ninguna acción para el usuario. El motor pasa de ofrecer un
`Source` a ofrecer todo el catálogo; nada de lo que funcionaba deja de
funcionar. La requirement se sustituye por "Catálogo de `Source` derivado del
catálogo de ambientes", más abajo.

## ADDED Requirements

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
