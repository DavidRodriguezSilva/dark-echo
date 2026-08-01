## 1. Aplanado del repositorio

- [x] 1.1 Mover el contenido de `dark-echo/dark-echo/` a la raíz del repositorio con `git mv`, en un commit que solo mueva archivos, sin cambios de contenido
- [x] 1.2 Ajustar `.gitignore`, `.vscode/` y cualquier ruta que apunte al subdirectorio anterior
- [x] 1.3 Verificar que `pnpm install`, `pnpm dev` y `pnpm build` funcionan desde la raíz y que la aplicación sigue reproduciendo los cuatro ambientes actuales

## 2. Tooling y CI

- [x] 2.1 Declarar pnpm en `package.json` (`packageManager`) y fijar la versión de Node soportada
- [x] 2.2 Configurar ESLint y Prettier con las reglas del proyecto, y añadir los scripts `lint`, `format` y `typecheck`
- [x] 2.3 Instalar y configurar Vitest para el entorno Node, con el script `test`
- [x] 2.4 Añadir el workflow de CI que ejecuta `typecheck`, `lint` y `test`, y dejarlo en verde sobre el código existente

## 3. Migración a React, Tailwind y contrato de tokens

- [x] 3.1 Añadir `react`, `react-dom`, `@vitejs/plugin-react` y sus tipos; registrar el plugin en `vite.config.ts`
- [x] 3.2 Añadir Tailwind v4 con `@tailwindcss/vite` e inicializar shadcn/ui con `cssVariables` activado
- [x] 3.3 Escribir el archivo de tokens base **dark-first** en OKLCH: superficies con su texto asociado, borde, entrada, foco, énfasis, destructivo, tipografías, radio, espaciado y sombras, expuestos con `@theme inline`
- [x] 3.4 Declarar los tokens de dominio (prompt, eco, respuesta, error, cursor, capa activa, nivel) con un token base como valor por defecto
- [x] 3.5 Configurar el eje de esquema (oscuro por defecto en `:root`, `.light` como sobreescritura) y el eje de tema con `data-theme` sobre el elemento raíz
- [x] 3.6 Sustituir `src/main.ts` por `src/main.tsx` y actualizar `index.html`, eliminando el bootstrap por `innerHTML`
- [x] 3.7 Eliminar `src/style.css`, huérfano en el prototipo, y reemplazar `src/styles/index.css` por la capa base de Tailwind más el archivo de tokens
- [x] 3.8 Reconstruir la interfaz actual como componentes React consumiendo solo tokens, sobre el motor y el parser existentes sin modificarlos
- [x] 3.9 Añadir la verificación automatizada que falla si un componente contiene un color, radio o sombra literal en lugar de un token
- [x] 3.10 Verificar que los cuatro ambientes, `stop`, `volume` y `list` se comportan igual que antes de la migración

## 4. Estructura en capas

- [x] 4.1 Crear las carpetas `domain/`, `dsp/`, `audio/`, `commands/`, `platform/`, `styles/` y `ui/` con la responsabilidad de cada una documentada
- [x] 4.2 Reubicar el código existente en las capas que le corresponden, sin cambiar comportamiento
- [x] 4.3 Añadir la regla de lint que impide dependencias en dirección contraria a la declarada en `design.md` (D6), verificando en particular que `dsp/`, `domain/` y `audio/` no importan nada de `ui/`

## 5. Investigación y referencia de síntesis

- [x] 5.1 Investigar y documentar el modelo de **impactos y gotas**: mecanismo de impacto y de burbuja arrastrada, resonancia de Minnaert, distribución de radios, parámetros con rangos, unidades y fuentes
- [x] 5.2 Investigar y documentar los modelos de **flujo turbulento**, **ráfagas de aire**, **oleaje**, **combustión** y **descargas eléctricas** con el mismo nivel de detalle
- [x] 5.3 Establecer la regla de que todo parámetro se declara en unidad física con rango y justificación, y que los coeficientes se derivan en tiempo de ejecución
- [x] 5.4 Registrar para cada modelo las alternativas consideradas y el motivo de la elección
- [x] 5.5 Definir el **protocolo de validación perceptual**: duración mínima de escucha, condiciones de reproducción y rasgos a evaluar
- [x] 5.6 Declarar los **criterios espectrales** por ambiente (banda de energía, pendiente, tolerancia) y el **umbral de periodicidad**, con valores provisionales a calibrar en la tarea 9.4
- [x] 5.7 Declarar el **presupuesto de coste de cómputo** para el ambiente más exigente y para la mezcla simultánea, y el número máximo de capas que se deriva de él
- [x] 5.8 Documentar los criterios de **imagen estéreo**: colocación y anchura por capa, decorrelación y compatibilidad mono
- [x] 5.9 Publicar el documento de referencia en el repositorio con sus fuentes citadas y enlazarlo desde `readme.md`

## 6. Núcleo de DSP puro y determinista

- [x] 6.1 Implementar el PRNG sembrado y retirar `Math.random()` del núcleo de DSP; test de que la misma semilla produce la misma secuencia y semillas distintas producen secuencias distintas
- [x] 6.2 Implementar los generadores de ruido (blanco, marrón y los que exija la referencia) como funciones puras sembradas, con tests de sus características estadísticas
- [ ] 6.3 Implementar el modulador compuesto de D5: suma de osciladores de periodos inconmensurables más paseo aleatorio filtrado, con test de que la salida permanece en el rango declarado
- [ ] 6.4 Implementar la voz de gota según 5.1 (impacto más burbuja con decaimiento y deriva de tono), con test de que su frecuencia fundamental sigue la relación declarada para un radio dado
- [ ] 6.5 Implementar el generador de eventos como proceso de Poisson sembrado, con test de que los intervalos caen dentro del rango declarado y no son constantes
- [ ] 6.6 Implementar la derivación de coeficientes a partir de parámetros físicos y de la frecuencia de muestreo, con test de que un mismo parámetro produce la misma respuesta a 44,1 y a 48 kHz

## 7. Motor de audio sobre `AudioWorklet`

- [ ] 7.1 Crear el `AudioWorkletProcessor` de fuentes de ruido sobre las primitivas de la tarea 6, y su carga por URL en el build
- [ ] 7.2 Configurar el precache del módulo del worklet en `vite-plugin-pwa`, comprobando que aparece en el manifiesto del service worker generado
- [ ] 7.3 Implementar el ciclo de vida del contexto de audio: creación diferida al primer comando que requiera sonido, reanudación del estado suspendido e informe del resultado
- [ ] 7.4 Implementar el fallo explícito cuando el entorno no soporta la síntesis requerida, con el estado del sistema reflejando que no hay reproducción
- [ ] 7.5 Implementar el compilador de capas: traducción de la declaración de una capa al subgrafo de nodos nativos más worklets, derivando los coeficientes de la frecuencia real del contexto
- [ ] 7.6 Implementar la mezcla multicapa con volumen independiente por capa y volumen maestro que preserva las proporciones relativas
- [ ] 7.7 Implementar la salida estéreo con colocación y anchura por capa, y la decorrelación por flujos de ruido independientes según D16
- [ ] 7.8 Implementar el límite máximo de capas simultáneas, rechazando la incorporación con un mensaje que indique el límite y dejando la mezcla intacta
- [ ] 7.9 Implementar las transiciones de entrada y salida partiendo de la amplitud instantánea vigente, y verificar por escucha que no hay clics al iniciar, detener, añadir ni retirar capas
- [ ] 7.10 Implementar la limitación de la salida para que la suma de capas no produzca distorsión por recorte
- [ ] 7.11 Implementar el planificador de anticipación para eventos esporádicos según D2, con posición estéreo distinta en cada disparo
- [ ] 7.12 Implementar el `AudioWorkletProcessor` de granulación densa con banco de voces para eventos de alta densidad

## 8. Modelo declarativo de ambientes y `rain`

- [ ] 8.1 Definir en `domain/` el tipo de declaración de ambiente y de capa, incluyendo la referencia al modelo de síntesis que aplica cada capa y su colocación estéreo
- [ ] 8.2 Implementar el catálogo y derivar de él el listado de ambientes, eliminando la lista de nombres duplicada en el parser
- [ ] 8.3 Declarar `rain` con sus tres capas —cuerpo continuo, granulación de impactos y goteo esporádico— y verificar que cada capa es direccionable de forma individual
- [ ] 8.4 Verificar por escucha prolongada que `rain` evoluciona de forma audible y no revela un patrón repetido

## 9. Verificación de señal y calibración

- [ ] 9.1 Configurar Vitest en modo navegador sobre Chromium y el arnés de render con `OfflineAudioContext`, separado de la suite rápida
- [ ] 9.2 Implementar las utilidades de análisis: FFT radix-2 y autocorrelación normalizada sobre la envolvente de energía en ventanas cortas
- [ ] 9.3 Implementar la comprobación de compatibilidad mono: sumar los canales y verificar que ninguna capa se cancela
- [ ] 9.4 Calibrar los umbrales espectrales y de periodicidad sobre el render real de `rain` y actualizar la referencia de síntesis con los valores definitivos y su tolerancia
- [ ] 9.5 Añadir el test de perfil espectral de `rain`, el de ausencia de periodicidad y el de equivalencia entre 44,1 y 48 kHz, e integrarlos en CI
- [ ] 9.6 Medir el coste de cómputo de `rain` en reproducción sostenida, registrarlo contra el presupuesto declarado y fijar con ese dato el número máximo de capas
- [ ] 9.7 Verificar que el audio se mantiene sin cortes mientras se interactúa intensamente con la consola, y en una sesión de reproducción prolongada

## 10. Portado de los ambientes restantes

- [ ] 10.1 Declarar `wind` bajo el modelo de ráfagas de la referencia, sustituyendo el LFO sinusoidal por el modulador compuesto
- [ ] 10.2 Declarar `river` bajo los modelos de flujo turbulento y burbujas
- [ ] 10.3 Declarar `ocean` con la envolvente de oleaje asimétrica y el estallido de rompiente
- [ ] 10.4 Añadir los tests espectrales, de periodicidad y de compatibilidad mono de los tres ambientes, ajustando sus criterios en la referencia
- [ ] 10.5 Aplicar el protocolo de validación perceptual a los cuatro ambientes, con comparación A/B contra la versión anterior, y registrar el resultado y los defectos aceptados
- [ ] 10.6 Revisar los umbrales de 9.4 con los cuatro renders reales y consolidarlos
- [ ] 10.7 Retirar el motor y los generadores antiguos, incluido `ScriptProcessorNode`, y verificar que no queda código muerto

## 11. Gramática y vocabulario de comandos

- [ ] 11.1 Implementar el descriptor de comando (nombre, alias, descripción, argumentos con tipo, obligatoriedad y dominio de valores) y el registro de comandos
- [ ] 11.2 Implementar la validación de entrada contra el descriptor, garantizando que ningún comando se ejecuta con argumentos inválidos
- [ ] 11.3 Implementar los mensajes de error accionables: argumento ausente, tipo incorrecto y valor fuera de rango, indicando en cada caso cómo corregirlo
- [ ] 11.4 Implementar la sugerencia por distancia de edición ante nombres de comando desconocidos
- [ ] 11.5 Implementar el reconocimiento de los prefijos `/` y `.` como forma abreviada de invocación
- [ ] 11.6 Implementar el comando de ayuda, general y por comando, derivando su contenido de los descriptores
- [ ] 11.7 Implementar `play <ambiente>` sustituyendo la mezcla y `play` sin argumento reanudando la conservada, con confirmación que indique explícitamente que sustituyó
- [ ] 11.8 Implementar `add`, `remove`, `stop` conservando la composición, y `reset` vaciando la mezcla
- [ ] 11.9 Implementar `volume` en sus dos formas, `list`, `status` y `clear`
- [ ] 11.10 Implementar los comandos de escena (`save`, `load`, `list`, `delete`) y de tema
- [ ] 11.11 Retirar `src/commands/parser.ts` y su lista de sonidos duplicada
- [ ] 11.12 Cubrir con tests la validación, los errores, los alias, los prefijos, la entrada vacía y la semántica de sustituir frente a acumular

## 12. Consola y panel de estado

- [ ] 12.1 Implementar el store observable del estado de reproducción y su consumo desde React con `useSyncExternalStore`
- [ ] 12.2 Implementar el historial navegable hacia atrás y hacia adelante, con retorno al contenido en edición, deduplicación de entradas consecutivas iguales y límite máximo de entradas
- [ ] 12.3 Persistir el historial entre sesiones y verificar que se recupera al reabrir la aplicación
- [ ] 12.4 Implementar el autocompletado bajo demanda: coincidencia única, coincidencias múltiples con prefijo común, y valores de argumento
- [ ] 12.5 Implementar las sugerencias en vivo sin alterar lo escrito hasta que el usuario acepte una
- [ ] 12.6 Implementar la salida como registro al que solo se añade, distinguiendo eco, respuesta y error, con límite de líneas retenidas
- [ ] 12.7 Implementar el seguimiento automático de la última línea y su suspensión cuando el usuario ha desplazado la salida hacia atrás
- [ ] 12.8 Implementar el panel de estado con capas activas, volumen por capa, volumen maestro y estado de reposo explícito
- [ ] 12.9 Implementar los controles táctiles de iniciar, detener y ajustar volumen maestro sobre las primitivas de shadcn, verificando que producen el mismo efecto que sus comandos y actualizan el panel
- [ ] 12.10 Implementar la identidad de terminal: tipografía monoespaciada, línea de entrada enfocada al abrir y cursor que respeta la preferencia por movimiento reducido

## 13. Apariencia y temas

- [ ] 13.1 Implementar el registro de temas declarados y derivar de él el listado que expone la aplicación
- [ ] 13.2 Declarar un segundo tema sobreescribiendo solo los tokens que lo distinguen, para demostrar que la herencia del base funciona
- [ ] 13.3 Implementar la selección de tema y de esquema por comando y por control táctil, aplicada sin recargar
- [ ] 13.4 Verificar que un cambio de tema durante la reproducción no interrumpe el audio ni reinicia ninguna capa
- [ ] 13.5 Persistir tema y esquema como parte de la configuración, y adoptar en el primer arranque la preferencia de esquema del sistema operativo
- [ ] 13.6 Aplicar el tema antes del primer dibujado para que no se perciba un destello de otro esquema al cargar
- [ ] 13.7 Implementar la verificación automatizada de contraste AA sobre las declaraciones de tokens, para cada par de superficie y texto y en ambos esquemas, e integrarla en CI
- [ ] 13.8 Documentar qué cubre y qué no cubre esa verificación, y revisar los temas también a ojo
- [ ] 13.9 Verificar que todos los temas y tipografías están empaquetados y que cambiar de tema sin conexión no produce peticiones de red

## 14. Persistencia

- [ ] 14.1 Implementar el puerto de almacenamiento en `platform/` con el sobre versionado `{ version, data }`
- [ ] 14.2 Implementar la persistencia y restauración de la configuración del usuario, con valores por defecto documentados en el primer arranque
- [ ] 14.3 Implementar guardar, listar, cargar y eliminar escenas, con nombres únicos y confirmación explícita al sobreescribir
- [ ] 14.4 Implementar la carga de escena sobre una mezcla en curso con transición suave y sin corte audible
- [ ] 14.5 Implementar el recuerdo de la última mezcla y su restauración al arrancar en estado detenido, reanudable con una sola acción y sin presentarse como si sonara
- [ ] 14.6 Implementar la migración por versión y el descarte informado cuando no exista migración posible
- [ ] 14.7 Implementar la tolerancia a almacenamiento corrupto, ausente o de escritura denegada, garantizando que la aplicación arranca y reproduce en todos esos casos
- [ ] 14.8 Cubrir con tests la serialización de escenas, la migración, el descarte y los casos de almacenamiento degradado
- [ ] 14.9 Verificar que ningún cambio de configuración, tema o escenas genera peticiones de red

## 15. Offline y ciclo de vida

- [ ] 15.1 Verificar el arranque y la reproducción de todos los ambientes sin conexión, y que no se registra tráfico de red durante la reproducción
- [ ] 15.2 Verificar la instalación en dispositivo con nombre, icono y color de tema, y la paridad funcional de la versión instalada
- [ ] 15.3 Implementar el mantenimiento de la reproducción al perder la visibilidad y la reconciliación del estado al recuperarla, incluida la suspensión impuesta por el entorno
- [ ] 15.4 Sustituir el `registerType: "autoUpdate"` actual por la actualización no disruptiva: aviso sin interrumpir el audio, aplicación automática solo sin reproducción activa
- [ ] 15.5 Ejecutar la prueba offline completa en un dispositivo Android real, confirmando que el módulo del worklet está precacheado

## 16. Documentación del proyecto

- [ ] 16.1 Rellenar `context` en `openspec/config.yaml`: stack, capas de la arquitectura y su dirección de dependencias, contrato de tokens, convenciones y dominio de audio procedural
- [ ] 16.2 Definir `rules` por artefacto en `openspec/config.yaml` según lo aprendido al redactar este change
- [ ] 16.3 Reescribir `readme.md`: nombre real del producto, arquitectura vigente, cómo levantar y testear el proyecto, cómo añadir un ambiente nuevo remitiendo a la referencia de síntesis, y cómo añadir un tema
- [ ] 16.4 Retirar del `readme.md` el contenido superado: la estructura de `src/` que no coincide con la real, el buffer de ~10 s, el enfoque de `ScriptProcessorNode` y el roadmap desalineado
- [ ] 16.5 Reformular en el `readme.md` el principio de mínimas dependencias como aplicable al núcleo de audio, explicando la decisión de D12
- [ ] 16.6 Consultar al propietario del proyecto la licencia y sustituir el «pendiente de definir»

## 17. Cierre

- [ ] 17.1 Verificar cada escenario de las siete especificaciones de este change y registrar los que requieren verificación manual
- [ ] 17.2 Dejar CI en verde con typecheck, lint, tests de Node, tests de señal, contraste de temas y ausencia de valores literales
- [ ] 17.3 Ejecutar `openspec validate procedural-audio-foundation --strict` y resolver lo que reporte
