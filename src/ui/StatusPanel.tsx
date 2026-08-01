import { useSyncExternalStore } from "react";
import type { AmbientMixer } from "../audio/ambientMixer";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";

/**
 * Panel de estado (command-console, "Panel de estado del sistema" y
 * "Operación sin teclado"): se suscribe a `AmbientMixer` con
 * `useSyncExternalStore` (design.md D7), así que nunca puede mostrar algo
 * distinto de lo que realmente suena.
 */
export function StatusPanel({ mixer }: { mixer: AmbientMixer }) {
  const snapshot = useSyncExternalStore(mixer.subscribe, mixer.getSnapshot);
  const { mix } = snapshot;
  const isPlaying = mix.kind === "playing";
  const isStopped = mix.kind === "stopped";

  function handleToggle() {
    if (isPlaying) {
      mixer.stop();
    } else {
      void mixer.play();
    }
  }

  return (
    <aside className="mt-4 rounded-lg border border-border bg-panel p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Estado</h2>

      {mix.kind === "empty" && (
        <p className="text-sm text-terminal-response">No hay reproducción en curso.</p>
      )}

      {(isPlaying || isStopped) && (
        <ul className="space-y-1 text-sm text-terminal-response">
          {mix.layers.map((layer) => (
            <li key={layer.id} className="flex items-center justify-between gap-3">
              <span className="text-terminal-layer-active">{layer.id}</span>
              <span>{Math.round(layer.volume * 100)}%</span>
            </li>
          ))}
        </ul>
      )}

      {isStopped && (
        <p className="mt-2 text-xs text-terminal-response">
          Detenido. Mezcla conservada; "Reproducir" la reanuda.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={isPlaying ? "secondary" : "default"}
          disabled={!isPlaying && mix.kind === "empty"}
          onClick={handleToggle}
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
    </aside>
  );
}
