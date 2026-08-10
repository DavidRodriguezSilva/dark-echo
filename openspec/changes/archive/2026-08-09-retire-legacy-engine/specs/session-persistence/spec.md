## MODIFIED Requirements

### Requirement: Gestión de escenas sonoras

El sistema SHALL permitir al usuario guardar la mezcla activa como una escena con nombre, listar las escenas guardadas, cargarlas y eliminarlas.

Cargar una escena SHALL reproducir la misma composición de capas y los mismos volúmenes por capa que estaban activos al guardarla, y SHALL restaurar además los componentes de escena vigentes en ese momento: el recinto, la barrera y los modificadores de cada sonido. Una escena guardada con componentes de escena activos MUST NOT cargarse dejándolos fuera.

Una escena guardada en un formato anterior, que no incluya componentes de escena, SHALL seguir cargándose: se interpreta como una escena sin recinto, sin barrera y sin modificadores.

Los nombres de escena SHALL ser únicos; guardar con un nombre ya existente SHALL requerir una confirmación explícita de sobreescritura.

#### Scenario: Guardado y recarga de una escena

- **GIVEN** el usuario tiene una mezcla de varias capas con volúmenes distintos
- **WHEN** guarda la mezcla como escena con un nombre y más tarde la carga
- **THEN** se restauran exactamente las mismas capas con los mismos volúmenes

#### Scenario: Guardado y recarga de una escena con recinto y barrera

- **GIVEN** el usuario tiene una mezcla sonando dentro de un recinto, con una barrera activa y un sonido a cierta distancia
- **WHEN** guarda la escena y más tarde la carga
- **THEN** se restauran las capas con sus volúmenes y también el recinto, la barrera y la distancia de ese sonido

#### Scenario: Carga de una escena guardada en el formato anterior

- **GIVEN** existe una escena guardada antes de que las escenas incluyeran componentes de escena
- **WHEN** el usuario la carga
- **THEN** se restauran sus capas con sus volúmenes, sin recinto, sin barrera y sin modificadores, y el sistema no informa de ningún error

#### Scenario: Carga de una escena sobre una mezcla en curso

- **GIVEN** hay una mezcla sonando
- **WHEN** el usuario carga una escena distinta
- **THEN** la mezcla anterior se retira con transición suave y la escena cargada entra sin corte audible

#### Scenario: Listado de escenas

- **WHEN** el usuario solicita el listado de escenas guardadas
- **THEN** el sistema muestra sus nombres, y si no hay ninguna lo indica explícitamente

#### Scenario: Nombre de escena ya existente

- **WHEN** el usuario guarda una escena con el nombre de una existente
- **THEN** el sistema pide confirmación explícita antes de sobreescribirla

#### Scenario: Eliminación de una escena

- **WHEN** el usuario elimina una escena guardada
- **THEN** la escena desaparece del listado y la reproducción en curso no se interrumpe

#### Scenario: Escena inexistente

- **WHEN** el usuario intenta cargar una escena que no existe
- **THEN** el sistema informa que no existe y ofrece el listado de escenas disponibles
