import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { AppearanceStore, AppearancePreference } from "../platform/appearance";
import type { Scheme } from "../domain/themes";

/**
 * Acceso a la apariencia desde React (design.md D12).
 *
 * El contexto transporta el **store**, no una copia de su valor: el hook hace
 * `useSyncExternalStore` sobre el store real, así que el selector de tema no
 * puede mostrar un tema distinto del que tiene el documento. Un contexto que
 * guardara el valor en `useState` y lo sincronizara en un `useEffect`
 * introduciría esa segunda copia, y con ella la divergencia.
 *
 * El store sigue viviendo en `platform/appearance.ts` y sigue siendo la fuente
 * de verdad; esto es solo la vía de acceso, que evita encadenar la prop por
 * niveles intermedios que no la usan.
 */

const AppearanceStoreContext = createContext<AppearanceStore | null>(null);

export function AppearanceProvider({
  store,
  children,
}: {
  store: AppearanceStore;
  children: ReactNode;
}) {
  return (
    <AppearanceStoreContext.Provider value={store}>{children}</AppearanceStoreContext.Provider>
  );
}

export interface AppearanceAccess {
  preference: AppearancePreference;
  setTheme(themeId: string): void;
  setScheme(scheme: Scheme): void;
}

export function useAppearance(): AppearanceAccess {
  const store = useContext(AppearanceStoreContext);
  if (!store) {
    throw new Error("useAppearance debe usarse dentro de <AppearanceProvider>.");
  }

  const preference = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    preference,
    setTheme: (themeId) => store.set({ themeId, scheme: preference.scheme }),
    setScheme: (scheme) => store.set({ themeId: preference.themeId, scheme }),
  };
}
