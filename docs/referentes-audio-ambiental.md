# Audio ambiental en videojuegos: referentes para DarkEcho

Investigación de solo lectura (octubre 2026). Alcance: cómo los juegos construyen ambientación (clima, locación, superficie) y qué se traduce a Web Audio.

**Nota de fiabilidad.** Varias páginas clave devolvieron 403 al leerlas (Valve Developer Community, TWHL, Audiokinetic). Lo marcado **[Verificado]** salió de un resultado de búsqueda citado con URL. Lo marcado **[Hipótesis]** o **[Conocimiento previo]** no se pudo contrastar en esta sesión y debe validarse antes de decidir algo con ello. No hay charlas GDC leídas de primera mano.

## Tabla resumen

| Juego                             | Técnica clave                                                                                    | Fuente                                                                                                              | Estado del código                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Eternal Return                    | Sin fuente hallada. Hipótesis: bancos de ambiente por zona + clima                               | https://en.wikipedia.org/wiki/Eternal_Return_(video_game) (solo contexto)                                           | Cerrado, propietario                                      |
| Half-Life 2 / Source              | `soundscapes_*.txt`: lazos + eventos aleatorios + preset DSP por zona                            | https://developer.valvesoftware.com/wiki/Soundscape (vía búsqueda)                                                  | Source SDK 2013 en GitHub, "source-available"             |
| Half-Life 1 SDK                   | Entidades de sonido de mapa + licencia de mod                                                    | https://github.com/alliedmodders/hlsdk                                                                              | Código del SDK publicado por Valve, licencia restrictiva  |
| Quake (id)                        | Lazos ambientales por contenido de la hoja de BSP, con fade                                      | https://quakewiki.org/wiki/Legal_status                                                                             | GPL, liberado oficialmente                                |
| The Witcher 3                     | Ambiente local sobrescribe clima global vía RTPC de volumen; animales según hora, viento, lluvia | https://www.audiokinetic.com/learn/videos/VJUuI_dw8Cc                                                               | Cerrado (charla Wwise Tour 2016)                          |
| Game of Thrones: Winter is Coming | Fuentes puntuales 3D + cama 2D de viento cuyo volumen sube al alejar la cámara                   | https://www.audiokinetic.com/blog/game-of-thrones-interactive-environment-sound-design                              | Cerrado                                                   |
| Red Dead Redemption (2010)        | Ambientes por región; insectos y aves dependen de clima y hora                                   | https://designingsound.org/2010/08/20/red-dead-redemption-exclusive-interview-with-audio-director-jeffrey-whitcher/ | Cerrado (motor RAGE)                                      |
| Skyrim                            | Registros REGN: clima + sonido + música por región                                               | https://pt.uesp.net/wiki/Skyrim_Mod:Mod_File_Format/REGN                                                            | Formato de datos documentado por comunidad; motor cerrado |
| Minecraft                         | Música y cuevas con disparo aleatorio; "mood" de cueva por oscuridad                             | https://shorefire.com/releases/entry/twenty-thousand-hertz-reveals-how-the-music-sounds-of-minecraft-were-made      | Cerrado (Java ofuscado)                                   |
| The Last of Us II                 | Grabación de lugares reales (mina abandonada), capas                                             | https://www.asoundeffect.com/the-last-of-us-part-ii-sound/                                                          | Cerrado                                                   |
| Hellblade                         | Grabación binaural con micrófonos a distancia de cabeza                                          | https://multiplayer.it/articoli/179870-hellblade-senuas-sacrifice-senua-e-le-sue-voci.html                          | Cerrado                                                   |
| Zelda BotW                        | Menos música, más ambiente; fuente primaria no hallada                                           | https://www.zeldadungeon.net/breath-of-the-wilds-soundtrack-makes-heavy-use-of-piano-and-environmental-s/           | Cerrado                                                   |
| Death Stranding / Elden Ring      | Solo música/objetos reales; nada sobre ambientación                                              | https://gamemusic.net/the-unknown-sounds-of-death-stranding/                                                        | Cerrado                                                   |

## 1. Eternal Return (hipótesis, sin fuente)

- **[Verificado]** Lo único confirmado: lo desarrolla Nimble Neuron, publica Kakao Games, mapa de la isla Lumia. Fuentes: https://en.wikipedia.org/wiki/Eternal_Return_(video_game) y https://www.invenglobal.com/articles/9336/a-comprehensive-first-look-at-black-survival-eternal-return
- Dos búsquedas no hallaron nada sobre sonido por zona, clima o piso. El audio de menú es música de piano (Inven, misma URL).
- **[Hipótesis]** El mapa se divide en zonas (locaciones) y cada una tiene un banco de ambiente propio. El clima o la hora modifican capas. Los interiores o pisos cambian la reverberación y el filtrado. Esto es lo esperable en cualquier motor con middleware, no un dato del juego.
- Acción sugerida: Drack puede contrastar con el juego a oído (grabar la transición entre dos zonas). No se hizo desde aquí.

## 2. Referentes de ambientación

### The Witcher 3 (CD Projekt Red)

- **[Verificado vía resumen de búsqueda]** Las locaciones personalizadas tienen ambiente local que sobrescribe el clima global mediante un RTPC sobre el volumen. Los animales se integran como ambientes y reaccionan a hora, viento e intensidad de lluvia.
- Fuente: https://www.audiokinetic.com/learn/videos/VJUuI_dw8Cc (el fetch dio 403; se usó el resumen del buscador).
- Idea: un solo parámetro numérico decide cuánto del clima global se oye frente al ambiente local.

### Game of Thrones: Winter is Coming (Wwise)

- **[Verificado vía búsqueda]** Fuentes puntuales 3D para detalles del terreno y una cama 2D de viento cuyo volumen sube al alejar la cámara, para suavizar saltos de sonoridad.
- Fuente: https://www.audiokinetic.com/blog/game-of-thrones-interactive-environment-sound-design

### Warhammer 40,000: Rogue Trader (Wwise)

- **[Verificado vía búsqueda]** El "room tone" son varias capas en equilibrio por el campo estéreo (ráfagas, brisas, insectos), con cortes de EQ para despejar los medios.
- Fuente: https://www.audiokinetic.com/wh40k-rogue-trader

### Red Dead Redemption / RDR2 (Rockstar, motor RAGE)

- **[Verificado]** Entrevista de 2010 sobre el primer juego: ambientes por región, subdivididos; insectos y aves respetan clima y hora.
- Fuente: https://designingsound.org/2010/08/20/red-dead-redemption-exclusive-interview-with-audio-director-jeffrey-whitcher/
- Sobre RDR2 no hallé charla primaria. Lo de "cantos de aves por hora y hábitat" viene de un listado sin cita (https://fictionhorizon.com/games-with-sound-design-pulled-from-nature-recordings/): **[Hipótesis]**.

### Skyrim / Fallout (Bethesda)

- **[Verificado parcial]** Un registro de región (REGN) agrupa información ambiental: clima, música, sonidos. Mods como Sounds of Skyrim añaden llamadas de animales según clima, hora y región; en la entrada de mazmorras se oye el clima exterior.
- Fuentes: https://pt.uesp.net/wiki/Skyrim_Mod:Mod_File_Format/REGN y https://www.nexusmods.com/skyrim/mods/10886 (resumen del buscador, no leído).
- El motor es cerrado. Solo el formato de datos está documentado por la comunidad (UESP). OpenMW (reimplementación libre de Morrowind, GPL) existe pero no se revisó en esta sesión: **[pendiente]**.

### Minecraft

- **[Verificado]** Daniel Rosenfeld (C418) hizo que las pistas empiecen y paren en intervalos aparentemente aleatorios, porque no puede saber qué hace el jugador. Fuente: https://shorefire.com/releases/entry/twenty-thousand-hertz-reveals-how-the-music-sounds-of-minecraft-were-made
- **[Hipótesis, fuente de modders]** El sonido de cueva se dispara por oscuridad (nivel de luz) y no por estar en una cueva, y se reproduce en un desfase aleatorio. Fuentes: https://www.modpackindex.com/mod/105576/expanded-cave-sounds y https://cyberpost.co/?p=447733. No es documentación de Mojang.
- Idea: el disparo aleatorio con espaciado largo evita que el oyente reconozca un bucle.

### The Last of Us II (Naughty Dog)

- **[Verificado]** Grabaron lugares reales (una mina vieja) para la ambientación.
- Fuente: https://www.asoundeffect.com/the-last-of-us-part-ii-sound/
- No hallé detalle técnico de Wwise. El middleware de Naughty Dog es propio: **[Hipótesis]**, no lo afirmo.

### Hellblade: Senua's Sacrifice (Ninja Theory)

- **[Verificado, fuente secundaria]** Voces grabadas con micrófonos binaurales separados como una cabeza; con auriculares rodean al oyente. Fuente: https://multiplayer.it/articoli/179870-hellblade-senuas-sacrifice-senua-e-le-sue-voci.html
- Es grabación binaural, no render binaural en tiempo real.

### Zelda BotW, Dark Souls/Elden Ring, Death Stranding

- BotW: el juego retira música de campo abierto y deja que el ambiente suene (**[Verificado, ensayo de estudiante y prensa]**): https://www.zeldadungeon.net/breath-of-the-wilds-soundtrack-makes-heavy-use-of-piano-and-environmental-s/. Sobre viento procedural: **sin fuente**.
- Elden Ring: la entrevista hallada es solo de música (https://www.gamebanshee.com/xy39k). Sin dato de ambientación.
- Death Stranding: sonidos hechos golpeando objetos cotidianos (https://gamemusic.net/the-unknown-sounds-of-death-stranding/). Sin dato de ambientación.
- Conclusión: descartados como referentes técnicos por falta de fuente.

## 3. Código liberado o expuesto

### Source / Half-Life 2: `soundscapes*.txt`

- **[Verificado vía búsqueda; página VDC dio 403]** Archivos `scripts/soundscapes_*.txt`, cargados desde `scripts/soundscapes_manifest.txt`. Los de un solo mapa se llaman `soundscapes_<mapa>.txt`. La entidad `env_soundscape` enlaza el mapa con la definición. Solo hay un soundscape activo a la vez. Se pueden forzar perfiles DSP y de mezclador.
- Fuente: https://developer.valvesoftware.com/wiki/Soundscape (y https://developer.valvesoftware.com/wiki/Half_Life_2_Beta_Soundscapes)
- **[Verificado]** Los presets DSP son numerados: 0 normal, 1 genérico, 2 a 4 metal, 5 a 7 túnel, 8 a 10 cámara, 23 a 25 caverna (tabla de la beta de HL2).
- **[Conocimiento previo, no verificado]** Cada soundscape combina `playlooping` (cama) y `playrandom` (eventos con rango de tiempo, volumen, pitch y posición aleatorios), más `playsoundscape` para anidar otros. Esta es la estructura cama + eventos que más se parece a lo que DarkEcho necesita. Verificar claves exactas en la wiki antes de citarlas.
- **Estado:** Source SDK 2013 está en GitHub y se describe como "source-available" (https://en.wikipedia.org/wiki/Source_(game_engine)). La licencia exacta no se leyó. **[Pendiente]**. Los archivos `.txt` de contenido de Half-Life 2 son parte del juego comercial, no de una licencia libre.

### Half-Life 1 SDK

- **[Verificado]** Licencia de Valve: libre para crear un mod sobre el motor HL, distribución gratuita; uso comercial requiere contactar a Valve. Fuentes: https://www.moddb.com/features/half-life-sdk-licence y https://github.com/alliedmodders/hlsdk
- La entidad `ambient_generic` es de HL1: **[Conocimiento previo, no verificado]**. En la búsqueda no apareció.
- No hay filtración involucrada en lo que verifiqué.

### Quake (id Software)

- **[Verificado]** El motor se liberó bajo GPL (https://quakewiki.org/wiki/Legal_status; copia: https://archive.org/details/Quake_source_code). Los datos del juego (pak0) siguen con copyright.
- **[Verificado vía copia de `snd_dma.c`]** Archivo `snd_dma.c`. Declara `ambient_sfx[NUM_AMBIENTS]`, registra cvars `ambient_level` y `ambient_fade`, y reserva los primeros canales para ambiente. Fuentes: https://git.kolibrios.org/KolibriOS/kolibrios/raw/commit/2c5a7f1f2929605204277bf249569c5202244a30/contrib/other/sdlquake-1.0.9/snd_dma.c
- **[Verificado, foro]** Hay cuatro lazos ambientales (cielo/viento, agua, lodo, lava); en la práctica se usan agua y viento. Los niveles por zona salen del compilador de visibilidad (VIS), no del motor. Fuente: https://forums.insideqc.com/viewtopic.php?p=49911
- Técnica: el nivel de cada lazo se acerca gradualmente a un objetivo según el lugar del jugador (fade). **[Conocimiento previo]** el fade es lineal por tiempo; no lo verifiqué.
- Doom: no se investigó. **[Pendiente]**.

### Unreal / Unity samples

- No se investigaron. **[Pendiente]**.

## 4. Técnicas transversales

| Técnica                              | Dónde se vio                                      | Estado de la evidencia                                   |
| ------------------------------------ | ------------------------------------------------- | -------------------------------------------------------- |
| Cama + eventos aleatorios            | Source (`playlooping`/`playrandom`), RDR, Witcher | Verificado en parte; claves exactas de Source pendientes |
| Aleatorización de intervalo          | Minecraft (música y cuevas)                       | Verificado (música); cueva: hipótesis                    |
| Aleatorización de muestra/pitch      | Source (`pitch`, `volume` con rangos)             | Conocimiento previo, no verificado                       |
| Parámetro en tiempo real (RTPC)      | Witcher 3: lluvia, viento, hora, volumen local    | Verificado (resumen)                                     |
| Crossfade entre zonas                | Quake `ambient_fade`; Skyrim por región           | Verificado en código (nombre del cvar)                   |
| Ambiente local sobre global          | Witcher 3                                         | Verificado (resumen)                                     |
| Reverb/DSP por espacio               | Source presets DSP (túnel, cámara, caverna)       | Verificado (tabla beta HL2)                              |
| Cama 2D + puntos 3D                  | GoT:WiC                                           | Verificado (resumen)                                     |
| EQ para dejar medios libres          | Rogue Trader                                      | Verificado (resumen)                                     |
| Oclusión/filtro por distancia        | No hallé fuente en esta sesión                    | Conocimiento previo: paso bajo con la distancia          |
| Binaural                             | Hellblade (grabación)                             | Verificado, secundario                                   |
| Ambisonics                           | Sin fuente en esta sesión                         | Pendiente                                                |
| Síntesis procedural (viento, lluvia) | Sin fuente de juego hallada                       | Pendiente; ver nota                                      |

Nota sobre síntesis: el viento con ruido filtrado y modulado es técnica estándar de audio procedural (**[Conocimiento previo]**). No hallé una fuente de juego concreta que lo confirme para ningún título de la lista.

## 5. Qué aplica a DarkEcho

DarkEcho **no usa grabaciones**: sintetiza cada capa en `AudioWorklet` (`openspec/project.md`, "Contexto de dominio"). Por eso las técnicas de juegos que reproducen muestras se traducen a **eventos sintetizados**, no a `AudioBufferSourceNode`. Y el modelo de composición que ya existe coincide con el de los juegos:

| En los juegos                                    | En DarkEcho hoy                                                 |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Cama (`playlooping`, lazo ambiental)             | capa `continuous`                                               |
| Eventos aleatorios (`playrandom`, aves, truenos) | capas `granular` y `sparse`                                     |
| Parámetro en tiempo real (RTPC)                  | parámetros que evolucionan dentro de rangos declarados          |
| Preset DSP / reverb por espacio                  | `Environment`                                                   |
| Oclusión, filtro por distancia                   | `Occlusion` y `Modifier` de distancia                           |
| Zona (locación, clima, piso)                     | **no existe**: es el hueco que cubren las propuestas siguientes |

Contexto de uso: dormir o concentrarse, sin jugador que se mueva. Importa el realismo sin repetición perceptible y la baja fatiga auditiva.

**Prioridad 1 (acerca el realismo, usa lo que ya hay):**

1. **Eventos sparse con intervalos amplios y variación.** Cada evento (trueno, gota grande, ave, rama) con intervalo mínimo y máximo (p. ej. 8 a 40 s) y volumen, tono y paneo aleatorios dentro de un rango. Referentes: Source (`playrandom`, sin verificar claves), Minecraft (disparo aleatorio).
2. **Un parámetro por dimensión** (lluvia, viento, lejanía de 0 a 1) que gobierna varias capas a la vez, con rampas (`setTargetAtTime`) para evitar clics. Referente: RTPC del Witcher 3.
3. **Contrastar el realismo contra audio externo**, no solo contra los criterios internos: comparar cada ambiente con una grabación real a oído y por espectro. La coherencia interna no prueba realismo.

**Prioridad 2 (es lo que Drack describe de Eternal Return: zonas que cambian el sonido):** 4. **Zonas con crossfade**: un perfil (`clima` + `locación` + `piso`) que fija los parámetros de las capas y se mezcla con otro en 2 a 6 s. Referentes: Quake (`ambient_fade`), Skyrim (REGN por región). 5. **Ambiente local sobre clima global**: un parámetro reparte el volumen entre la capa de clima y la de locación (Witcher 3). 6. **Superficie**: el piso (madera, piedra, tierra) como filtro y envolvente de los eventos de impacto (gota, paso). Sin fuente de juego hallada: hipótesis.

**Prioridad 3 (explorar, sin evidencia sólida aquí):** 7. **Binaural/HRTF** con `PannerNode` para eventos puntuales, útil con auriculares. Ambisonics queda pendiente. 8. **Reverb por convolución** con impulsos sintetizados (ya existe `src/dsp/impulseResponse.ts`), sin empaquetar muestras.

**Decisión pendiente de Drack:** los modificadores de ambiente y locación están aparcados hasta mejorar los sonidos (indicación del 2026-10-12). Este documento sugiere que el orden natural es 1, 2 y 3, y luego 4 a 6 como la forma definitiva de esos modificadores.

**Cómo cerrar los huecos:** (a) contrastar Eternal Return a oído, grabando el paso entre dos zonas; (b) leer `snd_dma.c` de Quake (GPL); (c) leer la charla del Witcher 3; (d) revisar Doom, OpenMW y la licencia exacta del Source SDK 2013.

**No cubierto:** filtraciones de código no oficiales (p. ej. la de Half-Life 2 en 2003). No se buscaron ni se citan; si Drack las quiere como referencia, se revisan solo las partes de documentación pública que las describan.

## Fuentes consultadas (resumen)

- https://www.audiokinetic.com/learn/videos/VJUuI_dw8Cc
- https://www.audiokinetic.com/blog/game-of-thrones-interactive-environment-sound-design
- https://www.audiokinetic.com/wh40k-rogue-trader
- https://developer.valvesoftware.com/wiki/Soundscape
- https://developer.valvesoftware.com/wiki/Half_Life_2_Beta_Soundscapes
- https://designingsound.org/2010/08/20/red-dead-redemption-exclusive-interview-with-audio-director-jeffrey-whitcher/
- https://quakewiki.org/wiki/Legal_status
- https://forums.insideqc.com/viewtopic.php?p=49911
- https://pt.uesp.net/wiki/Skyrim_Mod:Mod_File_Format/REGN
- https://shorefire.com/releases/entry/twenty-thousand-hertz-reveals-how-the-music-sounds-of-minecraft-were-made
- https://www.asoundeffect.com/the-last-of-us-part-ii-sound/
- https://multiplayer.it/articoli/179870-hellblade-senuas-sacrifice-senua-e-le-sue-voci.html
- https://github.com/alliedmodders/hlsdk
- https://en.wikipedia.org/wiki/Eternal_Return_(video_game)
