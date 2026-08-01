## Purpose

Define el comportamiento de la aplicación como PWA instalable que no depende de la red: qué debe funcionar sin conexión, cómo se comporta la reproducción cuando la página deja de estar visible, y cómo se aplican las actualizaciones sin interrumpir una sesión de escucha en curso.

## ADDED Requirements

### Requirement: Operación completa sin red

Tras la primera carga, la aplicación SHALL arrancar y ofrecer toda su funcionalidad sin conexión a la red: reproducir cualquier ambiente del catálogo, ejecutar todos los comandos y acceder a la configuración y las escenas guardadas.

La aplicación MUST NOT realizar peticiones de red durante la reproducción. Ningún recurso necesario para generar audio SHALL obtenerse en tiempo de ejecución desde la red.

#### Scenario: Arranque sin conexión

- **GIVEN** el usuario ya cargó la aplicación al menos una vez
- **WHEN** abre la aplicación sin conexión a la red
- **THEN** la aplicación arranca completa y puede reproducir cualquier ambiente del catálogo

#### Scenario: Pérdida de conexión durante la reproducción

- **GIVEN** un ambiente está sonando
- **WHEN** se pierde la conexión a la red
- **THEN** la reproducción continúa sin interrupción y ninguna función deja de estar disponible

#### Scenario: Ausencia de tráfico durante la reproducción

- **WHEN** se observa la actividad de red mientras un ambiente suena
- **THEN** no se registra ninguna petición

### Requirement: Aplicación instalable

La aplicación SHALL ser instalable en el dispositivo desde navegadores que lo soporten, y SHALL presentarse instalada con nombre, icono y color de tema propios, sin la interfaz del navegador.

La aplicación instalada SHALL comportarse de forma equivalente a la versión en navegador.

#### Scenario: Instalación en el dispositivo

- **WHEN** el usuario instala la aplicación desde un navegador compatible
- **THEN** aparece como aplicación independiente con su nombre e icono, y al abrirla se presenta sin la interfaz del navegador

#### Scenario: Paridad funcional de la versión instalada

- **WHEN** el usuario ejecuta cualquier comando en la aplicación instalada
- **THEN** obtiene el mismo comportamiento que en el navegador

### Requirement: Continuidad de la reproducción al perder visibilidad

Cuando la página deja de estar visible —cambio de pestaña, minimización o bloqueo de pantalla— el sistema SHALL mantener la reproducción en curso en la medida en que el navegador lo permita, y MUST NOT detenerla por decisión propia.

Cuando el entorno suspenda la reproducción pese a ello, el sistema SHALL reflejar esa suspensión en su estado al recuperar la visibilidad, en lugar de mostrar que se está reproduciendo cuando no hay sonido.

#### Scenario: Cambio de pestaña durante la reproducción

- **GIVEN** un ambiente está sonando
- **WHEN** el usuario pasa a otra pestaña
- **THEN** el audio continúa sonando

#### Scenario: Recuperación de la visibilidad

- **GIVEN** un ambiente estaba sonando y la página perdió la visibilidad
- **WHEN** el usuario vuelve a la aplicación
- **THEN** el estado mostrado coincide con lo que realmente está sonando

#### Scenario: Suspensión impuesta por el entorno

- **GIVEN** la reproducción fue suspendida por el navegador o el sistema operativo
- **WHEN** el usuario vuelve a la aplicación
- **THEN** el estado refleja que la reproducción está suspendida y una única acción del usuario la reanuda

### Requirement: Actualización no disruptiva

Cuando exista una versión nueva de la aplicación, el sistema MUST NOT aplicarla de forma que interrumpa una reproducción en curso.

Con audio sonando, el sistema SHALL informar de la actualización disponible y SHALL dejar su aplicación a decisión del usuario. Sin reproducción activa, la actualización SHALL aplicarse de forma transparente.

#### Scenario: Actualización disponible durante la reproducción

- **GIVEN** un ambiente está sonando
- **WHEN** se detecta una versión nueva de la aplicación
- **THEN** el sistema informa de que está disponible, el audio no se interrumpe y la actualización se aplica solo cuando el usuario lo indique

#### Scenario: Actualización sin reproducción activa

- **GIVEN** no hay ninguna capa activa
- **WHEN** se detecta una versión nueva de la aplicación
- **THEN** la actualización se aplica sin intervención del usuario
