## ADDED Requirements

### Requirement: El acento no tiñe las superficies

Los tokens de superficie —fondo, panel, emergente, atenuado y sus textos asociados— SHALL ser independientes del tema elegido. Un tema SHALL distinguirse únicamente por los tokens de énfasis: el color de acento, su texto asociado y el color de foco.

El acento SHALL aparecer exclusivamente en elementos de énfasis —texto destacado, indicador de foco, estado activo de un control y cursor—, y MUST NOT usarse como fondo de superficies extensas.

En consecuencia, declarar un tema nuevo MUST NOT requerir declarar ningún token de superficie, y MUST NOT requerir modificar ningún componente de la interfaz.

#### Scenario: Alta de un acento nuevo

- **WHEN** se declara un tema nuevo sobreescribiendo únicamente el color de acento, su texto asociado y el color de foco
- **THEN** el tema queda disponible y la interfaz completa se presenta correctamente con él, sin haber declarado ningún token de superficie ni modificado ningún componente

#### Scenario: Las superficies no cambian al cambiar de tema

- **GIVEN** el usuario está en un esquema concreto
- **WHEN** cambia de tema
- **THEN** el fondo, los paneles y los colores de texto se mantienen, y solo cambian los elementos de énfasis

### Requirement: Tipografía propia empaquetada

La aplicación SHALL declarar una tipografía propia para su marca, su consola y sus datos numéricos, y SHALL servirla desde sus propios recursos empaquetados.

Los archivos de tipografía SHALL incorporarse al almacenamiento previo de la aplicación instalable, de modo que la primera carga sin conexión disponga de ellos.

Toda familia declarada SHALL declarar además una pila de respaldo del sistema, de modo que la interfaz siga siendo legible si el recurso no está disponible.

La tipografía propia SHALL cubrir los caracteres del español, incluidos los diacríticos y los signos de apertura de interrogación y exclamación.

#### Scenario: La tipografía se sirve desde la aplicación

- **WHEN** la aplicación se carga
- **THEN** la tipografía se obtiene de los recursos de la propia aplicación y no de ningún servicio externo

#### Scenario: La tipografía está disponible sin conexión

- **GIVEN** la aplicación se ha cargado una vez
- **WHEN** el usuario la abre después sin conexión a la red
- **THEN** la interfaz se presenta con su tipografía propia

#### Scenario: Respaldo si el recurso falta

- **GIVEN** el recurso de tipografía no está disponible
- **WHEN** la aplicación se presenta
- **THEN** usa la pila de respaldo del sistema y todo el texto sigue siendo legible

#### Scenario: Cobertura del español

- **WHEN** la interfaz presenta texto con diacríticos, eñes y signos de apertura
- **THEN** todos los caracteres se dibujan con la tipografía propia, sin sustituciones

## MODIFIED Requirements

### Requirement: Los temas no dependen de la red

Todos los temas declarados SHALL estar disponibles sin conexión. El sistema MUST NOT obtener definiciones de tema ni tipografías desde la red en tiempo de ejecución.

Las tipografías que la aplicación declare SHALL empaquetarse con ella. Empaquetar un recurso de tipografía no constituye una dependencia de red, siempre que su carga en ejecución se resuelva contra los recursos propios de la aplicación.

#### Scenario: Cambio de tema sin conexión

- **GIVEN** la aplicación está abierta sin conexión a la red
- **WHEN** el usuario cambia a cualquier tema disponible
- **THEN** el tema se aplica correctamente y no se produce ninguna petición de red

#### Scenario: Ninguna petición de tipografía a un servicio externo

- **WHEN** la aplicación se carga y se presenta
- **THEN** no se produce ninguna petición de tipografía a un dominio distinto del de la propia aplicación
