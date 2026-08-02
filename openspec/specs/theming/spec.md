# theming Specification

## Purpose
Define la apariencia como dato y no como código: un contrato de tokens semánticos que los componentes consumen, y temas que se construyen sobreescribiendo únicamente los tokens que les interesan. Permite añadir o editar un tema sin tocar componentes, y verificar su legibilidad de forma automatizada.
## Requirements
### Requirement: Contrato de tokens semánticos

La apariencia SHALL definirse mediante un conjunto declarado de tokens semánticos, nombrados por su función y no por su valor. El contrato SHALL cubrir, como mínimo: colores de superficie y de texto sobre cada superficie, color de borde, de entrada y de foco, color de énfasis y color de estado destructivo, familias tipográficas, radio de esquina, escala de espaciado y escala de sombras.

Los componentes SHALL consumir exclusivamente tokens del contrato. Un componente MUST NOT contener valores literales de color, tipografía, radio ni sombra.

Todo token de color SHALL tener declarado su token de texto asociado, de modo que ninguna superficie pueda usarse sin saber qué color de texto le corresponde.

#### Scenario: Componente que consume tokens

- **WHEN** se inspecciona el estilo de cualquier componente de la interfaz
- **THEN** sus colores, tipografías, radios y sombras provienen de tokens del contrato y no de valores literales

#### Scenario: Valor literal introducido en un componente

- **WHEN** un componente introduce un color, radio o sombra literal en lugar de un token
- **THEN** la verificación automatizada falla e identifica el componente y el valor

#### Scenario: Superficie sin texto asociado

- **WHEN** se añade al contrato un token de superficie sin declarar su token de texto correspondiente
- **THEN** la verificación del contrato falla

### Requirement: Tokens de dominio derivados del contrato base

Los conceptos propios del producto —el prompt, el eco de la entrada del usuario, la respuesta del sistema, el mensaje de error, el cursor, y la representación de una capa activa y de su nivel— SHALL tener tokens propios.

Cada token de dominio SHALL declarar como valor por defecto un token del contrato base, de modo que un tema pueda ignorarlos por completo y seguir siendo coherente, o sobreescribirlos cuando quiera diferenciarlos.

#### Scenario: Tema que no define tokens de dominio

- **GIVEN** un tema que solo sobreescribe los tokens base
- **WHEN** se aplica
- **THEN** los elementos de dominio se presentan con los valores heredados del contrato base y la interfaz es legible y coherente

#### Scenario: Tema que diferencia un token de dominio

- **GIVEN** un tema que sobreescribe el token del mensaje de error
- **WHEN** se aplica y el sistema emite un error
- **THEN** el error se presenta con el color definido por el tema, y el resto de la interfaz no cambia

### Requirement: Los temas son capas de sobreescritura

Un tema SHALL definirse sobreescribiendo un subconjunto de los tokens del contrato. Los tokens que un tema no declare SHALL tomar el valor del conjunto base.

Añadir o modificar un tema MUST NOT requerir cambios en los componentes de la interfaz.

El sistema SHALL soportar la combinación de dos dimensiones independientes: el tema elegido y el esquema claro u oscuro. Cada tema SHALL declarar sus valores para ambos esquemas.

#### Scenario: Alta de un tema nuevo

- **WHEN** se añade un tema declarando únicamente los tokens que lo distinguen
- **THEN** el tema queda disponible para seleccionarse y la interfaz completa se presenta con él, sin haber modificado ningún componente

#### Scenario: Tema parcial

- **GIVEN** un tema que declara solo los colores de superficie y de texto
- **WHEN** se aplica
- **THEN** los radios, tipografías y sombras se mantienen en los valores base y la interfaz es coherente

#### Scenario: Cambio de esquema conservando el tema

- **GIVEN** el usuario tiene seleccionado un tema concreto en esquema oscuro
- **WHEN** cambia al esquema claro
- **THEN** conserva el mismo tema con sus valores para esquema claro

### Requirement: Selección de tema en caliente

El usuario SHALL poder seleccionar el tema y el esquema, tanto por comando de la consola como por control accionable por toque.

El cambio SHALL aplicarse de inmediato sin recargar la aplicación, y MUST NOT interrumpir ni alterar la reproducción en curso.

El sistema SHALL exponer los temas disponibles derivándolos de los temas realmente declarados, de modo que el listado no pueda desincronizarse.

#### Scenario: Cambio de tema durante la reproducción

- **GIVEN** un ambiente está sonando
- **WHEN** el usuario cambia el tema
- **THEN** la interfaz adopta el tema nuevo de inmediato y el audio continúa sin corte, sin cambio de volumen y sin reiniciar ninguna capa

#### Scenario: Listado de temas disponibles

- **WHEN** el usuario solicita los temas disponibles
- **THEN** el sistema lista exactamente los temas declarados

#### Scenario: Tema inexistente

- **WHEN** el usuario solicita un tema que no está declarado
- **THEN** el sistema informa que no existe, ofrece los disponibles y conserva el tema vigente

### Requirement: Persistencia y preferencia inicial del tema

La elección de tema y de esquema SHALL persistirse entre sesiones como parte de la configuración del usuario.

En el primer arranque, sin preferencia registrada, el sistema SHALL adoptar el esquema claro u oscuro que indique la preferencia del sistema operativo, y el tema declarado como predeterminado.

El tema SHALL aplicarse antes del primer dibujado de la interfaz, de modo que no se perciba un cambio de apariencia al cargar.

#### Scenario: El tema persiste entre sesiones

- **GIVEN** el usuario seleccionó un tema y un esquema
- **WHEN** vuelve a abrir la aplicación
- **THEN** la interfaz se presenta con ese tema y esquema

#### Scenario: Primer arranque sin preferencia registrada

- **GIVEN** el usuario nunca ha elegido tema y su sistema operativo indica preferencia por esquema oscuro
- **WHEN** abre la aplicación por primera vez
- **THEN** la interfaz se presenta en esquema oscuro con el tema predeterminado

#### Scenario: Ausencia de destello al cargar

- **GIVEN** el usuario tiene seleccionado un esquema distinto del predeterminado
- **WHEN** abre la aplicación
- **THEN** la interfaz aparece directamente con su esquema, sin mostrar antes otro

### Requirement: Contraste verificado de cada tema

Todo tema declarado SHALL alcanzar, para cada par de superficie y texto asociado y en ambos esquemas, la relación de contraste del nivel AA de WCAG.

La verificación SHALL ser automatizada sobre las declaraciones de tokens, de modo que un tema que no cumpla no pueda incorporarse.

#### Scenario: Tema que cumple el contraste

- **WHEN** se verifica un tema declarado
- **THEN** todos sus pares de superficie y texto alcanzan el nivel AA en ambos esquemas

#### Scenario: Tema con contraste insuficiente

- **WHEN** se declara un tema en el que un par de superficie y texto no alcanza el nivel AA
- **THEN** la verificación falla e identifica el tema, el par de tokens y la relación medida

### Requirement: Los temas no dependen de la red

Todos los temas declarados SHALL estar disponibles sin conexión. El sistema MUST NOT obtener definiciones de tema ni tipografías desde la red en tiempo de ejecución.

#### Scenario: Cambio de tema sin conexión

- **GIVEN** la aplicación está abierta sin conexión a la red
- **WHEN** el usuario cambia a cualquier tema disponible
- **THEN** el tema se aplica correctamente y no se produce ninguna petición de red

