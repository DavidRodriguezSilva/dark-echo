import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LayoutGrid, Play, Square, Terminal, Volume2 } from "lucide-react";
import type { CompositionEngine } from "../audio/composition/compositionEngine";
import { sceneSentenceShort } from "../domain/composition/sceneSentence";
import type { InterfaceMode } from "../platform/config";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";

/**
 * Barra de reproducción en curso (`command-console`, "Panel de estado del
 * sistema"): una sola fila, en los dos modos — transporte, lectura de la
 * escena, volumen y el conmutador de modo, que es la única superficie común
 * a ambos (`update-interface-design`, design.md D7). Se suscribe al motor y
 * nunca guarda una copia de su estado: no puede mostrar algo distinto de lo
 * que realmente suena.
 */

const TOUCH_TARGET = "size-11";

function playbackWord(mixKind: "empty" | "stopped" | "playing" | "suspended"): string | null {
  if (mixKind === "playing") return "Sonando";
  if (mixKind === "stopped") return "Detenida";
  if (mixKind === "suspended") return "Suspendida";
  return null;
}

export function StatusBar({
  engine,
  mode,
  onToggleMode,
  loadedSceneName,
}: {
  engine: CompositionEngine;
  mode: InterfaceMode;
  onToggleMode: () => void;
  loadedSceneName: string | null;
}) {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!volumeOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setVolumeOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setVolumeOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [volumeOpen]);

  const { mix } = snapshot;
  const isPlaying = mix.kind === "playing";
  const isSuspended = mix.kind === "suspended";
  const canPlay = isPlaying || isSuspended || mix.kind !== "empty";

  const sentence = sceneSentenceShort({
    sources: snapshot.sources.map((source) => ({ id: source.id, modifier: source.modifier })),
    environmentId: snapshot.environment?.id ?? null,
    occlusionId: snapshot.occlusion?.id ?? null,
  });
  const word = playbackWord(mix.kind);
  const label = loadedSceneName ?? sentence;
  const mainText = word ? `${word} · ${label}` : label;

  function handlePlayToggle() {
    if (isPlaying) engine.stop();
    else if (isSuspended) void engine.resumeSuspended();
    else void engine.play();
  }

  const goingToVisual = mode === "console";
  const modeLabel = goingToVisual ? "Cambiar a la interfaz gráfica" : "Cambiar a la consola";

  return (
    <div className="flex items-center gap-2 border-t border-border bg-panel px-2 py-1.5 sm:gap-3 sm:px-3">
      <Button
        type="button"
        size="icon"
        variant={isPlaying ? "secondary" : "default"}
        className={TOUCH_TARGET}
        disabled={!canPlay}
        onClick={handlePlayToggle}
        aria-label={isPlaying ? "Detener" : "Reproducir"}
        title={isPlaying ? "Detener" : "Reproducir"}
      >
        {isPlaying ? <Square className="size-4" /> : <Play className="size-4" />}
      </Button>

      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{mainText}</span>

      <div ref={volumeRef} className="relative flex shrink-0 items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`${TOUCH_TARGET} sm:hidden`}
          aria-label="Volumen maestro"
          aria-expanded={volumeOpen}
          onClick={() => setVolumeOpen((open) => !open)}
        >
          <Volume2 className="size-4" />
        </Button>

        {volumeOpen && (
          <div className="absolute right-0 bottom-full mb-2 flex w-40 items-center gap-2 rounded-md border border-border bg-popover p-3 shadow-md sm:hidden">
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
        )}

        <div className="hidden w-28 items-center gap-2 sm:flex">
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

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={`${TOUCH_TARGET} shrink-0`}
        aria-label={modeLabel}
        aria-pressed={mode === "console"}
        title={modeLabel}
        onClick={onToggleMode}
      >
        {goingToVisual ? <LayoutGrid className="size-4" /> : <Terminal className="size-4" />}
      </Button>
    </div>
  );
}
