import { useSyncExternalStore } from "react";
import { Monitor, Moon, Play, Square, Sun, Volume2 } from "lucide-react";
import type { CompositionEngine } from "../audio/composition/compositionEngine";
import type { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";
import { cn } from "./lib/utils";

const SCHEMES = [
  { id: "auto", label: "Automático (sigue al sistema)", Icon: Monitor },
  { id: "light", label: "Claro", Icon: Sun },
  { id: "dark", label: "Oscuro", Icon: Moon },
] as const;

/**
 * Panel de controles táctiles (command-console, "Operación sin teclado
 * físico"; theming, "Selección de tema en caliente"): oculto por defecto
 * -- la consola es, por defecto, un shell a pantalla completa sin botones
 * -- y revelado por el toggle de `StatusBar`, que es en sí mismo táctil.
 * Una sola fila, solo iconos (sin texto): play/detener, volumen, tema y
 * esquema. Cada control produce exactamente el mismo efecto que su comando
 * equivalente y se suscribe a los mismos stores, así que nunca puede
 * desincronizarse de lo que realmente suena o del tema vigente.
 *
 * El swatch de cada tema es un `bg-primary` con `data-theme` propio: el
 * contrato de tokens (design.md D13) hace que ese atributo, puesto en
 * cualquier elemento, resuelva el color de *ese* tema ahi mismo -- no hace
 * falta duplicar colores en JS para poder previsualizarlos.
 */
export function TouchControls({
  engine,
  appearance,
}: {
  engine: CompositionEngine;
  appearance: AppearanceStore;
}) {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const preference = useSyncExternalStore(appearance.subscribe, appearance.getSnapshot);
  const { mix } = snapshot;
  const isPlaying = mix.kind === "playing";
  const isSuspended = mix.kind === "suspended";
  const themes = listThemes();

  function handlePlayToggle() {
    if (isPlaying) {
      engine.stop();
    } else if (isSuspended) {
      void engine.resumeSuspended();
    } else {
      void engine.play();
    }
  }

  return (
    <div className="flex flex-nowrap items-center gap-3 overflow-x-auto border-t border-border bg-panel px-3 py-2">
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

      <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Tema">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            data-theme={theme.id}
            aria-label={theme.label}
            aria-pressed={preference.themeId === theme.id}
            title={theme.label}
            onClick={() => appearance.set({ themeId: theme.id, scheme: preference.scheme })}
            className={cn(
              "size-6 shrink-0 rounded-full bg-primary outline-none",
              preference.themeId === theme.id
                ? "ring-2 ring-ring ring-offset-2 ring-offset-panel"
                : "opacity-50 hover:opacity-100"
            )}
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Esquema">
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
            onClick={() => appearance.set({ themeId: preference.themeId, scheme: id })}
          >
            <Icon className="size-3.5" />
          </Button>
        ))}
      </div>
    </div>
  );
}
