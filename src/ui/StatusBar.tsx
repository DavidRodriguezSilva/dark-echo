import { useSyncExternalStore } from "react";
import type { AmbientMixer, MixSnapshot } from "../audio/ambientMixer";
import type { AppearanceStore } from "../platform/appearance";
import { findTheme } from "../domain/themes";
import { Button } from "./primitives/button";
import { SlidersHorizontal } from "lucide-react";

/**
 * Barra de estado persistente y minima, estilo statusline (command-console,
 * "Panel de estado del sistema"): una sola linea, sin aspecto de tarjeta,
 * anclada arriba de la linea de entrada. Se suscribe a `AmbientMixer` y a
 * `AppearanceStore` con `useSyncExternalStore` (design.md D7), asi que
 * nunca puede mostrar algo distinto de lo que realmente suena o del tema
 * vigente.
 *
 * El boton de la derecha revela el panel de controles tactiles
 * (`TouchControls`) -- es el unico punto de entrada sin teclado, y por eso
 * es en si mismo tactil (command-console, "Operacion sin teclado fisico").
 */
function mixLabel(mix: MixSnapshot): string {
  if (mix.kind === "empty") return "Vacío";
  const layers = mix.layers.map((l) => l.id).join(", ");
  const prefix =
    mix.kind === "playing" ? "Sonando" : mix.kind === "suspended" ? "Suspendido" : "Detenido";
  return `${prefix}: ${layers}`;
}

function schemeLabel(scheme: "dark" | "light" | "auto"): string {
  if (scheme === "auto") return "auto";
  return scheme === "dark" ? "oscuro" : "claro";
}

export function StatusBar({
  mixer,
  appearance,
  controlsVisible,
  onToggleControls,
}: {
  mixer: AmbientMixer;
  appearance: AppearanceStore;
  controlsVisible: boolean;
  onToggleControls: () => void;
}) {
  const snapshot = useSyncExternalStore(mixer.subscribe, mixer.getSnapshot);
  const preference = useSyncExternalStore(appearance.subscribe, appearance.getSnapshot);
  const theme = findTheme(preference.themeId);

  return (
    <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-xs text-terminal-response">
      <span className="truncate">{mixLabel(snapshot.mix)}</span>
      <span aria-hidden="true">·</span>
      <span className="shrink-0">vol {Math.round(snapshot.masterVolume * 100)}%</span>
      <span aria-hidden="true">·</span>
      <span className="shrink-0">
        {theme?.label ?? preference.themeId}/{schemeLabel(preference.scheme)}
      </span>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="ml-auto size-6 shrink-0"
        aria-label={controlsVisible ? "Ocultar controles táctiles" : "Mostrar controles táctiles"}
        aria-pressed={controlsVisible}
        onClick={onToggleControls}
      >
        <SlidersHorizontal className="size-3.5" />
      </Button>
    </div>
  );
}
