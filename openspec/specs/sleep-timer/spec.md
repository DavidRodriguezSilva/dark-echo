# sleep-timer Specification

## Purpose
Apaga la reproducción por sí sola: a una hora del reloj o dentro de un tiempo, con un desvanecimiento que termina en el instante elegido. Evita dejar un ambiente sonando toda la noche sin obligar a levantarse a detenerlo.
## Requirements
### Requirement: Temporizador de apagado

El sistema SHALL ofrecer un temporizador de apagado que, al cumplirse, desvanezca la reproducción hasta el silencio y deje la mezcla detenida con su composición conservada, igual que el comando `stop`.

Solo SHALL existir un temporizador activo; fijar uno nuevo SHALL sustituir al anterior. El temporizador MUST NOT persistirse: recargar la aplicación SHALL cancelarlo.

#### Scenario: Apagado dentro de un tiempo

- **GIVEN** una escena está sonando
- **WHEN** el usuario fija el temporizador a 30 minutos
- **THEN** a los 30 minutos el sonido ha llegado al silencio y la mezcla queda detenida

#### Scenario: Fijar uno nuevo sustituye al anterior

- **GIVEN** hay un temporizador de 30 minutos
- **WHEN** el usuario fija uno de 10 minutos
- **THEN** solo el de 10 minutos queda activo

#### Scenario: Recargar cancela el temporizador

- **GIVEN** hay un temporizador activo
- **WHEN** el usuario recarga la aplicación
- **THEN** no hay ningún temporizador activo

### Requirement: Formas de fijar el temporizador

El temporizador SHALL poder fijarse **dentro de un tiempo** (duración) o **a una hora** del reloj. La duración SHALL aceptar `30m`, `1h`, `1h30m` y `H:MM:SS`. La hora SHALL expresarse en formato de 24 horas `HH:MM` y referirse a su próxima ocurrencia: si ya pasó hoy, SHALL ser mañana.

El rango de la duración SHALL ser de 1 segundo a 12 horas. Un valor fuera de rango o ilegible SHALL rechazarse con un mensaje que indique el formato válido, sin alterar un temporizador ya activo.

#### Scenario: Duración en formato de reloj

- **WHEN** el usuario fija `0:27:00`
- **THEN** el temporizador se cumple a los 27 minutos

#### Scenario: Hora ya pasada hoy

- **GIVEN** son las 23:50
- **WHEN** el usuario fija el apagado a las 07:00
- **THEN** el temporizador se cumple a las 07:00 del día siguiente

#### Scenario: Valor fuera de rango

- **GIVEN** hay un temporizador de 30 minutos
- **WHEN** el usuario fija `13h`
- **THEN** se rechaza con el rango válido y el de 30 minutos sigue activo

### Requirement: Desvanecimiento que termina en la hora elegida

El desvanecimiento de apagado SHALL durar 20 segundos y SHALL terminar en el instante elegido, no empezar en él. Si al fijar el temporizador quedan menos de 20 segundos, el desvanecimiento SHALL ocupar el tiempo restante.

#### Scenario: Silencio en la hora elegida

- **GIVEN** el temporizador se fija a 5 minutos
- **WHEN** transcurren 4 minutos y 40 segundos
- **THEN** empieza el desvanecimiento, y a los 5 minutos el sonido está en silencio

#### Scenario: Menos de 20 segundos

- **WHEN** el usuario fija el temporizador a 10 segundos
- **THEN** el desvanecimiento empieza de inmediato y dura 10 segundos

### Requirement: Cancelación del temporizador

El temporizador SHALL cancelarse por orden explícita del usuario y también cuando la reproducción deje de estar activa (detención manual o escena vaciada). Una vez cancelado por esa causa, SHALL NOT rearmarse al reanudar la reproducción.

Fijar un temporizador sin que nada suene SHALL rechazarse con un mensaje que lo explique.

#### Scenario: Cancelar a mano

- **GIVEN** hay un temporizador activo
- **WHEN** el usuario lo cancela
- **THEN** no queda ningún temporizador y el sonido sigue igual

#### Scenario: Detener cancela

- **GIVEN** hay un temporizador activo
- **WHEN** el usuario detiene la reproducción y la reanuda
- **THEN** no hay temporizador activo

#### Scenario: Nada suena

- **GIVEN** la mezcla está detenida
- **WHEN** el usuario intenta fijar un temporizador
- **THEN** se rechaza indicando que no hay nada sonando

### Requirement: Precisión con la pestaña oculta

El temporizador SHALL medirse contra una marca de reloj absoluta, no contando ticks, y SHALL revisarse al volver la pestaña a primer plano. Con la pestaña oculta el apagado MAY retrasarse por el frenado de temporizadores del navegador, hasta un minuto, sin acumular error.

#### Scenario: Pestaña oculta pasada la hora

- **GIVEN** un temporizador cuya hora se cumplió mientras la pestaña estaba oculta
- **WHEN** la pestaña vuelve a primer plano
- **THEN** el apagado se ejecuta de inmediato

