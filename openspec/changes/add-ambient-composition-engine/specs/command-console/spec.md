## ADDED Requirements

### Requirement: Advertencia de compatibilidad no bloqueante

Cuando una orden del motor de composición produzca una combinación de baja afinidad (capacidad `ambient-compatibility`), la consola SHALL mostrar una advertencia en su salida normal identificando la combinación afectada. La advertencia MUST NOT impedir la ejecución de la orden ni requerir una segunda confirmación del usuario.

#### Scenario: La consola advierte sin bloquear

- **WHEN** el usuario ejecuta una orden del motor de composición que resulta en una combinación de baja afinidad
- **THEN** la consola confirma que la orden se ejecutó y, además, muestra una advertencia identificando la combinación de baja afinidad

#### Scenario: Ninguna advertencia interrumpe el flujo normal

- **WHEN** el usuario ejecuta una orden del motor de composición que resulta en una combinación de alta afinidad
- **THEN** la consola confirma la ejecución sin ninguna advertencia adicional
