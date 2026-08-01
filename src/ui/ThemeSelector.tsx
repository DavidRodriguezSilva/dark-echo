import { useSyncExternalStore } from "react";
import type { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import { Button } from "./primitives/button";

/**
 * Control táctil de tema y esquema (theming, "Selección de tema en
 * caliente"; command-console, "Operación sin teclado"). Produce el mismo
 * efecto que los comandos `theme`/`scheme` y se suscribe al mismo store.
 */
export function ThemeSelector({ store }: { store: AppearanceStore }) {
  const preference = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const themes = listThemes();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {themes.map((theme) => (
        <Button
          key={theme.id}
          type="button"
          size="sm"
          variant={preference.themeId === theme.id ? "default" : "outline"}
          onClick={() => store.set({ themeId: theme.id, scheme: preference.scheme })}
        >
          {theme.label}
        </Button>
      ))}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() =>
          store.set({
            themeId: preference.themeId,
            scheme: preference.scheme === "dark" ? "light" : "dark",
          })
        }
        aria-label="Alternar esquema claro/oscuro"
      >
        {preference.scheme === "dark" ? "Oscuro" : "Claro"}
      </Button>
    </div>
  );
}
