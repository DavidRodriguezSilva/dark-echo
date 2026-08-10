import { useSyncExternalStore } from "react";
import type { CompositionEngine, MixSnapshot } from "../audio/composition/compositionEngine";
import type { InterfaceMode } from "../platform/config";
import { findTheme } from "../domain/themes";
import { useAppearance } from "./AppearanceContext";
import { Button } from "./primitives/button";
import { LayoutGrid, Terminal } from "lucide-react";

/**
 * Barra de estado persistente y minima, estilo statusline (command-console,
 * "Panel de estado del sistema"): una sola linea, sin aspecto de tarjeta,
 * anclada al pie. Se suscribe a `CompositionEngine` y a la apariencia con
 * `useSyncExternalStore`, asi que nunca puede mostrar algo distinto de lo que
 * realmente suena o del tema vigente.
 *
 * El boton de la derecha conmuta entre los dos modos de interfaz. Antes
 * revelaba un panel de controles tactiles superpuesto a la consola; ese panel
 * desaparecio absorbido por el modo visual, que es un superconjunto suyo
 * (design.md D4). El boton es en si mismo tactil, y es el unico punto de
 * entrada sin teclado (command-console, "Operacion sin teclado fisico").
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
  engine,
  mode,
  onToggleMode,
}: {
  engine: CompositionEngine;
  mode: InterfaceMode;
  onToggleMode: () => void;
}) {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { preference } = useAppearance();
  const theme = findTheme(preference.themeId);

  const goingToVisual = mode === "console";
  const label = goingToVisual ? "Cambiar a la interfaz gráfica" : "Cambiar a la consola";

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
        aria-label={label}
        title={label}
        onClick={onToggleMode}
      >
        {goingToVisual ? <LayoutGrid className="size-3.5" /> : <Terminal className="size-3.5" />}
      </Button>
    </div>
  );
}
