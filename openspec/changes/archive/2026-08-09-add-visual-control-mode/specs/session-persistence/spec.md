## MODIFIED Requirements

### Requirement: Persistencia de la configuración del usuario

El sistema SHALL persistir localmente la configuración del usuario —como mínimo el volumen maestro, el modo de interfaz elegido y las preferencias de la consola— y SHALL restaurarla al iniciar la aplicación.

Sin preferencia registrada de modo de interfaz, el sistema SHALL adoptar el modo consola.

Cuando el formato de la configuración evolucione para incorporar una preferencia nueva, la lectura de una versión anterior SHALL migrarse conservando las preferencias ya guardadas; incorporar una preferencia MUST NOT provocar la pérdida de las existentes.

La persistencia SHALL ser enteramente local. El sistema MUST NOT enviar la configuración a ningún servicio remoto.

#### Scenario: Restauración de la configuración

- **GIVEN** el usuario ajustó el volumen maestro en una sesión anterior
- **WHEN** vuelve a abrir la aplicación
- **THEN** el volumen maestro restaurado es el que dejó configurado

#### Scenario: Restauración del modo de interfaz

- **GIVEN** el usuario dejó la interfaz en un modo concreto en una sesión anterior
- **WHEN** vuelve a abrir la aplicación
- **THEN** la interfaz se presenta en ese mismo modo

#### Scenario: Configuración guardada antes de existir el modo de interfaz

- **GIVEN** existe una configuración guardada en un formato anterior al que incluye el modo de interfaz
- **WHEN** la aplicación arranca
- **THEN** conserva el volumen maestro guardado, adopta el modo consola como valor por defecto y guarda la configuración en el formato vigente

#### Scenario: Primer arranque sin datos previos

- **WHEN** el usuario abre la aplicación por primera vez
- **THEN** la aplicación arranca con valores por defecto documentados y sin mostrar errores

#### Scenario: La configuración no sale del dispositivo

- **WHEN** el usuario modifica su configuración
- **THEN** no se produce ninguna petición de red derivada de ese cambio
