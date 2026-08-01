import { useRef } from "react";
import { AmbientMixer } from "../audio/ambientMixer";
import { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import { createCommandRegistry, type AppearanceController } from "../commands/commands";
import { Console } from "./Console";
import { StatusPanel } from "./StatusPanel";
import { ThemeSelector } from "./ThemeSelector";

export function App() {
  const mixerRef = useRef<AmbientMixer | null>(null);
  if (!mixerRef.current) {
    mixerRef.current = new AmbientMixer();
  }

  const appearanceRef = useRef<AppearanceStore | null>(null);
  if (!appearanceRef.current) {
    appearanceRef.current = new AppearanceStore();
  }

  const registryRef = useRef<ReturnType<typeof createCommandRegistry> | null>(null);
  if (!registryRef.current) {
    const appearanceController: AppearanceController = {
      list: () => listThemes(),
      getCurrent: () => appearanceRef.current!.getSnapshot(),
      set: (preference) => appearanceRef.current!.set(preference),
    };
    registryRef.current = createCommandRegistry(mixerRef.current, appearanceController);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-lg font-semibold text-foreground">dark-echo</h1>

      <Console registry={registryRef.current} />
      <StatusPanel mixer={mixerRef.current} />
      <ThemeSelector store={appearanceRef.current} />
    </main>
  );
}
