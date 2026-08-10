import { useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Play, Square, Sun, Volume2, X } from "lucide-react";
import type { CompositionEngine } from "../audio/composition/compositionEngine";
import type { SceneController } from "../commands/commands";
import type { SystemNoticeStore } from "../platform/systemNotices";
import { listAmbients } from "../domain/catalog";
import { listEnvironments, listModifiers, listOcclusions } from "../domain/composition/catalog";
import { listThemes } from "../domain/themes";
import { useAppearance } from "./AppearanceContext";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";
import { cn } from "./lib/utils";

/**
 * Modo visual (`command-console`, "Modo de interfaz conmutable"): alcanza la
 * composición completa sin escribir un comando.
 *
 * **La disposición es la jerarquía**, no una lista plana de ajustes que dé el
 * mismo resultado (design.md D2/D3). La cadena real del motor es
 *
 *   Source (capas) → Modifier del Source → | Occlusion → Environment | → maestro
 *
 * donde lo de la izquierda es **por sonido** y lo de la derecha, **de la
 * escena**. Por eso el modificador de distancia vive dentro de la tarjeta de
 * su sonido, y la barrera y el recinto viven en la cabecera del recuadro que
 * *contiene* todas las tarjetas: la contención visual dice lo mismo que diría
 * un párrafo explicativo, sin párrafo.
 *
 * Ningún control guarda su propio valor (design.md D7): todos leen del
 * snapshot del motor y escriben llamando al motor, así que lo que se ve no
 * puede diferir de lo que suena.
 */

const SCHEMES = [
  { id: "auto", label: "Automático (sigue al sistema)", Icon: Monitor },
  { id: "light", label: "Claro", Icon: Sun },
  { id: "dark", label: "Oscuro", Icon: Moon },
] as const;

const DISTANCE_DEFAULT_M = 20;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-wide text-terminal-response uppercase">
      {children}
    </h2>
  );
}

export function VisualControls({
  engine,
  scenes,
  notices,
}: {
  engine: CompositionEngine;
  scenes: SceneController;
  notices: SystemNoticeStore;
}) {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { preference, setTheme, setScheme } = useAppearance();
  // Los avisos del sistema —persistencia degradada, actualización disponible—
  // solo se veían en la salida de la consola. Con dos modos excluyentes, quien
  // esté en el visual no los vería nunca: es la consecuencia aceptada de D1, y
  // se trata como requisito, no como detalle.
  const pendingNotices = useSyncExternalStore(notices.subscribe, notices.getSnapshot);

  // Las escenas guardadas no son estado de audio, así que sí se copian aquí:
  // `SceneStore` no es observable, y la regla de "ninguna copia local" (D7)
  // protege lo que suena, no el listado de archivos.
  const [savedScenes, setSavedScenes] = useState(() => scenes.list());
  const [sceneName, setSceneName] = useState("");
  const [overwriting, setOverwriting] = useState(false);
  const [sceneMessage, setSceneMessage] = useState<string | null>(null);

  function saveScene() {
    const name = sceneName.trim();
    if (!name) return;

    const result = scenes.save(name, overwriting);
    setSceneMessage(result.message);
    if (result.ok) {
      setOverwriting(false);
      setSceneName("");
      setSavedScenes(scenes.list());
    } else {
      // El controlador rechaza la primera vez cuando el nombre ya existe: el
      // siguiente toque confirma la sobreescritura.
      setOverwriting(true);
    }
  }

  async function loadScene(name: string) {
    const result = await scenes.load(name);
    setSceneMessage(result.message);
  }

  function deleteScene(name: string) {
    const result = scenes.remove(name);
    setSceneMessage(result.message);
    setSavedScenes(scenes.list());
  }

  const { mix, sources, environment, occlusion } = snapshot;
  const isPlaying = mix.kind === "playing";
  const isSuspended = mix.kind === "suspended";
  const activeIds = new Set(sources.map((source) => source.id));
  const layerVolume = (id: string) =>
    mix.kind === "empty" ? 0 : (mix.layers.find((layer) => layer.id === id)?.volume ?? 0);

  function handlePlayToggle() {
    if (isPlaying) engine.stop();
    else if (isSuspended) void engine.resumeSuspended();
    else void engine.play();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 px-4 py-4">
        {pendingNotices.length > 0 && (
          <section
            role="status"
            className="flex flex-col gap-1 rounded-md border border-border p-3"
          >
            {pendingNotices.map((notice, index) => (
              <p key={index} className="text-xs text-terminal-error">
                {notice}
              </p>
            ))}
          </section>
        )}

        {/*
          La escena: el recuadro que contiene los sonidos. Sus dos controles
          —barrera y recinto— están en la cabecera precisamente porque afectan
          a todo lo que hay dentro.
        */}
        <section className="rounded-lg border border-border">
          <header className="flex flex-col gap-3 border-b border-border px-3 py-3">
            <SectionTitle>Escena · afecta a todos los sonidos</SectionTitle>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-terminal-response">Recinto</span>
              <div className="flex flex-wrap gap-1.5">
                {listEnvironments().map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={environment?.id === item.id ? "default" : "ghost"}
                    aria-pressed={environment?.id === item.id}
                    onClick={() =>
                      environment?.id === item.id
                        ? engine.deactivateEnvironment()
                        : void engine.activateEnvironment(item.id)
                    }
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-terminal-response">Barrera</span>
              <div className="flex flex-wrap gap-1.5">
                {listOcclusions().map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={occlusion?.id === item.id ? "default" : "ghost"}
                    aria-pressed={occlusion?.id === item.id}
                    onClick={() =>
                      occlusion?.id === item.id
                        ? engine.deactivateOcclusion()
                        : void engine.activateOcclusion(item.id)
                    }
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </header>

          {/* Los sonidos, contenidos por la escena. */}
          <div className="flex flex-col gap-3 p-3">
            <SectionTitle>Sonidos</SectionTitle>

            {sources.length === 0 && (
              <p className="text-xs text-terminal-response">
                Ningún sonido activo. Añade uno abajo para empezar.
              </p>
            )}

            {sources.map((source) => {
              const ambient = listAmbients().find((a) => a.id === source.id);
              const layers =
                mix.kind === "empty"
                  ? []
                  : mix.layers.filter((l) => l.id.startsWith(`${source.id}.`));

              return (
                <article key={source.id} className="rounded-md border border-border bg-panel p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{ambient?.label ?? source.id}</h3>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      aria-label={`Retirar ${ambient?.label ?? source.id}`}
                      onClick={() => engine.removeTarget(source.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  {/* Volumen por capa: el nivel más interno de la jerarquía. */}
                  <div className="mt-2 flex flex-col gap-1.5">
                    {layers.map((layer) => (
                      <div key={layer.id} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 truncate text-xs text-terminal-response">
                          {layer.id.slice(source.id.length + 1)}
                        </span>
                        <Slider
                          value={[layerVolume(layer.id)]}
                          min={0}
                          max={1}
                          step={0.01}
                          onValueChange={([value]) => engine.setLayerVolume(layer.id, value)}
                          aria-label={`Volumen de ${layer.id}`}
                        />
                      </div>
                    ))}
                  </div>

                  {/*
                    El modificador va DENTRO de la tarjeta del sonido, no en la
                    escena: hay una etapa por sonido, y alejar este no mueve a
                    los demás.
                  */}
                  {listModifiers().length > 0 && (
                    <div className="mt-3 border-t border-border pt-2">
                      {/*
                        Sin modificador activo el deslizador se atenúa: a su
                        valor por defecto se vería igual de "puesto" que uno
                        aplicado, y eso contradiría que lo mostrado sea lo que
                        suena. Atenuado se lee como lo que es — disponible,
                        todavía sin aplicar.
                      */}
                      <div
                        className={cn("flex items-center gap-2", !source.modifier && "opacity-50")}
                      >
                        <span className="w-20 shrink-0 text-xs text-terminal-response">
                          distancia
                        </span>
                        <Slider
                          value={[source.modifier?.distanceMeters ?? DISTANCE_DEFAULT_M]}
                          min={1}
                          max={200}
                          step={1}
                          onValueChange={([value]) =>
                            void engine.activateModifier(source.id, "distancia", value)
                          }
                          aria-label={`Distancia de ${ambient?.label ?? source.id}`}
                        />
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-terminal-response">
                          {source.modifier ? `${source.modifier.distanceMeters} m` : "—"}
                        </span>
                      </div>
                      {source.modifier && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-1 h-6 text-xs"
                          onClick={() => engine.deactivateModifier(source.id)}
                        >
                          Quitar distancia
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            <div className="flex flex-col gap-2">
              <span className="text-xs text-terminal-response">Añadir un sonido</span>
              <div className="flex flex-wrap gap-1.5">
                {listAmbients()
                  .filter((ambient) => !activeIds.has(ambient.id))
                  .map((ambient) => (
                    <Button
                      key={ambient.id}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void engine.add(ambient.id)}
                    >
                      {ambient.label}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/*
          Escenas guardadas: persistencia del conjunto, **no** una etapa de la
          cadena de señal. Por eso van fuera del recuadro de escena y sin
          anidar — meterlas dentro convertiría una operación de archivo en un
          componente de la composición (design.md D8).
        */}
        <section className="flex flex-col gap-2">
          <SectionTitle>Escenas guardadas</SectionTitle>

          {savedScenes.length === 0 ? (
            <p className="text-xs text-terminal-response">Todavía no has guardado ninguna.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {savedScenes.map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-xs">{name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => void loadScene(name)}
                  >
                    Cargar
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    aria-label={`Eliminar la escena ${name}`}
                    onClick={() => deleteScene(name)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <input
              value={sceneName}
              onChange={(event) => {
                setSceneName(event.target.value);
                setOverwriting(false);
              }}
              placeholder="Nombre de la escena"
              aria-label="Nombre de la escena a guardar"
              className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              variant={overwriting ? "secondary" : "default"}
              disabled={sceneName.trim().length === 0}
              onClick={() => saveScene()}
            >
              {/*
                La sobreescritura exige confirmación explícita
                (`session-persistence`): aquí se resuelve con un segundo toque
                sobre el mismo botón, que cambia de rótulo, en vez de pedir que
                se escriba una palabra de confirmación como en la consola.
              */}
              {overwriting ? "Confirmar" : "Guardar"}
            </Button>
          </div>

          {sceneMessage && <p className="text-xs text-terminal-response">{sceneMessage}</p>}
        </section>

        {/* Apariencia: no es composición, así que va fuera del recuadro. */}
        <section className="flex flex-col gap-2">
          <SectionTitle>Apariencia</SectionTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5" role="group" aria-label="Tema">
              {listThemes().map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  data-theme={theme.id}
                  aria-label={theme.label}
                  aria-pressed={preference.themeId === theme.id}
                  title={theme.label}
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    "size-6 shrink-0 rounded-full bg-primary outline-none",
                    preference.themeId === theme.id
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : "opacity-50 hover:opacity-100"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-1" role="group" aria-label="Esquema">
              {SCHEMES.map(({ id, label, Icon }) => (
                <Button
                  key={id}
                  type="button"
                  size="icon"
                  className="size-7"
                  variant={preference.scheme === id ? "default" : "ghost"}
                  aria-label={label}
                  aria-pressed={preference.scheme === id}
                  title={label}
                  onClick={() => setScheme(id)}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Transporte: al final, anclado, como pidió el propietario. */}
      <div className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-border bg-panel px-3 py-2">
        <Button
          type="button"
          size="icon"
          variant={isPlaying ? "secondary" : "default"}
          disabled={!isPlaying && !isSuspended && mix.kind === "empty"}
          onClick={handlePlayToggle}
          aria-label={isPlaying ? "Detener" : "Reproducir"}
          title={isPlaying ? "Detener" : "Reproducir"}
        >
          {isPlaying ? <Square className="size-4" /> : <Play className="size-4" />}
        </Button>

        <div className="flex min-w-[120px] flex-1 items-center gap-2">
          <Volume2 className="size-4 shrink-0 text-terminal-response" aria-hidden="true" />
          <Slider
            value={[snapshot.masterVolume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([value]) => engine.setMasterVolume(value)}
            aria-label="Volumen maestro"
          />
        </div>
      </div>
    </div>
  );
}
