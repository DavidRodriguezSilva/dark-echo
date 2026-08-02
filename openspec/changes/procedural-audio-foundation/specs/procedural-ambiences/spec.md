## Purpose

Define qué es un ambiente sonoro en este producto y qué garantías de variación ofrece: una composición declarativa de capas cuyos parámetros evolucionan de forma continua y que incorpora eventos esporádicos, de modo que la escucha prolongada no revele un ciclo de repetición.

## ADDED Requirements

### Requirement: El ambiente es una composición declarativa de capas

Un ambiente SHALL definirse como un conjunto de capas, cada una con su fuente sonora, su tratamiento y sus rangos de variación declarados como datos. Añadir un ambiente nuevo al catálogo SHALL consistir en declarar su composición, sin modificar el runtime de audio ni la consola.

Cada capa de un ambiente SHALL ser direccionable de forma individual, para poder activarse, silenciarse y ajustarse por separado.

#### Scenario: Incorporación de un ambiente nuevo

- **WHEN** se añade al catálogo la declaración de un ambiente nuevo
- **THEN** el ambiente queda disponible para reproducirse y aparece en el listado, sin cambios en el runtime de audio ni en la gramática de comandos

#### Scenario: Manipulación de una capa individual de un ambiente

- **GIVEN** un ambiente compuesto por varias capas está sonando
- **WHEN** el usuario ajusta el volumen de una de sus capas
- **THEN** solo esa capa cambia y el resto del ambiente continúa sin alteración

### Requirement: Variación continua de parámetros

Los parámetros de cada capa SHALL evolucionar de forma continua durante la reproducción dentro de los rangos declarados. La evolución SHALL combinar varios ciclos de modulación cuyos periodos no sean múltiplos enteros entre sí, de modo que la combinación no vuelva a un estado idéntico en un intervalo perceptible.

El sistema MUST NOT reproducir audio pregrabado ni repetir un fragmento generado en bucle.

#### Scenario: Escucha prolongada de un mismo ambiente

- **GIVEN** un ambiente lleva sonando un periodo prolongado
- **THEN** su intensidad y su carácter han cambiado de forma audible a lo largo del tiempo y no se percibe un patrón que se repita a intervalos regulares

#### Scenario: Ausencia de material pregrabado

- **WHEN** se inspecciona lo que la aplicación necesita para reproducir cualquier ambiente
- **THEN** no se requiere ningún archivo de audio: la señal se genera íntegramente en tiempo de ejecución

#### Scenario: La variación respeta los límites declarados

- **GIVEN** una capa declara un rango de intensidad
- **WHEN** el ambiente suena de forma prolongada
- **THEN** la intensidad de la capa se mantiene siempre dentro del rango declarado

### Requirement: Eventos discretos esporádicos

Un ambiente SHALL poder declarar eventos sonoros puntuales que se disparen de forma espaciada e impredecible dentro de un rango de frecuencia declarado, en lugar de a intervalos fijos.

Un evento SHALL integrarse en la mezcla sin interrumpir las capas continuas y SHALL variar entre ocurrencias en al menos una de sus características audibles.

#### Scenario: Disparo espaciado de un evento

- **GIVEN** un ambiente declara un evento esporádico con un rango de frecuencia
- **WHEN** el ambiente suena durante un periodo prolongado
- **THEN** el evento ocurre varias veces, con separaciones distintas entre ocurrencias y dentro del rango declarado

#### Scenario: Un evento no interrumpe las capas continuas

- **WHEN** se dispara un evento esporádico
- **THEN** se escucha superpuesto a la mezcla y las capas continuas siguen sonando sin corte

#### Scenario: Las ocurrencias de un evento no son idénticas

- **WHEN** el mismo evento se dispara varias veces
- **THEN** las ocurrencias difieren de forma audible entre sí

### Requirement: Catálogo de ambientes consultable

El sistema SHALL exponer el catálogo de ambientes disponibles, incluyendo para cada uno su identificador y una descripción breve. El listado SHALL derivarse del propio catálogo, de modo que no pueda quedar desincronizado de los ambientes realmente reproducibles.

#### Scenario: Consulta del catálogo

- **WHEN** el usuario solicita el listado de ambientes
- **THEN** el sistema muestra todos los ambientes reproducibles con su identificador y descripción

#### Scenario: Ambiente inexistente

- **WHEN** el usuario solicita reproducir un identificador que no está en el catálogo
- **THEN** el sistema informa que no existe y ofrece los identificadores válidos más próximos al escrito

### Requirement: Ambientes disponibles en esta entrega

El catálogo SHALL incluir los ambientes `rain`, `wind`, `river`, `ocean`, `white-noise`, `pink-noise` y `brown-noise`.

`rain` SHALL estar compuesto por al menos tres capas diferenciadas —cuerpo continuo, gotas y goteo esporádico— para servir como referencia de composición del modelo.

`wind`, `river` y `ocean` SHALL conservar el carácter sonoro del fenómeno que representan: `wind` con ráfagas de evolución lenta, `river` con un flujo turbulento continuo de textura granular y sin oscilación lenta de oleaje que lo confunda con el mar, y `ocean` con una oscilación lenta de oleaje reconocible y una rompiente que suene a agua, no a un estallido de ruido genérico.

`white-noise`, `pink-noise` y `brown-noise` SHALL ser ambientes de una única capa continua sin filtro que recorte banda ni modulación, cada uno con la pendiente espectral de su color (referencia `ruido-de-color` en `docs/synthesis-reference.md`).

#### Scenario: Reproducción de cada ambiente del catálogo

- **WHEN** el usuario reproduce cualquiera de los siete ambientes
- **THEN** el ambiente suena, es reconocible como el fenómeno que representa (natural en los primeros cuatro, un color de ruido estable en los últimos tres) y sus capas figuran en el estado del sistema

#### Scenario: Composición multicapa de la lluvia

- **WHEN** el usuario reproduce `rain`
- **THEN** el estado del sistema muestra sus capas por separado y cada una puede ajustarse de forma independiente

#### Scenario: Ruido de color sin variación de carácter

- **WHEN** el usuario reproduce `white-noise`, `pink-noise` o `brown-noise` durante un periodo prolongado
- **THEN** su pendiente espectral se mantiene estable dentro de la tolerancia declarada en la referencia de síntesis, sin ninguna evolución de carácter —a diferencia del resto del catálogo, aquí la ausencia de variación es el criterio de aceptación, no una excepción a la "Variación continua de parámetros"

### Requirement: Generación reproducible bajo semilla

La generación procedural SHALL producir una secuencia idéntica cuando se parte de una misma semilla, y secuencias distintas con semillas distintas. Esto permite verificar el comportamiento de los generadores de forma automatizada.

En uso normal, sin semilla explícita, cada sesión de reproducción SHALL partir de un estado distinto.

#### Scenario: Misma semilla, misma secuencia

- **GIVEN** un generador inicializado con una semilla concreta
- **WHEN** se produce una secuencia de muestras y después se repite el proceso con la misma semilla
- **THEN** ambas secuencias son idénticas

#### Scenario: Sesiones sucesivas sin semilla explícita

- **WHEN** el usuario reproduce el mismo ambiente en dos sesiones distintas
- **THEN** el desarrollo temporal del ambiente no es idéntico entre ambas

### Requirement: Distribución espacial de las capas

Cada capa SHALL declarar su colocación y su anchura en el campo estéreo. Un ambiente MUST NOT presentar todas sus capas en la misma posición.

Las capas continuas SHALL estar decorreladas entre los dos canales, sin que esa decorrelación provoque cancelación al sumar a mono.

Los eventos discretos SHALL distribuirse en posiciones distintas del campo entre ocurrencias, en lugar de dispararse siempre en el mismo punto.

#### Scenario: Ambiente con capas en posiciones distintas

- **WHEN** el usuario reproduce un ambiente multicapa
- **THEN** sus capas ocupan posiciones diferenciadas del campo estéreo y el conjunto no se percibe concentrado en el centro

#### Scenario: Los eventos no se repiten en el mismo punto

- **WHEN** un evento esporádico se dispara varias veces
- **THEN** sus ocurrencias se perciben en posiciones distintas del campo estéreo

#### Scenario: Decorrelación compatible con mono

- **GIVEN** un ambiente con capas continuas decorreladas está sonando
- **WHEN** la salida se suma a mono
- **THEN** ninguna capa se cancela ni se adelgaza de forma audible
