# ambient-compatibility Specification

## Purpose
Define cómo el motor de composición evalúa la afinidad entre un `Source` y los `Environment`/`Occlusion`/`Modifiers` que el usuario intenta combinarle, y por qué esa evaluación nunca impide la reproducción.
## Requirements
### Requirement: Puntuación por coincidencia de etiquetas, nunca bloqueante

El sistema SHALL evaluar la afinidad de un `Environment`, `Occlusion` o `Modifier` candidato frente al `Source` activo (y, en el caso de una `Occlusion`, frente al `Environment` activo) mediante coincidencia de etiquetas declaradas. Una puntuación de baja afinidad MUST NOT impedir que el usuario active esa combinación.

#### Scenario: Combinación de baja afinidad se permite igual

- **WHEN** el usuario activa un componente cuya afinidad con el resto de la escena puntúa bajo
- **THEN** el sistema lo activa igualmente y la escena suena con esa combinación, sin rechazar la orden

### Requirement: Advertencia visible en la consola para combinaciones de baja afinidad

Cuando la puntuación de afinidad de una combinación quede por debajo del umbral declarado, el sistema SHALL mostrar una advertencia en la salida normal de la consola, sin bloquear la ejecución ni alterar el audio resultante.

#### Scenario: Advertencia al agregar una combinación de baja afinidad

- **WHEN** el usuario activa una combinación cuya puntuación de afinidad queda por debajo del umbral declarado
- **THEN** la consola muestra una advertencia identificando la combinación de baja afinidad, y el componente se activa de todas formas

#### Scenario: Sin advertencia para una combinación de alta afinidad

- **WHEN** el usuario activa una combinación cuya puntuación de afinidad está por encima del umbral declarado
- **THEN** la consola no muestra ninguna advertencia de compatibilidad

