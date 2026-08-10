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

### Requirement: Prefijos de acceso rápido

El sistema SHALL aceptar los prefijos `/` y `.` al inicio de la línea de entrada como forma abreviada de invocar comandos. Una entrada con prefijo SHALL ejecutar el mismo comando que la equivalente sin prefijo.

#### Scenario: Invocación con prefijo

- **WHEN** el usuario introduce un comando precedido por `/` o por `.`
- **THEN** el sistema ejecuta el mismo comando que sin el prefijo

#### Scenario: El prefijo activa la ayuda de escritura

- **WHEN** el usuario escribe únicamente el prefijo
- **THEN** el sistema muestra los comandos disponibles como sugerencias

### Requirement: Panel de estado del sistema

La interfaz SHALL mostrar de forma permanente el estado de la reproducción: las capas activas, el volumen de cada una y el volumen maestro. El panel SHALL reflejar los cambios de estado inmediatamente después de que ocurran, cualquiera sea su origen.

Cuando no haya reproducción activa, el panel SHALL indicarlo explícitamente.

#### Scenario: El estado refleja un cambio hecho por comando

- **WHEN** el usuario modifica la mezcla mediante un comando
- **THEN** el panel de estado muestra la nueva composición y los nuevos volúmenes

#### Scenario: Estado en reposo

- **WHEN** no hay ninguna capa activa
- **THEN** el panel indica que no hay reproducción en curso

### Requirement: Operación sin teclado físico

La interfaz SHALL permitir ejecutar las acciones esenciales —iniciar, detener y ajustar el volumen maestro— mediante controles accionables por toque, sin necesidad de escribir comandos.

Las acciones realizadas mediante esos controles SHALL producir el mismo efecto que sus comandos equivalentes y SHALL reflejarse en el panel de estado.

#### Scenario: Detener la reproducción sin teclado

- **GIVEN** un ambiente está sonando en un dispositivo táctil
- **WHEN** el usuario acciona el control de detención
- **THEN** la reproducción se detiene con la misma transición que mediante el comando equivalente y el panel de estado se actualiza

#### Scenario: Ajuste del volumen maestro sin teclado

- **WHEN** el usuario ajusta el volumen maestro mediante el control táctil
- **THEN** el volumen cambia y el panel de estado muestra el nuevo valor

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

La interfaz SHALL presentarse como una terminal: tipografía monoespaciada para la entrada y la salida, registro cronológico y una línea de entrada siempre visible.

En entornos con teclado, la línea de entrada SHALL estar enfocada al abrir la aplicación, sin requerir una acción previa del usuario.

Los elementos animados de la identidad de terminal —como el parpadeo del cursor— SHALL respetar la preferencia del sistema por movimiento reducido.

La apariencia concreta —colores, tipografías, radios y sombras— se rige por la capacidad `theming` y MUST NOT fijarse con valores literales en los componentes.

#### Scenario: Entrada lista al abrir

- **WHEN** el usuario abre la aplicación en un entorno con teclado
- **THEN** la línea de entrada está enfocada y puede escribir sin hacer clic previo

#### Scenario: Entrada y salida en tipografía monoespaciada

- **WHEN** el usuario escribe un comando y recibe una respuesta
- **THEN** ambas se presentan en tipografía monoespaciada y las columnas de la salida quedan alineadas

#### Scenario: Preferencia por movimiento reducido

- **GIVEN** el sistema operativo indica preferencia por movimiento reducido
- **WHEN** el usuario abre la aplicación
- **THEN** el cursor no parpadea y no se presentan animaciones decorativas

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

