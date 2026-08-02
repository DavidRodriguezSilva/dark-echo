import { useSyncExternalStore } from "react";
import type { AmbientMixer } from "../audio/ambientMixer";
import type { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";

/**
 * Panel de controles táctiles (command-console, "Operación sin teclado
 * físico"; theming, "Selección de tema en caliente"): oculto por defecto
 * -- la consola es, por defecto, un shell a pantalla completa sin botones
 * -- y revelado por el toggle de `StatusBar`, que es en sí mismo táctil.
 * Cada control produce exactamente el mismo efecto que su comando
 * equivalente y se suscribe a los mismos stores, así que nunca puede
 * desincronizarse de lo que realmente suena o del tema vigente.
 */
export function TouchControls({
  mixer,
  appearance,
}: {
  mixer: AmbientMixer;
  appearance: AppearanceStore;
}) {
  const snapshot = useSyncExternalStore(mixer.subscribe, mixer.getSnapshot);
  const preference = useSyncExternalStore(appearance.subscribe, appearance.getSnapshot);
  const { mix } = snapshot;
  const isPlaying = mix.kind === "playing";
  const isSuspended = mix.kind === "suspended";
  const themes = listThemes();

  function handlePlayToggle() {
    if (isPlaying) {
      mixer.stop();
    } else if (isSuspended) {
      void mixer.resumeSuspended();
    } else {
      void mixer.play();
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-panel px-3 py-3 text-sm">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={isPlaying ? "secondary" : "default"}
          disabled={!isPlaying && !isSuspended && mix.kind === "empty"}
          onClick={handlePlayToggle}
        >
          {isPlaying ? "Detener" : "Reproducir"}
        </Button>

        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs text-terminal-response">Volumen</span>
          <Slider
            value={[snapshot.masterVolume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([value]) => mixer.setMasterVolume(value)}
            aria-label="Volumen maestro"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {themes.map((theme) => (
          <Button
            key={theme.id}
            type="button"
            size="sm"
            variant={preference.themeId === theme.id ? "default" : "outline"}
            onClick={() => appearance.set({ themeId: theme.id, scheme: preference.scheme })}
          >
            {theme.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Esquema">
          {(["auto", "light", "dark"] as const).map((scheme) => (
            <Button
              key={scheme}
              type="button"
              size="sm"
              variant={preference.scheme === scheme ? "default" : "ghost"}
              onClick={() => appearance.set({ themeId: preference.themeId, scheme })}
            >
              {scheme === "auto" ? "Auto" : scheme === "light" ? "Claro" : "Oscuro"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
