# session-persistence Specification

## Purpose
Define qué recuerda la aplicación entre sesiones: la configuración del usuario y las escenas sonoras que haya guardado, junto con las garantías de que un almacenamiento ausente, obsoleto o dañado nunca impida usar la aplicación.
## Requirements
### Requirement: Persistencia de la configuración del usuario

El sistema SHALL persistir localmente la configuración del usuario —como mínimo el volumen maestro y las preferencias de la consola— y SHALL restaurarla al iniciar la aplicación.

La persistencia SHALL ser enteramente local. El sistema MUST NOT enviar la configuración a ningún servicio remoto.

#### Scenario: Restauración de la configuración

- **GIVEN** el usuario ajustó el volumen maestro en una sesión anterior
- **WHEN** vuelve a abrir la aplicación
- **THEN** el volumen maestro restaurado es el que dejó configurado

#### Scenario: Primer arranque sin datos previos

- **WHEN** el usuario abre la aplicación por primera vez
- **THEN** la aplicación arranca con valores por defecto documentados y sin mostrar errores

#### Scenario: La configuración no sale del dispositivo

- **WHEN** el usuario modifica su configuración
- **THEN** no se produce ninguna petición de red derivada de ese cambio

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

### Requirement: Formato almacenado versionado

Todo dato persistido SHALL incluir la versión de su formato. Al leer datos, el sistema SHALL comparar la versión almacenada con la que soporta.

Cuando la versión almacenada sea anterior y exista migración, el sistema SHALL migrarla y guardar el resultado migrado. Cuando no exista migración posible, el sistema SHALL descartar el dato, informar al usuario de lo descartado y continuar con valores por defecto.

#### Scenario: Migración de datos de una versión anterior

- **GIVEN** existen datos persistidos en una versión de formato anterior para la que hay migración
- **WHEN** la aplicación arranca
- **THEN** los datos se migran, quedan guardados en el formato vigente y el usuario conserva su configuración y sus escenas

#### Scenario: Versión no migrable

- **GIVEN** existen datos persistidos cuya versión no admite migración
- **WHEN** la aplicación arranca
- **THEN** la aplicación arranca con valores por defecto e informa al usuario de qué se descartó

### Requirement: Tolerancia a almacenamiento dañado o no disponible

Un almacenamiento local ausente, ilegible, con contenido corrupto o con la escritura denegada MUST NOT impedir que la aplicación arranque ni que reproduzca audio.

Ante datos ilegibles, el sistema SHALL continuar con valores por defecto e informar al usuario. Cuando la escritura no sea posible, el sistema SHALL informarlo una vez y SHALL seguir operando, aceptando que los cambios no sobrevivirán a la sesión.

#### Scenario: Datos persistidos corruptos

- **GIVEN** el contenido almacenado no es legible como dato válido
- **WHEN** la aplicación arranca
- **THEN** arranca con valores por defecto, informa de la incidencia y es plenamente funcional

#### Scenario: Escritura denegada por el entorno

- **GIVEN** el entorno no permite escribir en el almacenamiento local
- **WHEN** el usuario cambia su configuración o guarda una escena
- **THEN** el sistema informa que los cambios no se conservarán y la sesión en curso sigue funcionando con normalidad

### Requirement: Restauración de la última mezcla

El sistema SHALL recordar la composición de la mezcla activa y sus volúmenes por capa al cerrarse la aplicación, y SHALL restaurarla al arrancar.

Dado que la reproducción no puede iniciarse sin un gesto del usuario, la mezcla restaurada SHALL quedar en estado detenido, y una única acción del usuario SHALL bastar para reanudarla.

El estado restaurado MUST NOT presentarse como si estuviera sonando.

#### Scenario: Restauración de la mezcla de la sesión anterior

- **GIVEN** el usuario cerró la aplicación con una mezcla de varias capas sonando
- **WHEN** vuelve a abrirla
- **THEN** el panel de estado muestra esa misma mezcla con sus volúmenes, indicada como detenida, y no se produce sonido

#### Scenario: Reanudación con una sola acción

- **GIVEN** la aplicación arrancó con una mezcla restaurada en estado detenido
- **WHEN** el usuario ejecuta una única acción de reproducción
- **THEN** suena exactamente esa mezcla con sus volúmenes

#### Scenario: Cierre sin mezcla activa

- **GIVEN** el usuario cerró la aplicación sin ninguna capa en la mezcla
- **WHEN** vuelve a abrirla
- **THEN** el panel de estado indica que no hay mezcla y no hay nada que reanudar

