## ADDED Requirements

### Requirement: Comando de temporizador

La consola SHALL ofrecer el comando `timer` con estas formas: `timer <duración>` (fija dentro de un tiempo), `timer at <HH:MM>` (fija a una hora), `timer off` (cancela) y `timer` sin argumento (muestra el estado). La respuesta al fijar SHALL indicar la hora de apagado resultante. El comando SHALL aparecer en `help` con su sintaxis exacta.

#### Scenario: Fijar y consultar

- **WHEN** el usuario escribe `timer 30m` y luego `timer`
- **THEN** la primera respuesta indica la hora de apagado y la segunda el tiempo restante

#### Scenario: Cancelar

- **GIVEN** hay un temporizador activo
- **WHEN** el usuario escribe `timer off`
- **THEN** la respuesta confirma la cancelación

### Requirement: Temporizador accesible sin teclado y visible en el panel de estado

El modo visual SHALL permitir fijar y cancelar el temporizador por toque, con duraciones rápidas (15, 30, 60 y 120 minutos), un campo de duración personalizada y un campo de hora. El panel de estado SHALL mostrar la cuenta atrás mientras haya un temporizador activo, en los dos modos, con una acción para cancelarlo. La cuenta atrás SHALL derivarse del estado del temporizador, sin guardar una copia.

#### Scenario: Fijar por toque

- **GIVEN** el modo visual y una escena sonando
- **WHEN** el usuario elige 30 minutos
- **THEN** el panel de estado muestra la cuenta atrás

#### Scenario: Cuenta atrás en modo consola

- **GIVEN** un temporizador activo y la interfaz en modo consola
- **THEN** el panel de estado muestra la cuenta atrás y permite cancelarla
