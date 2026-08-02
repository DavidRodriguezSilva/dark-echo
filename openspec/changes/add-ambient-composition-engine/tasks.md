## 1. Fundamentos del motor

- [ ] 1.1 Decidir la ubicación del código nuevo dentro de `domain/`, `dsp/`, `audio/`, `commands/` (design.md D7) — documentar la decisión antes de escribir el primer componente, no como una ocurrencia tardía.
- [ ] 1.2 Definir la gramática mínima de comandos del motor nuevo (verbos para activar/retirar `Source`, `Environment`, `Occlusion`, `Modifier`), distinta de `play`/`add`/`remove` del motor actual.
- [ ] 1.3 Confirmar que el motor actual y sus comandos existentes no se ven afectados (prueba de humo manual: `play rain` por el motor actual suena exactamente igual que antes de este change).

## 2. `Source` (`rain`) solo, por el motor nuevo

- [ ] 2.1 Enrutar el `Source` ya existente de `rain` (capas `cuerpo`/`impactos`/`goteo`, sin modificarlas) a través del motor de composición nuevo.
- [ ] 2.2 Test de señal: `rain` reproducida por el motor nuevo, sin ningún otro componente activo, cumple los mismos criterios de `docs/synthesis-reference.md` que ya cumple por el motor actual.
- [ ] 2.3 Validación perceptual (juicio humano, no automatizable): confirmar que `rain` sola por el motor nuevo suena tan convincente como por el motor actual — comparación A/B directa.

## 3. `Environment`: bus compartido de escena

- [ ] 3.1 Resolver el mecanismo de síntesis de un `Environment` (design.md, Open Questions; heredado de `handoff-ambientes.md`, pregunta 2): reverberación convolucional, banco de filtros paramétrico, o capas condicionadas al entorno. Documentar la elección y su justificación en `docs/synthesis-reference.md` **antes** de declarar el primer entorno.
- [ ] 3.2 Declarar dos `Environment` mínimos para el piloto: `cabaña` (madera) y `casa` (concreto), cada uno con su modelo de síntesis documentado primero en `docs/synthesis-reference.md`, incluyendo las superficies estructurales que declara contener (capacidad `ambient-environment`).
- [ ] 3.3 Implementar el bus compartido: como mucho un `Environment` activo, coloreando el `Source` enrutado sin que este último se modifique en sí mismo. Verificar que un `Environment` activo sin ningún `Source` no produce sonido audible.
- [ ] 3.4 Test de señal: `rain` + cada `Environment` cumple el criterio espectral/perceptual declarado en el paso 3.2 sobre el render real.
- [ ] 3.5 Test de regresión: activar o sustituir el `Environment` no cambia el criterio espectral propio del `Source` `rain` medido en aislamiento (independencia de capas, sobre el render real, no solo por inspección de código).
- [ ] 3.6 Validación perceptual (juicio humano): escuchar `rain` con cada `Environment`, confirmar reconocibilidad y ausencia de artefactos; registrar en `docs/synthesis-reference.md`.

## 4. `Occlusion`: barrera compartida de escena

- [ ] 4.1 Resolver el mecanismo de la respuesta sonora propia de una `Occlusion` (design.md D9 y Open Questions): `Source` secundario excitado, filtro resonante sobre la señal del `Source`, o capa propia de la oclusión. Documentar la elección en `docs/synthesis-reference.md` antes de declarar la primera oclusión.
- [ ] 4.2 Declarar dos `Occlusion` mínimas: `techo-madera` y `ventana-vidrio`, cada una con su modelo de síntesis documentado primero en `docs/synthesis-reference.md`, incluyendo su propio grado de atenuación (variante delgada/gruesa).
- [ ] 4.3 Implementar la respuesta sonora de `techo-madera` (el repiqueteo de `rain` sobre la superficie), escalada por la intensidad de `rain` y muda sin `Source` incidiendo — el caso que `handoff-ambientes.md` identifica como el de mayor identidad sonora propia de la familia.
- [ ] 4.4 Declarar las etiquetas de afinidad posicional/estructural (design.md D6) para `cabaña`, `casa`, `techo-madera`, `ventana-vidrio`, derivadas de las superficies declaradas en el paso 3.2 — sin usar coincidencia de material como criterio.
- [ ] 4.5 Test de señal: cada combinación `Environment` + `Occlusion` + `rain` cumple su criterio declarado sobre el render real.
- [ ] 4.6 Test de señal dirigido a la respuesta propia: el render de `rain` + `techo-madera` presenta la firma del repiqueteo declarada en el paso 4.2, y su energía sigue a la intensidad de `rain`; sin `Source` activo, `techo-madera` no produce señal.
- [ ] 4.7 Test dirigido de la Decisión D6: verificar que `casa` + `ventana-vidrio` puntúa alto pese al material distinto, y que `campo-abierto` (o la ausencia de `Environment`) + `techo-madera` puntúa bajo por falta de estructura que lo sostenga.
- [ ] 4.8 Validación perceptual (juicio humano): escuchar cada combinación válida, registrar resultado. Prestar atención específica a si `rain` + `techo-madera` se percibe como *lluvia golpeando un techo* y no como lluvia filtrada.

## 5. `Modifiers`: parámetros por `Source`

- [ ] 5.1 Declarar el `Modifier` de distancia para `rain`, cuyo valor puede variar en el tiempo (para demostrar movimiento aparente sin necesitar un segundo `Source`, ver `ambient-modifiers`, "Un `Modifier` de movimiento es autocontenido").
- [ ] 5.2 Confirmar explícitamente que la intensidad de `rain` sigue siendo un parámetro propio del `Source`, no expuesta como `Modifier` (design.md D4) — prueba de que el comando de intensidad y el de distancia son rutas distintas.
- [ ] 5.3 Test de señal: `rain` con el `Modifier` de distancia activo, solo y combinado con un `Environment`/`Occlusion`, cumple los criterios declarados.
- [ ] 5.4 Validación perceptual (juicio humano): confirmar que la distancia se percibe como acercarse/alejarse de forma coherente.

## 6. `Compatibility`: puntuación y advertencia no bloqueante

- [ ] 6.1 Implementar la puntuación por coincidencia de etiquetas entre `Source`, `Environment`, `Occlusion` y `Modifier`, usando el vocabulario declarado en los pasos 3–5.
- [ ] 6.2 Calibrar el umbral numérico de afinidad por debajo del cual se dispara la advertencia (design.md, Open Questions), contra las combinaciones ya construidas.
- [ ] 6.3 Integrar la advertencia no bloqueante en la salida de la consola (capacidad `command-console`).
- [ ] 6.4 Test: una combinación de baja afinidad se activa igual y produce la advertencia; una de alta afinidad se activa sin advertencia.

## 7. Composición progresiva: validación integral

- [ ] 7.1 Verificar la escalera completa de `openspec/project.md` ("Composición progresiva") sobre el render real: `rain` sola → con distintos niveles de intensidad → dentro de `cabaña` → con `Environment` + intensidad simultáneos → cualquier combinación válida construida en los pasos 3–6.
- [ ] 7.2 Confirmar que ningún componente es indispensable (`ambient-composition-engine`): desmontar la escena completa retirando uno a uno `Environment`, `Occlusion` y `Modifier` deja `rain` sonando de forma aceptable en cada paso intermedio, y al final idéntica a como sonaba antes de agregar nada — nunca rota o incompleta.

## 8. Documentación

- [ ] 8.1 Añadir a `docs/ambient-catalog-roadmap.md` una nota sobre el motor de composición nuevo y su alcance piloto (solo `rain`), incluyendo la relectura que propone `handoff-ambientes.md`: **bosques** probablemente es un `Environment` reutilizable por `rain` y `wind`, no un `Source` propio pendiente de investigar; ciudad, cafetería y biblioteca sí combinan `Source`s genuinamente nuevos con un `Environment`.
- [x] 8.2 Archivar `handoff-ambientes.md` dentro de este change, con un encabezado que distinga qué quedó superado por estas decisiones y qué sigue vigente, sin reescribir su cuerpo. Retirado de la raíz del repositorio.
- [ ] 8.3 Registrar en `docs/synthesis-reference.md` el presupuesto de cómputo medido para el motor nuevo (no hereda el límite de 8 capas del motor actual sin remedirlo — ver `handoff-ambientes.md`, pregunta abierta 5, ya resuelta por el cambio de arquitectura, pero el número concreto para el motor nuevo sigue sin medir).
