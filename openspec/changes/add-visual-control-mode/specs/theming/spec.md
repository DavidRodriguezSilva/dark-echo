## MODIFIED Requirements

### Requirement: Selección de tema en caliente

El usuario SHALL poder seleccionar el tema y el esquema, tanto por comando de la consola como por control accionable por toque. El control accionable por toque SHALL residir en el modo visual de la interfaz (capacidad `command-console`, "Modo de interfaz conmutable"), alcanzable con una única acción desde cualquier modo.

El cambio SHALL aplicarse de inmediato sin recargar la aplicación, y MUST NOT interrumpir ni alterar la reproducción en curso, cualquiera sea el modo de interfaz desde el que se realice.

El sistema SHALL exponer los temas disponibles derivándolos de los temas realmente declarados, de modo que el listado no pueda desincronizarse. Esa derivación SHALL ser la misma para el comando y para el control gráfico.

#### Scenario: Cambio de tema durante la reproducción

- **GIVEN** un ambiente está sonando
- **WHEN** el usuario cambia el tema
- **THEN** la interfaz adopta el tema nuevo de inmediato y el audio continúa sin corte, sin cambio de volumen y sin reiniciar ninguna capa

#### Scenario: Cambio de tema desde el modo visual

- **GIVEN** la interfaz está en modo visual y un ambiente está sonando
- **WHEN** el usuario cambia el tema desde el control gráfico
- **THEN** el tema se aplica de inmediato en toda la interfaz, incluida la barra de estado, y el audio continúa sin alteración

#### Scenario: Listado de temas disponibles

- **WHEN** el usuario solicita los temas disponibles
- **THEN** el sistema lista exactamente los temas declarados

#### Scenario: Tema inexistente

- **WHEN** el usuario solicita un tema que no está declarado
- **THEN** el sistema informa que no existe, ofrece los disponibles y conserva el tema vigente
