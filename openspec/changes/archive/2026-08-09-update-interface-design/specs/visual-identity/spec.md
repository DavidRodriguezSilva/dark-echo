## ADDED Requirements

### Requirement: Nombre y marca del producto

El sistema SHALL declarar un nombre visible y una marca gráfica propios, y SHALL usarlos de forma coherente en todas las superficies donde la aplicación se identifica: pantalla de arranque, encabezado del modo visual, introducción de la consola, icono del navegador, icono de la aplicación instalada y metadata compartida.

La marca SHALL ser legible tanto a tamaño de icono de navegador como a tamaño de pantalla completa, sin sustituirse por una versión distinta en ninguno de los dos extremos.

La marca MUST NOT depender del color de acento vigente para reconocerse: SHALL mantenerse identificable en cualquier tema y en ambos esquemas.

El identificador técnico del producto —nombre de paquete, claves de almacenamiento local y nombre corto del manifiesto— SHALL permanecer estable e independiente del nombre visible, de modo que un cambio de presentación no invalide datos ya guardados.

#### Scenario: La marca es la misma en todas las superficies

- **WHEN** el usuario abre la aplicación, entra en la consola, la instala y comparte su enlace
- **THEN** encuentra el mismo nombre y la misma marca en todas ellas

#### Scenario: La marca sobrevive al cambio de tema

- **GIVEN** el usuario cambia de tema y de esquema
- **WHEN** observa la marca
- **THEN** sigue siendo reconocible y legible en todas las combinaciones

#### Scenario: Los datos guardados no dependen del nombre visible

- **GIVEN** el usuario tiene escenas y configuración guardadas
- **WHEN** cambia la presentación del nombre visible del producto
- **THEN** la configuración y las escenas guardadas siguen leyéndose sin migración

### Requirement: Pantalla de arranque y transición entre modos

La aplicación SHALL presentar al arrancar una pantalla que contenga únicamente la marca centrada, sin controles, sin texto adicional y sin indicador de progreso inventado.

La misma pantalla SHALL usarse como transición al conmutar entre el modo visual y el modo consola, de modo que el cambio se perciba como intencional y no como un fallo de dibujado.

La transición SHALL ser exclusivamente visual: MUST NOT alterar el estado del motor, la reproducción en curso, la composición de la escena ni ninguna preferencia del usuario.

La duración de la pantalla de arranque y de la transición SHALL estar acotada, y ambas SHALL respetar la preferencia del sistema por movimiento reducido, presentando en ese caso el destino directamente y sin animación.

#### Scenario: Arranque

- **WHEN** el usuario abre la aplicación
- **THEN** ve la marca centrada durante un tiempo acotado y a continuación la interfaz, sin barras de progreso ni texto adicional

#### Scenario: Transición al conmutar de modo

- **GIVEN** la interfaz está en un modo
- **WHEN** el usuario acciona el conmutador
- **THEN** la pantalla de marca se interpone brevemente y a continuación aparece el otro modo

#### Scenario: La transición no toca el audio

- **GIVEN** una escena está sonando
- **WHEN** el usuario conmuta de modo y la transición se presenta
- **THEN** el audio continúa sin corte, con las mismas capas y los mismos volúmenes

#### Scenario: Movimiento reducido

- **GIVEN** el sistema operativo indica preferencia por movimiento reducido
- **WHEN** el usuario arranca la aplicación y conmuta de modo
- **THEN** no se presenta parpadeo ni animación de transición, y el destino aparece directamente

### Requirement: Metadata e iconos coherentes con el producto

La aplicación SHALL declarar su título, su descripción, sus iconos y su metadata para compartir —incluidos los datos de Open Graph y el manifiesto de la aplicación instalable— de forma coherente con lo que el producto hace y con cómo se opera realmente.

La descripción MUST NOT presentar la consola de comandos como la única forma de operar la aplicación, dado que el modo visual es el modo por defecto.

El icono del navegador y los iconos de la aplicación instalada SHALL derivarse de la marca declarada, y MUST NOT ser provisionales ni ajenos a ella.

El color de tema declarado para la aplicación instalada SHALL corresponder al color de fondo real de la interfaz, de modo que la ventana instalada no muestre un borde de color distinto del de la aplicación.

#### Scenario: Descripción coherente con los dos modos

- **WHEN** alguien consulta la descripción de la aplicación o comparte su enlace
- **THEN** la descripción refleja que la aplicación genera ambientes sonoros procedurales y que se opera con una interfaz gráfica y, opcionalmente, con una consola de comandos

#### Scenario: Iconos derivados de la marca

- **WHEN** el usuario instala la aplicación o la abre en una pestaña del navegador
- **THEN** el icono presentado es el de la marca declarada, en todos los tamaños requeridos

#### Scenario: La ventana instalada no desentona

- **WHEN** el usuario abre la aplicación instalada
- **THEN** el color declarado como color de tema coincide con el fondo real de la interfaz
