## Purpose

Define el runtime que convierte una escena sonora en audio audible: cuándo puede empezar a sonar, cómo se mezclan y ponderan las capas, cómo entran y salen sin artefactos, y qué garantías de estabilidad ofrece mientras la interfaz está en uso.

## ADDED Requirements

### Requirement: Arranque diferido por gesto del usuario

El sistema SHALL diferir la creación del contexto de audio hasta que el usuario ejecute una acción que requiera sonido. El sistema MUST NOT intentar producir audio durante la carga inicial de la aplicación.

Cuando el contexto exista pero el navegador lo mantenga suspendido, el sistema SHALL reanudarlo como parte de la acción del usuario y SHALL informar el resultado por la salida de la consola.

#### Scenario: Primera reproducción tras cargar la aplicación

- **WHEN** la aplicación acaba de cargar y el usuario ejecuta por primera vez un comando de reproducción
- **THEN** el sistema inicializa el contexto de audio, comienza a sonar el ambiente solicitado y confirma la reproducción

#### Scenario: Contexto suspendido por política del navegador

- **GIVEN** el contexto de audio existe pero se encuentra suspendido
- **WHEN** el usuario ejecuta un comando de reproducción
- **THEN** el sistema reanuda el contexto y el audio se vuelve audible sin requerir una segunda orden

#### Scenario: La carga de la aplicación no produce sonido

- **WHEN** la aplicación se carga y el usuario no ejecuta ningún comando
- **THEN** no se produce sonido alguno y no se crea contexto de audio

### Requirement: Mezcla de capas con volumen independiente

El sistema SHALL reproducir simultáneamente múltiples capas sonoras. Cada capa activa SHALL tener un volumen propio, ajustable de forma independiente y sin interrumpir la reproducción de las demás capas.

Añadir o quitar una capa MUST NOT alterar el volumen ni la continuidad de las capas que permanecen activas.

#### Scenario: Dos capas suenan a la vez

- **GIVEN** la capa `rain` está sonando
- **WHEN** el usuario añade la capa `wind`
- **THEN** ambas capas suenan simultáneamente y `rain` continúa sin corte ni cambio de volumen

#### Scenario: Ajuste de volumen de una sola capa

- **GIVEN** las capas `rain` y `wind` están sonando
- **WHEN** el usuario fija el volumen de `wind` en un valor menor
- **THEN** solo `wind` cambia de volumen y `rain` mantiene el suyo

#### Scenario: Retiro de una capa de la mezcla

- **GIVEN** las capas `rain` y `wind` están sonando
- **WHEN** el usuario retira `wind`
- **THEN** `wind` se desvanece hasta silencio, se retira de la mezcla y `rain` sigue sonando sin alteración

### Requirement: Volumen maestro

El sistema SHALL exponer un volumen maestro que escala la mezcla completa. El volumen maestro SHALL aceptar valores en el rango de silencio a máximo inclusive, y SHALL rechazar valores fuera de ese rango sin modificar el valor vigente.

El volumen maestro SHALL ser independiente de los volúmenes por capa: cambiarlo MUST NOT alterar la proporción relativa entre capas.

#### Scenario: Cambio de volumen maestro con varias capas activas

- **GIVEN** dos capas suenan con volúmenes distintos
- **WHEN** el usuario reduce el volumen maestro a la mitad
- **THEN** la mezcla completa suena más baja y la relación de volumen entre las dos capas se mantiene

#### Scenario: Valor de volumen fuera de rango

- **WHEN** el usuario solicita un volumen maestro fuera del rango permitido
- **THEN** el sistema rechaza la orden con un error que indica el rango válido y conserva el volumen anterior

#### Scenario: Volumen maestro en silencio

- **WHEN** el usuario fija el volumen maestro en silencio
- **THEN** no se produce salida audible, las capas permanecen activas y restaurar el volumen las vuelve audibles sin reiniciarlas

### Requirement: Transiciones sin artefactos

Toda entrada o salida de audio SHALL realizarse mediante una transición gradual de amplitud. El sistema MUST NOT producir clics, chasquidos ni cortes abruptos al iniciar, detener, añadir o retirar capas, ni al cambiar de volumen.

Cuando una orden de detención llega mientras una transición de entrada está en curso, el sistema SHALL partir de la amplitud instantánea vigente en lugar de saltar a un valor fijo.

#### Scenario: Inicio de reproducción

- **WHEN** una capa comienza a sonar
- **THEN** su amplitud crece progresivamente desde silencio hasta su volumen objetivo, sin discontinuidad audible

#### Scenario: Detención durante el fade de entrada

- **GIVEN** una capa está en medio de su transición de entrada
- **WHEN** el usuario ordena detenerla
- **THEN** la amplitud desciende hasta silencio partiendo del nivel alcanzado en ese instante, sin salto audible

#### Scenario: Detención completa de la reproducción

- **WHEN** el usuario ordena detener toda la reproducción
- **THEN** la mezcla se desvanece hasta silencio y el sistema queda listo para reproducir de nuevo sin recargar la aplicación

### Requirement: Estabilidad del audio bajo carga de interfaz

La generación de audio SHALL ser inmune al trabajo realizado por la interfaz de usuario. Escribir comandos, desplazar la salida de la consola o redibujar el panel de estado MUST NOT producir interrupciones, huecos ni artefactos audibles.

El audio SHALL continuar sin degradación durante sesiones de reproducción prolongadas.

#### Scenario: Interacción intensa con la consola durante la reproducción

- **GIVEN** un ambiente está sonando
- **WHEN** el usuario escribe comandos y genera abundante salida en la consola de forma continuada
- **THEN** el audio se mantiene sin cortes ni glitches audibles

#### Scenario: Reproducción prolongada

- **GIVEN** un ambiente lleva sonando un periodo largo y sostenido
- **THEN** el audio sigue siendo continuo y su nivel no se ha desplazado respecto al volumen configurado

### Requirement: Salida acotada sin distorsión

La señal enviada a la salida de audio SHALL permanecer dentro del rango válido de amplitud. Cuando la suma de capas activas excedería ese rango, el sistema SHALL atenuar la mezcla de forma que no se produzca distorsión por recorte.

#### Scenario: Muchas capas a volumen alto

- **WHEN** el usuario activa varias capas simultáneamente con volúmenes altos
- **THEN** la salida se mantiene dentro del rango válido y no aparece distorsión por recorte

### Requirement: Fallo explícito en entornos no soportados

Cuando el entorno de ejecución no permita la síntesis de audio requerida, el sistema SHALL informarlo con un mensaje que identifique la causa. El sistema MUST NOT degradarse en silencio ni quedar en un estado en el que la interfaz aparente estar reproduciendo sin emitir sonido.

#### Scenario: El entorno no soporta la síntesis requerida

- **GIVEN** el navegador no ofrece las capacidades de audio necesarias
- **WHEN** el usuario intenta reproducir
- **THEN** el sistema informa que el entorno no está soportado, indica la causa y el estado del sistema refleja que no hay reproducción activa

### Requirement: Independencia de la frecuencia de muestreo

El comportamiento sonoro SHALL ser equivalente cualquiera sea la frecuencia de muestreo que imponga el dispositivo. Los coeficientes de filtro, las duraciones y las frecuencias SHALL derivarse en tiempo de ejecución de la frecuencia real del contexto.

El sistema MUST NOT asumir una frecuencia de muestreo fija. Un cambio de frecuencia entre dispositivos MUST NOT alterar el tono, la velocidad de evolución ni el perfil espectral de un ambiente.

#### Scenario: Mismo ambiente a frecuencias de muestreo distintas

- **WHEN** un ambiente se rinde a 44,1 kHz y a 48 kHz
- **THEN** ambos renders satisfacen el mismo criterio espectral declarado, dentro de su tolerancia

#### Scenario: Dispositivo con frecuencia de muestreo alta

- **GIVEN** un dispositivo cuyo contexto de audio opera a 48 kHz o más
- **WHEN** el usuario reproduce un ambiente
- **THEN** el ambiente no suena transpuesto ni acelerado respecto a su comportamiento previsto

### Requirement: Salida estéreo

La salida SHALL ser estéreo. El sistema MUST NOT reducir la mezcla a un único canal.

La suma de la salida a mono MUST NOT producir cancelaciones que hagan desaparecer o adelgazar de forma audible alguna de las capas activas.

#### Scenario: La salida tiene imagen estéreo

- **WHEN** se examina la salida durante la reproducción de un ambiente
- **THEN** los dos canales no son idénticos

#### Scenario: Compatibilidad con reproducción mono

- **GIVEN** un ambiente con varias capas está sonando
- **WHEN** la salida se suma a mono
- **THEN** todas las capas siguen siendo audibles y ninguna se cancela

### Requirement: Límite de capas simultáneas

El sistema SHALL declarar un número máximo de capas simultáneas, coherente con el presupuesto de coste de cómputo.

Cuando el usuario intente superar ese límite, el sistema SHALL rechazar la incorporación indicando el límite vigente, y la mezcla activa MUST NOT alterarse.

#### Scenario: Intento de superar el límite

- **GIVEN** la mezcla activa contiene el número máximo de capas admitido
- **WHEN** el usuario intenta añadir otra capa
- **THEN** el sistema rechaza la orden indicando el límite, y la mezcla sigue sonando exactamente igual que antes

#### Scenario: Hueco liberado tras retirar una capa

- **GIVEN** la mezcla está en el límite de capas
- **WHEN** el usuario retira una capa y a continuación añade otra
- **THEN** la nueva capa se incorpora con normalidad
