## ADDED Requirements

### Requirement: Modo de interfaz conmutable

La interfaz SHALL ofrecer dos modos de operación excluyentes —**modo consola**, basado en la línea de comandos, y **modo visual**, basado en controles gráficos— y un conmutador permanente para pasar de uno a otro. Los dos modos MUST NOT presentarse simultáneamente.

El modo consola SHALL ser el modo por defecto: sin preferencia registrada, la aplicación SHALL arrancar en él.

El conmutador SHALL estar siempre accesible, alojado en el panel de estado, y SHALL ser accionable por toque sin necesidad de teclado físico. Su etiqueta accesible SHALL declarar el modo al que lleva y su estado SHALL indicar el modo activo.

El modo elegido por el usuario SHALL persistirse y restaurarse en el siguiente arranque, según la capacidad `session-persistence`.

Conmutar de modo MUST NOT alterar el estado de la reproducción: ninguna capa SHALL reiniciarse, ningún volumen SHALL cambiar y ningún componente de la escena SHALL activarse ni retirarse por efecto de la conmutación.

#### Scenario: Arranque sin preferencia registrada

- **WHEN** el usuario abre la aplicación por primera vez
- **THEN** la interfaz se presenta en modo consola, con la línea de entrada lista para escribir

#### Scenario: Conmutación al modo visual

- **GIVEN** la interfaz está en modo consola
- **WHEN** el usuario acciona el conmutador
- **THEN** la consola deja de mostrarse, la interfaz presenta los controles gráficos y el panel de estado permanece visible

#### Scenario: La conmutación no interrumpe la reproducción

- **GIVEN** una escena está sonando
- **WHEN** el usuario conmuta de modo y vuelve a conmutar
- **THEN** el audio continúa sin corte, con las mismas capas, los mismos volúmenes y los mismos componentes de escena que antes de conmutar

#### Scenario: El modo persiste entre sesiones

- **GIVEN** el usuario dejó la interfaz en modo visual
- **WHEN** vuelve a abrir la aplicación
- **THEN** la interfaz se presenta en modo visual

### Requirement: Organización del modo visual según la jerarquía de composición

El modo visual SHALL disponer sus secciones de forma que reflejen la jerarquía real de la composición, y no como una lista de ajustes independientes. La disposición SHALL hacer distinguible, sin texto explicativo adicional, qué alcance tiene cada control:

- Un `Modifier` SHALL presentarse **dentro** de la representación del `Source` al que pertenece, de modo que quede claro que solo afecta a ese `Source`.
- La `Occlusion` y el `Environment` SHALL presentarse como componentes **de la escena**, en una posición que los muestre gobernando a todos los `Source` activos a la vez, y como selección exclusiva —como mucho uno activo de cada uno—.
- El transporte —reproducir y detener— y el volumen maestro SHALL situarse al final del recorrido y SHALL permanecer alcanzables sin desplazar la vista.

Las escenas guardadas MUST NOT presentarse como una etapa de esa jerarquía: SHALL ocupar una sección propia, fuera del encadenamiento, por tratarse de persistencia del conjunto completo.

Los componentes ofrecidos en cada sección SHALL derivarse de los catálogos declarados, de modo que el listado no pueda desincronizarse de lo que el motor admite.

Toda acción del modo visual SHALL producir exactamente el mismo efecto que su comando equivalente, invocando la misma operación del motor.

#### Scenario: El alcance de un `Modifier` es legible

- **GIVEN** dos `Source` activos en la escena
- **WHEN** el usuario ajusta la distancia de uno de ellos desde el modo visual
- **THEN** solo cambia el `Modifier` de ese `Source`, el otro conserva el suyo sin alteración, y el control ajustado se presenta asociado únicamente al `Source` afectado

#### Scenario: El alcance de un componente de escena es legible

- **GIVEN** varios `Source` activos en la escena
- **WHEN** el usuario selecciona un `Environment` desde el modo visual
- **THEN** el `Environment` se aplica a la escena completa con una sola acción y se presenta como propiedad del conjunto, no de un `Source` concreto

#### Scenario: Las escenas guardadas no son un paso de la cadena

- **WHEN** el usuario recorre el modo visual
- **THEN** la gestión de escenas guardadas aparece en una sección propia, separada de las secciones de `Source`, `Occlusion` y `Environment`

#### Scenario: Un componente nuevo del catálogo aparece sin tocar la interfaz

- **WHEN** se declara un `Source`, una `Occlusion` o un `Environment` nuevo en su catálogo
- **THEN** el modo visual lo ofrece con su etiqueta declarada, sin haber modificado la interfaz

#### Scenario: Equivalencia entre control y comando

- **WHEN** el usuario arma una escena completa desde el modo visual y después la misma escena mediante comandos
- **THEN** el estado observable del motor es idéntico en ambos casos

### Requirement: Bienvenida que da a conocer el modo visual

El mensaje de bienvenida de la consola SHALL informar de que existe un modo visual y de **dónde** se encuentra el conmutador que lo abre, indicando su posición en la pantalla y no el dibujo de su icono.

El mensaje MUST NOT declarar que la aplicación se controla escribiendo comandos: la propia consola presentada en pantalla ya lo comunica, y ocupar una línea en repetirlo resta espacio a lo que el usuario no puede deducir por sí mismo.

#### Scenario: La bienvenida da a conocer el modo visual

- **WHEN** el usuario abre la aplicación en modo consola
- **THEN** el mensaje de bienvenida indica que existe una interfaz gráfica alternativa y en qué posición de la pantalla está el botón que la abre

#### Scenario: La bienvenida no explica lo evidente

- **WHEN** el usuario abre la aplicación en modo consola
- **THEN** el mensaje de bienvenida no contiene ninguna línea dedicada a afirmar que la aplicación se controla escribiendo comandos

## MODIFIED Requirements

### Requirement: Operación sin teclado físico

La interfaz SHALL permitir ejecutar sin teclado físico, mediante controles accionables por toque, tanto las acciones esenciales de reproducción —iniciar, detener y ajustar el volumen maestro— como la composición de la escena: incorporar y retirar un `Source`, ajustar los `Modifiers` de un `Source`, y seleccionar o retirar la `Occlusion` y el `Environment` de la escena.

Esos controles SHALL residir en el modo visual, alcanzable desde cualquier punto de la aplicación con una única acción táctil sobre el conmutador de modo.

Las acciones realizadas mediante esos controles SHALL producir el mismo efecto que sus comandos equivalentes y SHALL reflejarse en el panel de estado.

#### Scenario: Detener la reproducción sin teclado

- **GIVEN** un ambiente está sonando en un dispositivo táctil
- **WHEN** el usuario acciona el control de detención
- **THEN** la reproducción se detiene con la misma transición que mediante el comando equivalente y el panel de estado se actualiza

#### Scenario: Ajuste del volumen maestro sin teclado

- **WHEN** el usuario ajusta el volumen maestro mediante el control táctil
- **THEN** el volumen cambia y el panel de estado muestra el nuevo valor

#### Scenario: Composición completa de una escena sin teclado

- **GIVEN** un dispositivo táctil sin teclado físico
- **WHEN** el usuario incorpora un `Source`, ajusta su distancia y selecciona una `Occlusion` y un `Environment` desde el modo visual
- **THEN** la escena resultante es la misma que produciría la secuencia equivalente de comandos

#### Scenario: El modo visual está a una sola acción

- **GIVEN** la interfaz está en modo consola en un dispositivo táctil
- **WHEN** el usuario acciona el conmutador de modo
- **THEN** dispone de los controles de reproducción y de composición sin haber escrito nada

### Requirement: Panel de estado del sistema

La interfaz SHALL mostrar de forma permanente, **en ambos modos de interfaz**, el estado de la reproducción: las capas activas, el volumen de cada una y el volumen maestro. El panel SHALL reflejar los cambios de estado inmediatamente después de que ocurran, cualquiera sea su origen —comando, control gráfico o el propio motor—.

El panel SHALL alojar el conmutador de modo de interfaz, por ser la única superficie común a los dos modos.

Cuando no haya reproducción activa, el panel SHALL indicarlo explícitamente.

#### Scenario: El estado refleja un cambio hecho por comando

- **WHEN** el usuario modifica la mezcla mediante un comando
- **THEN** el panel de estado muestra la nueva composición y los nuevos volúmenes

#### Scenario: El estado refleja un cambio hecho desde el modo visual

- **WHEN** el usuario modifica la mezcla mediante un control gráfico
- **THEN** el panel de estado muestra la nueva composición y los nuevos volúmenes, sin diferencia alguna respecto del mismo cambio hecho por comando

#### Scenario: El panel acompaña a los dos modos

- **WHEN** el usuario conmuta entre modo consola y modo visual
- **THEN** el panel de estado permanece visible, con el mismo contenido, y el conmutador sigue accesible en él

#### Scenario: Estado en reposo

- **WHEN** no hay ninguna capa activa
- **THEN** el panel indica que no hay reproducción en curso

### Requirement: Identidad visual de terminal

El **modo consola** SHALL presentarse como una terminal: tipografía monoespaciada para la entrada y la salida, registro cronológico y una línea de entrada siempre visible.

En entornos con teclado, la línea de entrada SHALL estar enfocada al entrar en el modo consola —incluido el arranque de la aplicación, que ocurre en ese modo por defecto—, sin requerir una acción previa del usuario.

Los elementos animados de la identidad de terminal —como el parpadeo del cursor— SHALL respetar la preferencia del sistema por movimiento reducido. La misma preferencia SHALL respetarse en cualquier transición entre modos de interfaz.

La apariencia concreta —colores, tipografías, radios y sombras— se rige por la capacidad `theming` y MUST NOT fijarse con valores literales en los componentes, en ninguno de los dos modos.

#### Scenario: Entrada lista al abrir

- **WHEN** el usuario abre la aplicación en un entorno con teclado
- **THEN** la línea de entrada está enfocada y puede escribir sin hacer clic previo

#### Scenario: Entrada y salida en tipografía monoespaciada

- **WHEN** el usuario escribe un comando y recibe una respuesta
- **THEN** ambas se presentan en tipografía monoespaciada y las columnas de la salida quedan alineadas

#### Scenario: Regreso a la consola desde el modo visual

- **GIVEN** la interfaz está en modo visual en un entorno con teclado
- **WHEN** el usuario conmuta al modo consola
- **THEN** la línea de entrada queda enfocada y puede escribir sin hacer clic previo

#### Scenario: Preferencia por movimiento reducido

- **GIVEN** el sistema operativo indica preferencia por movimiento reducido
- **WHEN** el usuario abre la aplicación
- **THEN** el cursor no parpadea y no se presentan animaciones decorativas
