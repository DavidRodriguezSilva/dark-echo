import { useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, X } from "lucide-react";
import type { CompositionEngine } from "../audio/composition/compositionEngine";
import type { SceneController, SleepTimerController } from "../commands/commands";
import type { SystemNoticeStore } from "../platform/systemNotices";
import { listAmbients } from "../domain/catalog";
import {
  findEnvironment,
  findModifier,
  findOcclusion,
  listEnvironments,
  listModifiers,
  listOcclusions,
} from "../domain/composition/catalog";
import { scoreOcclusionAgainstEnvironment } from "../domain/composition/compatibility";
import { sceneSentence } from "../domain/composition/sceneSentence";
import { sameScene } from "../domain/scene";
import { listThemes } from "../domain/themes";
import { useAppearance } from "./AppearanceContext";
import { Wordmark } from "./Wordmark";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";
import { cn } from "./lib/utils";

/**
 * Modo visual (`command-console`, "Organización del modo visual según la
 * jerarquía de composición"): qué suena → distancia → recinto → barrera →
 * el transporte y el volumen, que viven en la barra de reproducción en
 * curso (`StatusBar`), no aquí (`update-interface-design`, design.md
 * D6/D7). Recinto antes que barrera, y no el orden de la señal, porque la
 * afinidad de la barrera se calcula *contra* el recinto elegido
 * (`scoreOcclusionAgainstEnvironment`): sin recinto todavía, cualquier
 * barrera se ve poco afín sin motivo real.
 *
 * Ningún control guarda su propio valor: todos leen del snapshot del motor
 * y escriben llamando al motor, así que lo que se ve no puede diferir de lo
 * que suena. Las únicas excepciones son datos de archivo, no de audio —el
 * texto del nombre de una escena a punto de guardarse, o si la confirmación
 * de sobreescritura está pendiente.
 */

const SCHEMES = [
  { id: "auto", label: "Automático (sigue al sistema)", Icon: Monitor },
  { id: "light", label: "Claro", Icon: Sun },
  { id: "dark", label: "Oscuro", Icon: Moon },
] as const;

const TOUCH_TARGET = "min-h-11";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs font-semibold tracking-wide text-terminal-response uppercase">
      {children}
    </h2>
  );
}

/** Fila de selección exclusiva para el recinto o la barrera (design.md D6). */
function ExclusiveRow({
  label,
  noneLabel,
  activeId,
  options,
  onSelect,
}: {
  label: string;
  noneLabel: string;
  activeId: string | null;
  options: { id: string; label: string; lowAffinity: boolean }[];
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-terminal-response">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        <Button
          type="button"
          size="sm"
          className={TOUCH_TARGET}
          variant={activeId === null ? "default" : "ghost"}
          aria-pressed={activeId === null}
          onClick={() => onSelect(null)}
        >
          {noneLabel}
        </Button>
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            className={cn(TOUCH_TARGET, option.lowAffinity && "border border-dashed border-input")}
            variant={activeId === option.id ? "default" : "ghost"}
            aria-pressed={activeId === option.id}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
            {option.lowAffinity && " · poco afín"}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function VisualControls({
  engine,
  scenes,
  sleepTimer,
  notices,
  loadedSceneName,
  onLoadedSceneNameChange,
}: {
  engine: CompositionEngine;
  scenes: SceneController;
  sleepTimer: SleepTimerController;
  notices: SystemNoticeStore;
  loadedSceneName: string | null;
  onLoadedSceneNameChange: (name: string | null) => void;
}) {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { preference, setTheme, setScheme } = useAppearance();
  const pendingNotices = useSyncExternalStore(notices.subscribe, notices.getSnapshot);

  const [savedScenes, setSavedScenes] = useState(() => scenes.list());
  const [sceneName, setSceneName] = useState("");
  const [overwriting, setOverwriting] = useState(false);
  const [sceneMessage, setSceneMessage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [timerText, setTimerText] = useState("");
  const [timerClock, setTimerClock] = useState("");
  const [timerMessage, setTimerMessage] = useState<string | null>(null);

  const { mix, sources, environment, occlusion } = snapshot;
  const activeIds = new Set(sources.map((source) => source.id));
  const layerVolume = (id: string) =>
    mix.kind === "empty" ? 0 : (mix.layers.find((layer) => layer.id === id)?.volume ?? 0);

  const sentence = sceneSentence({
    sources: sources.map((source) => ({ id: source.id, modifier: source.modifier })),
    environmentId: environment?.id ?? null,
    occlusionId: occlusion?.id ?? null,
  });

  const compositionState: "temporal" | "saved" | "saved-modified" = !loadedSceneName
    ? "temporal"
    : (() => {
        const saved = scenes.peek(loadedSceneName);
        const current = engine.getComposition();
        return saved && current && sameScene(current, saved) ? "saved" : "saved-modified";
      })();

  const environmentDeclaration = environment ? (findEnvironment(environment.id) ?? null) : null;
  const distancia = findModifier("distancia");
  const distanceMin = distancia?.kind === "distance" ? distancia.minMeters : 1;
  const distanceMax = distancia?.kind === "distance" ? distancia.maxMeters : 200;
  const distanceDefault = distancia?.kind === "distance" ? distancia.defaultMeters : 20;

  async function handleToggleSource(id: string, isActive: boolean) {
    setAddError(null);
    if (isActive) {
      engine.removeTarget(id);
      return;
    }
    const result = await engine.add(id);
    if (!result.ok) setAddError(result.message);
  }

  function saveScene() {
    const name = sceneName.trim();
    if (!name) return;

    const result = scenes.save(name, overwriting);
    setSceneMessage(result.message);
    if (result.ok) {
      setOverwriting(false);
      setSceneName("");
      setSavedScenes(scenes.list());
      onLoadedSceneNameChange(name);
    } else {
      // El controlador rechaza la primera vez cuando el nombre ya existe: el
      // siguiente toque confirma la sobreescritura.
      setOverwriting(true);
    }
  }

  async function loadScene(name: string) {
    const result = await scenes.load(name);
    setSceneMessage(result.message);
    if (result.ok) onLoadedSceneNameChange(name);
  }

  function deleteScene(name: string) {
    const result = scenes.remove(name);
    setSceneMessage(result.message);
    setSavedScenes(scenes.list());
    if (loadedSceneName === name) onLoadedSceneNameChange(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Wordmark size="sm" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" role="group" aria-label="Esquema">
            {SCHEMES.map(({ id, label, Icon }) => (
              <Button
                key={id}
                type="button"
                size="icon"
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

          <div className="flex items-center gap-1.5" role="group" aria-label="Acento">
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
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5">
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

        <div className="flex flex-col gap-1">
          <p className="font-mono text-lg font-semibold text-foreground sm:text-xl">{sentence}</p>
          <p className="text-xs text-terminal-response">
            {compositionState === "temporal" && "Composición sin guardar."}
            {compositionState === "saved" && `Escena guardada: ${loadedSceneName}.`}
            {compositionState === "saved-modified" && `${loadedSceneName} · cambios sin guardar.`}
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <SectionTitle>Qué suena</SectionTitle>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
            {listAmbients().map((ambient) => {
              const isActive = activeIds.has(ambient.id);
              const stateWord =
                isActive && mix.kind === "stopped"
                  ? "detenida"
                  : isActive && mix.kind === "suspended"
                    ? "suspendida"
                    : null;

              return (
                <button
                  key={ambient.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => void handleToggleSource(ambient.id, isActive)}
                  className={cn(
                    TOUCH_TARGET,
                    "flex flex-col items-center justify-center gap-1 rounded-md border px-2 py-3 text-center text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-terminal-response hover:border-input hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span aria-hidden="true" className="text-terminal-cursor">
                      ▋<span className="opacity-30">▋</span>
                    </span>
                  )}
                  <span>{ambient.label}</span>
                  {stateWord && (
                    <span className="text-[0.65rem] text-terminal-response">{stateWord}</span>
                  )}
                </button>
              );
            })}
          </div>

          {addError && <p className="text-xs text-terminal-error">{addError}</p>}

          {sources.map((source) => {
            const ambient = listAmbients().find((a) => a.id === source.id);
            const layers =
              mix.kind === "empty"
                ? []
                : mix.layers.filter((l) => l.id.startsWith(`${source.id}.`));

            return (
              <article key={source.id} className="rounded-md border border-border bg-panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-sm font-semibold">{ambient?.label ?? source.id}</h3>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={TOUCH_TARGET}
                    aria-label={`Retirar ${ambient?.label ?? source.id}`}
                    onClick={() => engine.removeTarget(source.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                {/*
                  Reservado: si `AmbientDeclaration` llega a declarar
                  variaciones (design.md D11), su control iría aquí, antes de
                  los volúmenes de capa. Hoy ningún `Source` las declara.
                */}

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

                {listModifiers().length > 0 && (
                  <div className="mt-3 border-t border-border pt-2">
                    <div
                      className={cn("flex items-center gap-2", !source.modifier && "opacity-50")}
                    >
                      <span className="w-20 shrink-0 text-xs text-terminal-response">
                        distancia
                      </span>
                      <Slider
                        value={[source.modifier?.distanceMeters ?? distanceDefault]}
                        min={distanceMin}
                        max={distanceMax}
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
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle>Cómo suena</SectionTitle>

          <ExclusiveRow
            label="Recinto"
            noneLabel="Ninguno"
            activeId={environment?.id ?? null}
            options={listEnvironments().map((item) => ({ ...item, lowAffinity: false }))}
            onSelect={(id) =>
              id === null ? engine.deactivateEnvironment() : void engine.activateEnvironment(id)
            }
          />

          <ExclusiveRow
            label="Barrera"
            noneLabel="Ninguna"
            activeId={occlusion?.id ?? null}
            options={listOcclusions().map((item) => {
              const declaration = findOcclusion(item.id);
              const affinity = declaration
                ? scoreOcclusionAgainstEnvironment(declaration, environmentDeclaration)
                : null;
              return {
                id: item.id,
                label: item.label,
                lowAffinity: affinity?.belowThreshold ?? false,
              };
            })}
            onSelect={(id) =>
              id === null ? engine.deactivateOcclusion() : void engine.activateOcclusion(id)
            }
          />
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle>Apagado</SectionTitle>

          <div className="flex flex-wrap gap-2">
            {[15, 30, 60, 120].map((minutes) => (
              <Button
                key={minutes}
                type="button"
                size="sm"
                variant="secondary"
                className={cn(TOUCH_TARGET, "text-xs")}
                onClick={() => setTimerMessage(sleepTimer.setIn(`${minutes}m`).message)}
              >
                {minutes} min
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(TOUCH_TARGET, "text-xs")}
              onClick={() => setTimerMessage(sleepTimer.cancel().message)}
            >
              Cancelar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={timerText}
              onChange={(event) => setTimerText(event.target.value)}
              placeholder="Dentro de (1h30m)"
              aria-label="Apagar dentro de esta duración"
              className={cn(
                TOUCH_TARGET,
                "min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            />
            <Button
              type="button"
              size="sm"
              className={cn(TOUCH_TARGET, "text-xs")}
              disabled={timerText.trim().length === 0}
              onClick={() => setTimerMessage(sleepTimer.setIn(timerText).message)}
            >
              Fijar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={timerClock}
              onChange={(event) => setTimerClock(event.target.value)}
              aria-label="Apagar a esta hora"
              className={cn(
                TOUCH_TARGET,
                "min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            />
            <Button
              type="button"
              size="sm"
              className={cn(TOUCH_TARGET, "text-xs")}
              disabled={timerClock.length === 0}
              onClick={() => setTimerMessage(sleepTimer.setAt(timerClock).message)}
            >
              Fijar
            </Button>
          </div>

          {timerMessage && <p className="text-xs text-terminal-response">{timerMessage}</p>}
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle>Escenas</SectionTitle>

          {savedScenes.length === 0 ? (
            <p className="text-xs text-terminal-response">Todavía no has guardado ninguna.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {savedScenes.map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex-1 truncate text-xs",
                      name === loadedSceneName ? "text-foreground" : "text-terminal-response"
                    )}
                  >
                    {name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(TOUCH_TARGET, "text-xs")}
                    onClick={() => void loadScene(name)}
                  >
                    Cargar
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={TOUCH_TARGET}
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
              className={cn(
                TOUCH_TARGET,
                "min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            />
            <Button
              type="button"
              size="sm"
              className={cn(TOUCH_TARGET, "text-xs")}
              variant={overwriting ? "secondary" : "default"}
              disabled={sceneName.trim().length === 0}
              onClick={() => saveScene()}
            >
              {overwriting ? "Confirmar" : "Guardar"}
            </Button>
          </div>

          {sceneMessage && <p className="text-xs text-terminal-response">{sceneMessage}</p>}
        </section>
      </div>
    </div>
  );
}
