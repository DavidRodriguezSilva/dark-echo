# command-console Specification

## Purpose
Define la consola como mecanismo principal de interacción: cómo se declaran y validan los comandos, qué recibe el usuario cuando se equivoca, y qué ayudas de escritura y qué información de estado acompañan a la línea de entrada.
## Requirements
### Requirement: Comandos con argumentos validados

Cada comando SHALL declarar su nombre, sus alias, y sus argumentos con tipo, obligatoriedad y rango o conjunto de valores admitidos. El sistema SHALL validar la entrada contra esa declaración antes de ejecutar el comando.

Un comando MUST NOT ejecutarse con argumentos que no superen la validación.

#### Scenario: Comando válido

- **WHEN** el usuario introduce un comando existente con argumentos válidos
- **THEN** el sistema ejecuta la acción y confirma el resultado en la salida

#### Scenario: Argumento obligatorio ausente

- **WHEN** el usuario introduce un comando omitiendo un argumento obligatorio
- **THEN** el sistema no ejecuta la acción e indica qué argumento falta y qué forma tiene el comando

#### Scenario: Argumento del tipo equivocado

- **WHEN** el usuario introduce un comando cuyo argumento no corresponde al tipo declarado
- **THEN** el sistema no ejecuta la acción e indica el tipo esperado y el valor recibido

#### Scenario: Invocación mediante alias

- **WHEN** el usuario introduce un alias declarado de un comando
- **THEN** el sistema ejecuta el mismo comando que con su nombre principal

### Requirement: Errores accionables

Cuando una entrada no puede ejecutarse, el mensaje de error SHALL indicar qué falló y cómo corregirlo. El sistema MUST NOT responder únicamente que la entrada no se reconoce.

Ante un nombre de comando desconocido, el sistema SHALL sugerir los comandos existentes más próximos a lo escrito.

#### Scenario: Nombre de comando mal escrito

- **WHEN** el usuario escribe un nombre de comando con un error tipográfico cercano a uno existente
- **THEN** el sistema informa que no existe y sugiere el o los comandos más próximos

#### Scenario: Valor fuera del rango admitido

- **WHEN** el usuario proporciona un valor fuera del rango declarado para ese argumento
- **THEN** el sistema indica el rango admitido y conserva el estado anterior sin cambios

#### Scenario: Entrada vacía

- **WHEN** el usuario confirma la línea de entrada estando vacía
- **THEN** el sistema no ejecuta nada, no registra la entrada en el historial y no emite error

### Requirement: Ayuda consultable

El sistema SHALL ofrecer un comando de ayuda que liste los comandos disponibles con una descripción breve, y que al recibir el nombre de un comando muestre su forma de uso y sus argumentos.

El contenido de la ayuda SHALL derivarse de las declaraciones de los comandos, de modo que no pueda desincronizarse de su comportamiento real.

#### Scenario: Ayuda general

- **WHEN** el usuario solicita la ayuda sin argumentos
- **THEN** el sistema lista todos los comandos disponibles con su descripción breve

#### Scenario: Ayuda de un comando concreto

- **WHEN** el usuario solicita la ayuda indicando el nombre de un comando
- **THEN** el sistema muestra su forma de uso, sus argumentos con tipos y sus alias

### Requirement: Historial de comandos navegable y persistente

El sistema SHALL registrar los comandos introducidos por el usuario y permitir recorrerlos desde la línea de entrada, hacia atrás y hacia adelante.

El historial SHALL conservarse entre sesiones y SHALL estar acotado a un número máximo de entradas, descartando las más antiguas al superarlo. Las entradas consecutivas idénticas SHALL registrarse una sola vez.

#### Scenario: Recuperación del comando anterior

- **GIVEN** el usuario ha ejecutado varios comandos
- **WHEN** navega hacia atrás en el historial
- **THEN** la línea de entrada se rellena con los comandos previos en orden inverso de ejecución

#### Scenario: Retorno hacia adelante en el historial

- **GIVEN** el usuario ha navegado hacia atrás en el historial
- **WHEN** navega hacia adelante hasta el final
- **THEN** la línea de entrada vuelve al contenido que estaba escribiendo antes de navegar

#### Scenario: Historial tras reiniciar la aplicación

- **GIVEN** el usuario ha ejecutado comandos en una sesión anterior
- **WHEN** vuelve a abrir la aplicación y navega hacia atrás
- **THEN** recupera los comandos de la sesión anterior

#### Scenario: Repetición inmediata del mismo comando

- **WHEN** el usuario ejecuta dos veces seguidas el mismo comando idéntico
- **THEN** el historial contiene una sola entrada para él

### Requirement: Autocompletado y sugerencias

El sistema SHALL completar la entrada parcial del usuario bajo demanda. Cuando exista una única continuación posible, SHALL completarla; cuando existan varias, SHALL mostrar las candidatas y completar la parte común.

El sistema SHALL mostrar sugerencias en vivo a medida que el usuario escribe, sin modificar la entrada hasta que el usuario acepte una.

El autocompletado SHALL aplicarse tanto a nombres de comando como a los valores admitidos de sus argumentos.

Las candidatas mostradas SHALL ser **accionables por toque**: accionar una candidata SHALL aceptarla en la entrada, con el mismo efecto que aceptarla mediante el teclado. El autocompletado MUST NOT ser alcanzable únicamente mediante una tecla.

Mientras el primer término de la entrada corresponda a un comando conocido, el sistema SHALL mostrar su ayuda contextual —forma de uso, argumentos y valores admitidos— sin que el usuario tenga que consultar la ayuda aparte.

#### Scenario: Completado con una única coincidencia

- **WHEN** el usuario solicita completar un prefijo que corresponde a un solo comando
- **THEN** la entrada se completa con ese comando

#### Scenario: Completado con varias coincidencias

- **WHEN** el usuario solicita completar un prefijo que corresponde a varios comandos
- **THEN** el sistema lista las candidatas y completa la entrada hasta su prefijo común

#### Scenario: Completado de un valor de argumento

- **GIVEN** el usuario ha escrito un comando cuyo argumento admite un conjunto de valores
- **WHEN** solicita completar el argumento
- **THEN** el sistema propone los valores admitidos para esa posición

#### Scenario: Las sugerencias en vivo no alteran lo escrito

- **WHEN** el usuario escribe y el sistema muestra sugerencias
- **THEN** el contenido de la línea de entrada permanece exactamente como el usuario lo escribió hasta que acepte una sugerencia

#### Scenario: Aceptar una candidata sin teclado

- **GIVEN** un dispositivo táctil sin teclado físico y varias candidatas mostradas
- **WHEN** el usuario acciona una de ellas
- **THEN** la entrada queda completada con esa candidata, igual que si la hubiera aceptado con el teclado

#### Scenario: Ayuda contextual del comando en curso

- **WHEN** el usuario ha escrito el nombre de un comando conocido y todavía no lo ha ejecutado
- **THEN** el sistema muestra su forma de uso y los valores admitidos de sus argumentos junto a la línea de entrada

### Requirement: Prefijos de acceso rápido

El sistema SHALL aceptar los prefijos `/` y `.` al inicio de la línea de entrada como forma abreviada de invocar comandos. Una entrada con prefijo SHALL ejecutar el mismo comando que la equivalente sin prefijo.

#### Scenario: Invocación con prefijo

- **WHEN** el usuario introduce un comando precedido por `/` o por `.`
- **THEN** el sistema ejecuta el mismo comando que sin el prefijo

#### Scenario: El prefijo activa la ayuda de escritura

- **WHEN** el usuario escribe únicamente el prefijo
- **THEN** el sistema muestra los comandos disponibles como sugerencias

### Requirement: Panel de estado del sistema

La interfaz SHALL mostrar de forma permanente, **en ambos modos de interfaz**, una barra de reproducción en curso que informe de qué se está escuchando. El panel SHALL reflejar los cambios de estado inmediatamente después de que ocurran, cualquiera sea su origen —comando, control gráfico o el propio motor—.

La barra SHALL comunicar, de forma compacta y en una sola fila:

- el **nombre de la escena** cuando la composición proceda de una escena guardada, y la lectura de la escena en lenguaje natural cuando no;
- el **estado de reproducción** —sonando, detenida, suspendida o sin nada activo—;
- el **volumen maestro**, ajustable desde la propia barra;
- el **transporte** —iniciar y detener—;
- el **conmutador de modo de interfaz**, por ser la única superficie común a los dos modos.

La barra MUST NOT identificar lo que suena mediante identificadores internos del motor: SHALL usar las etiquetas declaradas en los catálogos.

Cuando no haya reproducción activa, la barra SHALL indicarlo explícitamente.

El detalle de la mezcla —las capas activas y el volumen de cada una— SHALL permanecer consultable, en el modo visual mediante el detalle de cada `Source` y en el modo consola mediante la consulta de estado.

#### Scenario: El estado refleja un cambio hecho por comando

- **WHEN** el usuario modifica la mezcla mediante un comando
- **THEN** la barra muestra la nueva composición y el nuevo volumen maestro

#### Scenario: El estado refleja un cambio hecho desde el modo visual

- **WHEN** el usuario modifica la mezcla mediante un control gráfico
- **THEN** la barra muestra la nueva composición y el nuevo volumen maestro, sin diferencia alguna respecto del mismo cambio hecho por comando

#### Scenario: El panel acompaña a los dos modos

- **WHEN** el usuario conmuta entre modo consola y modo visual
- **THEN** la barra permanece visible, con el mismo contenido, y el conmutador sigue accesible en ella

#### Scenario: La barra nombra la escena guardada

- **GIVEN** el usuario cargó una escena guardada
- **WHEN** observa la barra
- **THEN** aparece el nombre de la escena en lugar de la enumeración de lo que suena

#### Scenario: La barra no muestra identificadores internos

- **GIVEN** una mezcla con varias capas activas
- **WHEN** el usuario observa la barra
- **THEN** lo que suena se nombra con las etiquetas declaradas del catálogo y no con los identificadores compuestos de capa del motor

#### Scenario: Estado en reposo

- **WHEN** no hay ninguna capa activa
- **THEN** la barra indica que no hay reproducción en curso

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

### Requirement: Vocabulario de comandos y semántica de la mezcla

El sistema SHALL ofrecer un vocabulario estable con esta semántica, y ningún comando SHALL tener sobre la reproducción un efecto distinto del declarado:

- `play <ambiente>` — sustituye la mezcla activa por el ambiente indicado.
- `play` sin argumento — reanuda la mezcla conservada tras un `stop`.
- `add <ambiente|capa>` — incorpora a la mezcla activa sin retirar lo que ya suena.
- `remove <capa>` — retira una capa de la mezcla activa.
- `stop` — desvanece la reproducción y **conserva** la composición de la mezcla.
- `reset` — vacía la mezcla activa.
- `volume <valor>` — fija el volumen maestro; `volume <capa> <valor>` fija el de una capa.
- `list` — muestra el catálogo de ambientes; `status` muestra la mezcla activa y sus volúmenes.
- `scene save|load|list|delete <nombre>` — gestiona las escenas guardadas.
- `help [<comando>]` — muestra la ayuda.
- `clear` — vacía la salida de la consola sin afectar a la reproducción.

Los componentes que definen el espacio donde suena la mezcla —recinto, barrera y parámetros por sonido— SHALL agruparse bajo el prefijo `compose`, distinguiéndolos de los comandos que gobiernan qué suena:

- `compose environment <id|off>` — fija o retira el recinto de la escena.
- `compose occlusion <id|off>` — fija o retira la barrera de la escena.
- `compose modifier <sonido> <tipo|off>` — activa o retira un modificador de un sonido concreto.
- `compose distance <sonido> <metros>` — fija la distancia de un sonido concreto.
- `compose list` — muestra los componentes de escena disponibles; `compose status`, la escena activa.

Ninguna acción SHALL ser alcanzable por dos comandos distintos: el sistema MUST NOT ofrecer bajo `compose` un verbo que duplique a `play`, `add`, `remove`, `stop`, `reset` o `volume`.

La distinción entre sustituir (`play`) y acumular (`add`) SHALL ser explícita: `play` con argumento MUST NOT dejar sonando capas anteriores.

#### Scenario: `play` sustituye la mezcla

- **GIVEN** la mezcla activa contiene `rain` y `wind`
- **WHEN** el usuario ejecuta `play ocean`
- **THEN** la mezcla queda compuesta únicamente por `ocean`, y `rain` y `wind` se retiran con transición suave

#### Scenario: `add` acumula sobre la mezcla

- **GIVEN** la mezcla activa contiene `rain`
- **WHEN** el usuario ejecuta `add wind`
- **THEN** la mezcla contiene `rain` y `wind`, y `rain` continúa sin alteración

#### Scenario: `stop` conserva la composición

- **GIVEN** la mezcla activa contiene varias capas con volúmenes distintos
- **WHEN** el usuario ejecuta `stop` y después `play` sin argumento
- **THEN** vuelven a sonar las mismas capas con los mismos volúmenes que antes de detenerse

#### Scenario: `reset` vacía la mezcla

- **GIVEN** existe una mezcla conservada tras un `stop`
- **WHEN** el usuario ejecuta `reset` y después `play` sin argumento
- **THEN** el sistema informa de que no hay mezcla que reanudar y no se produce sonido

#### Scenario: `clear` no afecta al audio

- **GIVEN** un ambiente está sonando
- **WHEN** el usuario ejecuta `clear`
- **THEN** la salida de la consola queda vacía y la reproducción continúa sin alteración

#### Scenario: Los componentes de escena se agrupan bajo `compose`

- **GIVEN** hay un ambiente sonando
- **WHEN** el usuario ejecuta `compose environment` seguido de un identificador válido
- **THEN** el recinto se aplica a todo lo que suena, sin que el usuario haya tenido que repetir la orden por cada sonido activo

#### Scenario: Un solo camino por acción

- **WHEN** el usuario consulta la ayuda general
- **THEN** ninguna acción sobre la mezcla aparece ofrecida a la vez como comando clásico y como subcomando de `compose`

### Requirement: Comportamiento de la salida de la consola

La salida SHALL ser un registro cronológico al que solo se añade, y SHALL distinguir visualmente el eco de lo que el usuario escribió, las respuestas del sistema y los errores.

La vista SHALL seguir automáticamente la última línea, salvo que el usuario haya desplazado la salida hacia atrás, caso en el que MUST NOT arrastrarse la posición de lectura.

La salida SHALL retener un número máximo de líneas, descartando las más antiguas al superarlo, de modo que una sesión prolongada no degrade la aplicación.

#### Scenario: Distinción entre entrada, respuesta y error

- **WHEN** el usuario ejecuta un comando correcto y después uno erróneo
- **THEN** puede distinguir en la salida qué escribió, qué respondió el sistema y cuál de las dos respuestas es un error

#### Scenario: Seguimiento automático de la última línea

- **GIVEN** el usuario está viendo el final de la salida
- **WHEN** se añaden líneas nuevas
- **THEN** la vista se desplaza para mostrarlas

#### Scenario: El usuario está leyendo hacia atrás

- **GIVEN** el usuario desplazó la salida hacia atrás para leer líneas anteriores
- **WHEN** se añaden líneas nuevas
- **THEN** la posición de lectura no se mueve

#### Scenario: Sesión prolongada con mucha salida

- **WHEN** la cantidad de líneas emitidas supera el máximo retenido
- **THEN** se descartan las más antiguas y la aplicación mantiene su capacidad de respuesta

### Requirement: Identidad visual de terminal

El **modo consola** SHALL presentarse como una terminal propia de la aplicación: tipografía monoespaciada para la entrada y la salida, registro cronológico y una línea de entrada siempre visible. MUST NOT reproducir literalmente los elementos de una terminal de sistema —indicador de usuario y máquina, ruta de trabajo o banner de arranque de un sistema operativo—.

En entornos con teclado, la línea de entrada SHALL estar enfocada al entrar en el modo consola, sin requerir una acción previa del usuario.

Los elementos animados de la identidad —como el parpadeo del cursor, la aparición progresiva de la introducción y la transición entre modos de interfaz— SHALL respetar la preferencia del sistema por movimiento reducido. Con esa preferencia activa, el contenido SHALL presentarse completo y de inmediato, sin animación intermedia.

La apariencia concreta —colores, tipografías, radios y sombras— se rige por la capacidad `theming` y MUST NOT fijarse con valores literales en los componentes, en ninguno de los dos modos.

#### Scenario: Entrada lista al abrir

- **WHEN** el usuario entra en el modo consola en un entorno con teclado
- **THEN** la línea de entrada está enfocada y puede escribir sin hacer clic previo

#### Scenario: Entrada y salida en tipografía monoespaciada

- **WHEN** el usuario escribe un comando y recibe una respuesta
- **THEN** ambas se presentan en tipografía monoespaciada y las columnas de la salida quedan alineadas

#### Scenario: Regreso a la consola desde el modo visual

- **GIVEN** la interfaz está en modo visual en un entorno con teclado
- **WHEN** el usuario conmuta al modo consola
- **THEN** la línea de entrada queda enfocada y puede escribir sin hacer clic previo

#### Scenario: La consola no imita una terminal de sistema

- **WHEN** el usuario entra en el modo consola
- **THEN** el indicador de la línea de entrada es el de la propia aplicación, sin indicador de usuario y máquina ni ruta de trabajo

#### Scenario: Preferencia por movimiento reducido

- **GIVEN** el sistema operativo indica preferencia por movimiento reducido
- **WHEN** el usuario abre la aplicación, entra en la consola y conmuta de modo
- **THEN** el cursor no parpadea, la introducción aparece completa de una vez y la conmutación de modo no presenta animación intermedia

### Requirement: Advertencia de compatibilidad no bloqueante

Cuando una orden del motor de composición produzca una combinación de baja afinidad (capacidad `ambient-compatibility`), la consola SHALL mostrar una advertencia en su salida normal identificando la combinación afectada. La advertencia MUST NOT impedir la ejecución de la orden ni requerir una segunda confirmación del usuario.

#### Scenario: La consola advierte sin bloquear

- **WHEN** el usuario ejecuta una orden del motor de composición que resulta en una combinación de baja afinidad
- **THEN** la consola confirma que la orden se ejecutó y, además, muestra una advertencia identificando la combinación de baja afinidad

#### Scenario: Ninguna advertencia interrumpe el flujo normal

- **WHEN** el usuario ejecuta una orden del motor de composición que resulta en una combinación de alta afinidad
- **THEN** la consola confirma la ejecución sin ninguna advertencia adicional

### Requirement: Sugerencia contextual de composición

Tras cada orden que **cambie la composición de la escena**, la consola SHALL ofrecer, junto a la confirmación, qué componentes pueden combinarse a continuación, derivados del catálogo y del estado actual de la escena.

La sugerencia SHALL indicar, por cada componente ofrecido, si encaja con la escena activa. Los componentes de baja afinidad MUST NOT ocultarse de la sugerencia: se listan igualmente, distinguidos de los que encajan, de forma coherente con que el sistema advierte pero no bloquea.

La sugerencia MUST NOT aparecer tras órdenes que no cambian la composición —consultas de ayuda, listados, cambios de apariencia o limpieza de la salida—, para que no se convierta en ruido repetido.

La sugerencia MUST NOT requerir ninguna acción del usuario ni impedir que escriba cualquier otra orden.

#### Scenario: Sugerencia tras activar un sonido

- **GIVEN** la escena está vacía
- **WHEN** el usuario reproduce un ambiente
- **THEN** la consola confirma la reproducción y, además, ofrece los recintos, barreras y modificadores disponibles para combinar con él

#### Scenario: La sugerencia refleja lo que ya está activo

- **GIVEN** hay un ambiente sonando y un recinto ya activo
- **WHEN** el usuario ejecuta una orden que cambia la escena
- **THEN** la sugerencia ofrece lo que todavía puede añadirse, sin volver a ofrecer el recinto ya activo como si faltara

#### Scenario: Afinidad marcada, no filtrada

- **GIVEN** hay un recinto activo con el que alguna barrera del catálogo encaja mal
- **WHEN** la consola sugiere las barreras disponibles
- **THEN** aparecen todas, y las que encajan con el recinto activo se distinguen de las que se aplicarían igual pero con advertencia

#### Scenario: Sin sugerencia cuando no cambia la escena

- **GIVEN** hay una escena activa
- **WHEN** el usuario consulta la ayuda o limpia la salida de la consola
- **THEN** la consola responde sin añadir ninguna sugerencia de composición

### Requirement: Modo de interfaz conmutable

La interfaz SHALL ofrecer dos modos de operación excluyentes —**modo consola**, basado en la línea de comandos, y **modo visual**, basado en controles gráficos— y un conmutador permanente para pasar de uno a otro. Los dos modos MUST NOT presentarse simultáneamente.

El **modo visual SHALL ser el modo por defecto**: sin preferencia registrada, la aplicación SHALL arrancar en él, en cualquier dispositivo y con independencia del tipo de puntero o del tamaño de la ventana. El modo consola SHALL cargarse cuando el usuario lo solicite.

El conmutador SHALL estar siempre accesible, alojado en la barra de reproducción en curso, y SHALL ser accionable por toque sin necesidad de teclado físico. Su etiqueta accesible SHALL declarar el modo al que lleva y su estado SHALL indicar el modo activo.

El modo elegido por el usuario SHALL persistirse y restaurarse en el siguiente arranque, según la capacidad `session-persistence`.

Conmutar de modo MUST NOT alterar el estado de la reproducción: ninguna capa SHALL reiniciarse, ningún volumen SHALL cambiar y ningún componente de la escena SHALL activarse ni retirarse por efecto de la conmutación. La transición que acompañe a la conmutación SHALL ser exclusivamente visual.

#### Scenario: Arranque sin preferencia registrada

- **WHEN** el usuario abre la aplicación por primera vez
- **THEN** la interfaz se presenta en modo visual, con el catálogo de sonidos a la vista

#### Scenario: Arranque sin preferencia registrada en un dispositivo con teclado

- **GIVEN** un escritorio con puntero fino y teclado físico, sin preferencia de modo registrada
- **WHEN** el usuario abre la aplicación
- **THEN** la interfaz se presenta igualmente en modo visual, sin que el dispositivo altere el modo inicial

#### Scenario: Conmutación al modo consola

- **GIVEN** la interfaz está en modo visual
- **WHEN** el usuario acciona el conmutador
- **THEN** el modo visual deja de mostrarse, la interfaz presenta la consola y la barra de reproducción en curso permanece visible

#### Scenario: Conmutación al modo visual

- **GIVEN** la interfaz está en modo consola
- **WHEN** el usuario acciona el conmutador
- **THEN** la interfaz vuelve al modo visual sin haber escrito ningún comando

#### Scenario: La conmutación no interrumpe la reproducción

- **GIVEN** una escena está sonando
- **WHEN** el usuario conmuta de modo y vuelve a conmutar
- **THEN** el audio continúa sin corte, con las mismas capas, los mismos volúmenes y los mismos componentes de escena que antes de conmutar

#### Scenario: El modo persiste entre sesiones

- **GIVEN** el usuario dejó la interfaz en modo consola
- **WHEN** vuelve a abrir la aplicación
- **THEN** la interfaz se presenta en modo consola

### Requirement: Organización del modo visual según la jerarquía de composición

El modo visual SHALL disponer sus secciones siguiendo la jerarquía de composición, y no como una lista de ajustes independientes: qué `Source` suenan, con qué `Modifiers` cada uno, dentro de qué `Environment`, tras qué `Occlusion`, y finalmente el transporte y el volumen maestro. La disposición SHALL hacer distinguible, sin texto explicativo adicional, qué alcance tiene cada control:

- Un `Modifier` SHALL presentarse **dentro** de la representación del `Source` al que pertenece, de modo que quede claro que solo afecta a ese `Source`.
- La `Occlusion` y el `Environment` SHALL presentarse como componentes **de la escena**, gobernando a todos los `Source` activos a la vez, y como selección exclusiva —como mucho uno activo de cada uno—. El `Environment` SHALL presentarse antes que la `Occlusion`: la afinidad de la `Occlusion` se calcula contra el `Environment` elegido, así que sin uno todavía cualquier `Occlusion` se vería poco afín sin motivo real.
- El transporte —reproducir y detener— y el volumen maestro SHALL situarse al final del recorrido y SHALL permanecer alcanzables sin desplazar la vista.

La sección de `Source` SHALL presentar el catálogo completo como una rejilla de elementos seleccionables de tamaño uniforme, y SHALL distinguir visualmente un `Source` disponible de uno activo. El detalle de un `Source` activo —sus capas y sus `Modifiers`— SHALL presentarse asociado a él, y MUST NOT presentarse para los `Source` que no estén activos.

Los controles de apariencia —esquema y tema— MUST NOT ocupar una sección al mismo nivel que los `Source` ni competir con ellos por el espacio principal.

Las escenas guardadas MUST NOT presentarse como una etapa de esa jerarquía: SHALL ocupar una sección propia, fuera del encadenamiento, por tratarse de persistencia del conjunto completo.

Los componentes ofrecidos en cada sección SHALL derivarse de los catálogos declarados, de modo que el listado no pueda desincronizarse de lo que el motor admite. Un `Source` SHALL presentar controles de variación únicamente si su declaración las declara.

Toda acción del modo visual SHALL producir exactamente el mismo efecto que su comando equivalente, invocando la misma operación del motor.

#### Scenario: El orden de las secciones sigue la jerarquía de composición

- **WHEN** el usuario recorre el modo visual de arriba abajo
- **THEN** encuentra primero qué suena, después lo que modifica cada sonido, después el recinto y la barrera de la escena, y por último el transporte y el volumen maestro

#### Scenario: El alcance de un `Modifier` es legible

- **GIVEN** dos `Source` activos en la escena
- **WHEN** el usuario ajusta la distancia de uno de ellos desde el modo visual
- **THEN** solo cambia el `Modifier` de ese `Source`, el otro conserva el suyo sin alteración, y el control ajustado se presenta asociado únicamente al `Source` afectado

#### Scenario: El alcance de un componente de escena es legible

- **GIVEN** varios `Source` activos en la escena
- **WHEN** el usuario selecciona un `Environment` desde el modo visual
- **THEN** el `Environment` se aplica a la escena completa con una sola acción y se presenta como propiedad del conjunto, no de un `Source` concreto

#### Scenario: El catálogo se presenta uniforme y distingue lo activo

- **GIVEN** el catálogo declarado de `Source`
- **WHEN** el usuario activa uno de ellos
- **THEN** ese elemento se distingue visualmente de los disponibles, su detalle aparece asociado a él, y los elementos no activos no muestran detalle alguno

#### Scenario: Un `Source` sin variaciones declaradas no ofrece variaciones

- **GIVEN** un `Source` cuya declaración no declara variaciones
- **WHEN** el usuario lo activa y abre su detalle
- **THEN** el detalle no ofrece ningún control de variación, y presenta los controles que sí corresponden a lo declarado

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

Al entrar en el modo consola, el sistema SHALL presentar una introducción que cubra, en este orden: la marca de la aplicación, la bienvenida, qué hace la aplicación, la existencia de los dos modos de interfaz y **dónde** está el conmutador que lleva al otro, y cómo empezar a usar el sistema de comandos.

La introducción SHALL presentarse **de forma progresiva**, de modo que no se entregue como un bloque único de texto, salvo con la preferencia del sistema por movimiento reducido activa.

El mensaje SHALL indicar la posición en pantalla del conmutador, y no el dibujo de su icono.

El mensaje MUST NOT declarar que la aplicación se controla escribiendo comandos: la propia consola presentada en pantalla ya lo comunica, y ocupar una línea en repetirlo resta espacio a lo que el usuario no puede deducir por sí mismo.

#### Scenario: La bienvenida da a conocer el modo visual

- **WHEN** el usuario entra en el modo consola por primera vez
- **THEN** ve la marca, una bienvenida, qué hace la aplicación, que existen dos modos con la posición del conmutador, y una indicación de cómo empezar con los comandos

#### Scenario: La introducción no satura

- **WHEN** el usuario entra en el modo consola sin preferencia por movimiento reducido
- **THEN** las líneas de la introducción aparecen de forma progresiva y no como un bloque único

#### Scenario: La bienvenida no explica lo evidente

- **WHEN** el usuario entra en el modo consola
- **THEN** el mensaje no contiene ninguna línea dedicada a afirmar que la aplicación se controla escribiendo comandos

### Requirement: Lectura de la escena en lenguaje natural

El sistema SHALL derivar de la escena activa una **lectura única en lenguaje natural**: una frase que nombre primero los `Source` que suenan y después, en el orden en que la señal los atraviesa, los componentes que definen cómo suenan —distancia, barrera y recinto—.

La lectura SHALL derivarse del estado observable del motor y de las etiquetas declaradas en los catálogos, de modo que no pueda desincronizarse de lo que realmente suena ni de lo que el catálogo declara.

La misma lectura SHALL usarse en las tres superficies que informan del estado: el encabezado del modo visual, la barra de reproducción en curso y la respuesta de la consola a la consulta de estado. MUST NOT existir una segunda redacción de la escena para ninguna de ellas.

Cuando no haya ningún `Source` activo, la lectura SHALL indicarlo explícitamente en vez de quedar vacía.

Cuando el número de `Source` activos impida una enumeración legible, la lectura SHALL abreviarla indicando cuántos quedan sin nombrar, sin omitir que existen.

#### Scenario: La lectura nombra qué suena y cómo suena

- **GIVEN** la escena tiene dos `Source` activos, uno de ellos a una distancia declarada, con una barrera y un recinto aplicados
- **WHEN** el usuario consulta el estado en cualquiera de las tres superficies
- **THEN** recibe una única frase que nombra los dos `Source` y, a continuación, la distancia, la barrera y el recinto, con las etiquetas declaradas en los catálogos

#### Scenario: La lectura es la misma en los tres sitios

- **GIVEN** una escena activa
- **WHEN** el usuario compara el encabezado del modo visual, la barra de reproducción en curso y la respuesta de la consola a la consulta de estado
- **THEN** las tres describen la escena con la misma redacción, salvo el recorte por ancho disponible

#### Scenario: La lectura sigue al motor sin retraso

- **GIVEN** una escena activa y su lectura visible
- **WHEN** el usuario cambia cualquier componente de la escena, por comando o por control gráfico
- **THEN** la lectura refleja el cambio inmediatamente, sin acción adicional del usuario

#### Scenario: Escena vacía

- **WHEN** no hay ningún `Source` activo
- **THEN** la lectura declara explícitamente que no suena nada

#### Scenario: Demasiados `Source` para enumerarlos

- **GIVEN** la escena tiene más `Source` activos de los que caben en una enumeración legible
- **THEN** la lectura nombra los primeros e indica cuántos quedan sin nombrar

### Requirement: Distinción entre escena guardada y composición temporal

El modo visual SHALL distinguir visualmente tres estados de la composición activa, y SHALL nombrarlos además con texto, sin depender únicamente del color:

- **composición temporal** — no procede de ninguna escena guardada;
- **escena guardada** — procede de una escena guardada y coincide con ella;
- **escena guardada con cambios sin guardar** — procede de una escena guardada y difiere de ella.

El tercer estado SHALL determinarse comparando la composición activa del motor con la escena de la que se cargó. El sistema MUST NOT presentar como guardada una composición que haya cambiado desde que se cargó.

Guardar sobre un nombre ya existente SHALL exigir una confirmación explícita del usuario antes de sobreescribir.

#### Scenario: Composición sin guardar

- **GIVEN** el usuario ha armado una composición sin cargarla de ninguna escena guardada
- **WHEN** observa el modo visual
- **THEN** el estado se presenta como composición temporal, distinguible de una escena guardada y acompañado de texto que lo declara

#### Scenario: Escena cargada sin modificar

- **GIVEN** el usuario carga una escena guardada
- **WHEN** observa el modo visual sin haber cambiado nada
- **THEN** el nombre de la escena se presenta como guardada

#### Scenario: Escena cargada y modificada

- **GIVEN** el usuario cargó una escena guardada
- **WHEN** cambia cualquier componente de la composición
- **THEN** el estado pasa a indicar que hay cambios sin guardar respecto de esa escena, conservando visible su nombre

#### Scenario: Sobreescritura confirmada

- **GIVEN** existe una escena guardada con un nombre
- **WHEN** el usuario guarda una composición con ese mismo nombre
- **THEN** el sistema no sobreescribe hasta recibir una confirmación explícita, y lo indica

### Requirement: Interfaz utilizable en teléfono

Ambos modos de interfaz SHALL ser plenamente utilizables en un teléfono, tomando como ancho mínimo de referencia 360 px de viewport. Ninguna acción SHALL quedar disponible solo en pantallas anchas.

Los controles accionables por toque —fichas de `Source`, transporte, conmutador de modo, acciones sobre escenas y candidatas de autocompletado— SHALL presentar un objetivo táctil de al menos 44 px en su dimensión menor.

La única superficie fija SHALL ser la barra de reproducción en curso, y SHALL ocupar una sola fila. Los controles que no quepan en esa fila SHALL desplegarse bajo demanda en vez de reducir permanentemente el área de contenido.

El listado de `Source` SHALL adaptar su número de columnas al ancho disponible sin que la interfaz declare puntos de ruptura por cada tamaño de pantalla.

En pantallas anchas el contenido SHALL limitarse a una medida de lectura y MUST NOT estirarse hasta ocupar todo el ancho disponible.

#### Scenario: Composición completa desde un teléfono

- **GIVEN** un viewport de 360 px de ancho
- **WHEN** el usuario incorpora dos `Source`, ajusta la distancia de uno, selecciona una barrera y un recinto, reproduce y ajusta el volumen maestro
- **THEN** completa todas esas acciones sin desplazamiento horizontal y sin que ningún control quede fuera de alcance

#### Scenario: La barra no come el área útil

- **GIVEN** un viewport de 360 px de ancho
- **WHEN** el usuario observa la aplicación
- **THEN** la barra de reproducción en curso ocupa una sola fila, y el control de volumen se despliega al accionarlo en vez de estar permanentemente extendido

#### Scenario: El catálogo se adapta al ancho

- **GIVEN** el catálogo de `Source` declarado
- **WHEN** la aplicación se presenta en un teléfono y después en un escritorio
- **THEN** el número de columnas del listado cambia con el ancho disponible sin que la interfaz declare un punto de ruptura por cada tamaño

