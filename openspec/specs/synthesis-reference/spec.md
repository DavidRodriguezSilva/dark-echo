# synthesis-reference Specification

## Purpose
Establece el método por el cual el proyecto decide cómo sintetizar un fenómeno sonoro y cómo se juzga si el resultado es convincente. Sustituye el ajuste por tanteo —origen de que los ambientes actuales suenen a ruido filtrado— por modelos documentados, con fuentes, parámetros y criterios de aceptación medibles.
## Requirements
### Requirement: Referencia de síntesis documentada

El repositorio SHALL mantener un documento de referencia de síntesis que, para cada clase de fenómeno sonoro que el producto pretenda cubrir, describa el modelo empleado, sus parámetros con rangos y unidades, y la fuente o fundamento en que se basa.

Las clases de fenómeno cubiertas SHALL incluir, como mínimo: impactos y gotas, flujo turbulento de agua, ráfagas de aire, oleaje, combustión y descargas eléctricas.

El documento SHALL registrar, para cada modelo, las alternativas consideradas y el motivo de la elección, de modo que una decisión pueda revisarse sin repetir la investigación.

#### Scenario: Consulta del modelo de un fenómeno

- **WHEN** una persona necesita implementar o ajustar un fenómeno cubierto por la referencia
- **THEN** encuentra en el documento su modelo, sus parámetros con rangos y unidades, y la fuente que lo respalda

#### Scenario: Fenómeno no cubierto por la referencia

- **WHEN** se pretende añadir al catálogo un ambiente cuyo fenómeno base no está en la referencia
- **THEN** la referencia debe ampliarse con ese fenómeno antes de que el ambiente entre al catálogo

#### Scenario: Revisión de una decisión de modelado

- **WHEN** una persona cuestiona el modelo elegido para un fenómeno
- **THEN** el documento indica qué alternativas se descartaron y por qué

### Requirement: Trazabilidad entre ambiente y modelo

Cada ambiente del catálogo SHALL declarar, de forma legible junto a su definición, qué modelos de la referencia de síntesis emplea cada una de sus capas.

Una capa MUST NOT introducirse con parámetros cuyo origen no sea rastreable hasta la referencia.

#### Scenario: Inspección de un ambiente del catálogo

- **WHEN** se examina la definición de un ambiente
- **THEN** cada una de sus capas indica el modelo de la referencia que aplica

#### Scenario: Capa sin respaldo en la referencia

- **WHEN** se propone una capa cuyos parámetros no se derivan de ningún modelo documentado
- **THEN** la propuesta se rechaza hasta que el modelo se documente en la referencia

### Requirement: Criterios espectrales de aceptación

La referencia SHALL declarar, para cada ambiente del catálogo, el criterio espectral que su señal debe satisfacer: la banda de frecuencias donde se concentra su energía y la pendiente aproximada de su espectro, con una tolerancia explícita.

Un ambiente SHALL verificarse contra su criterio espectral de forma automatizada antes de considerarse terminado.

#### Scenario: Ambiente que cumple su criterio espectral

- **GIVEN** un ambiente con un criterio espectral declarado
- **WHEN** se analiza una muestra suficientemente larga de su señal generada
- **THEN** la distribución de energía medida cae dentro de la banda y la pendiente declaradas, con su tolerancia

#### Scenario: Regresión en el timbre de un ambiente

- **GIVEN** un ambiente que cumplía su criterio espectral
- **WHEN** un cambio desplaza su energía fuera de la tolerancia declarada
- **THEN** la verificación falla e identifica el ambiente y la desviación medida

### Requirement: Ausencia de periodicidad verificable

La referencia SHALL declarar un umbral de periodicidad admisible. Para cada ambiente, el análisis de autocorrelación de una muestra prolongada de su señal MUST NOT presentar picos por encima de ese umbral en ningún desplazamiento distinto del nulo.

Esta verificación SHALL ser automatizada, por ser la garantía objetiva de la promesa central del producto: que la escucha prolongada no revele un bucle.

#### Scenario: Ambiente sin ciclo detectable

- **WHEN** se analiza la autocorrelación de una muestra prolongada de un ambiente
- **THEN** no aparece ningún pico por encima del umbral fuera del desplazamiento nulo

#### Scenario: Introducción accidental de un bucle

- **WHEN** un cambio hace que un ambiente repita un patrón a intervalos regulares
- **THEN** la verificación de periodicidad falla e informa el periodo detectado

### Requirement: Protocolo de validación perceptual

La referencia SHALL definir un protocolo de escucha para juzgar la verosimilitud de un ambiente, indicando la duración mínima de escucha, las condiciones de reproducción y los rasgos concretos a evaluar.

El resultado de aplicar el protocolo a cada ambiente del catálogo SHALL quedar registrado, incluyendo los defectos percibidos que se aceptaron de forma consciente.

Cuando un ambiente sustituya a una versión anterior, la validación SHALL incluir una comparación directa contra ella.

#### Scenario: Validación de un ambiente nuevo

- **WHEN** un ambiente nuevo se declara terminado
- **THEN** existe un registro de su validación perceptual según el protocolo, con los defectos aceptados si los hubiera

#### Scenario: Ambiente que sustituye a una versión previa

- **WHEN** un ambiente reescrito sustituye a su versión anterior
- **THEN** el registro incluye la comparación directa entre ambas y la conclusión de que el carácter sonoro se conserva o mejora

### Requirement: Presupuesto de coste declarado

La referencia SHALL declarar un presupuesto de coste de cómputo para la reproducción: un límite para el ambiente más exigente del catálogo y un límite para la mezcla simultánea de varias capas.

El coste real SHALL medirse y registrarse, y una capa cuyo coste exceda su presupuesto MUST NOT incorporarse sin revisar el presupuesto de forma explícita.

#### Scenario: Medición del ambiente más exigente

- **WHEN** se mide el coste de cómputo del ambiente más exigente durante reproducción sostenida
- **THEN** el valor medido queda registrado y se encuentra dentro del presupuesto declarado

#### Scenario: Capa que excede el presupuesto

- **WHEN** una capa nueva hace que la mezcla exceda el presupuesto declarado
- **THEN** la capa no se incorpora hasta que se optimice o el presupuesto se revise de forma explícita y documentada

### Requirement: Parámetros expresados en unidades físicas

Todo parámetro de un modelo SHALL declararse en la unidad física que le corresponde —hercios, segundos, metros, decibelios, eventos por segundo— y no como una constante adimensional ni como un número de muestras.

Un parámetro MUST NOT introducirse sin unidad, sin rango y sin justificación de por qué toma ese valor. Esta es la regla que sustituye el ajuste por tanteo que produjo los coeficientes actuales.

Los coeficientes concretos que requiera la implementación SHALL derivarse de esos parámetros físicos en tiempo de ejecución, de modo que la referencia no dependa de la frecuencia de muestreo del dispositivo.

#### Scenario: Revisión de los parámetros de un modelo

- **WHEN** se examina cualquier modelo de la referencia
- **THEN** cada uno de sus parámetros indica su unidad física, su rango admitido y el motivo de su valor

#### Scenario: Constante sin unidad

- **WHEN** se propone incorporar a un modelo una constante adimensional sin justificación
- **THEN** la propuesta se rechaza hasta que el parámetro se exprese en su unidad física con su rango

#### Scenario: La referencia no depende de la frecuencia de muestreo

- **WHEN** un ambiente se reproduce en dispositivos con frecuencias de muestreo distintas
- **THEN** los parámetros de la referencia siguen siendo válidos sin reajuste, porque los coeficientes se derivan de ellos en tiempo de ejecución

