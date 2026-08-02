import { useEffect, useRef } from "react";
import { AmbientMixer } from "../audio/ambientMixer";
import { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import {
  createCommandRegistry,
  type AppearanceController,
  type SceneController,
} from "../commands/commands";
import { PersistenceNoticeStore } from "../platform/persistenceNotices";
import { readConfig, writeConfig } from "../platform/config";
import { readLastMix, writeLastMix } from "../platform/lastMix";
import { SceneStore } from "../platform/sceneStore";
import { Console } from "./Console";
import { StatusPanel } from "./StatusPanel";
import { ThemeSelector } from "./ThemeSelector";

export function App() {
  const noticesRef = useRef<PersistenceNoticeStore | null>(null);
  if (!noticesRef.current) {
    noticesRef.current = new PersistenceNoticeStore();
  }
  const notices = noticesRef.current;

  const sceneStoreRef = useRef<SceneStore | null>(null);
  if (!sceneStoreRef.current) {
    sceneStoreRef.current = new SceneStore(notices);
  }

  const mixerRef = useRef<AmbientMixer | null>(null);
  if (!mixerRef.current) {
    const config = readConfig(notices);
    const lastMix = readLastMix(notices);
    mixerRef.current = new AmbientMixer({
      masterVolume: config.masterVolume,
      composition: lastMix?.layers,
    });
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
    const sceneController: SceneController = {
      list: () => sceneStoreRef.current!.list(),
      save: (name, overwrite) => {
        const composition = mixerRef.current!.getComposition();
        if (!composition) {
          return { ok: false, message: "No hay mezcla activa que guardar." };
        }
        const result = sceneStoreRef.current!.save(name, composition, overwrite);
        if (result.status === "exists") {
          return {
            ok: false,
            message: `Ya existe una escena "${name}". Repite el comando como "scene save ${name} confirmar" para sobreescribirla.`,
          };
        }
        return {
          ok: true,
          message: result.overwritten
            ? `Escena "${name}" sobreescrita.`
            : `Escena "${name}" guardada.`,
        };
      },
      load: async (name) => {
        const scene = sceneStoreRef.current!.load(name);
        if (!scene) {
          const names = sceneStoreRef.current!.list();
          const available =
            names.length > 0 ? ` Disponibles: ${names.join(", ")}.` : " No hay ninguna guardada.";
          return { ok: false, message: `No existe la escena "${name}".${available}` };
        }
        return mixerRef.current!.loadComposition(scene);
      },
      remove: (name) => {
        const removed = sceneStoreRef.current!.remove(name);
        return removed
          ? { ok: true, message: `Escena "${name}" eliminada.` }
          : { ok: false, message: `No existe la escena "${name}".` };
      },
    };
    registryRef.current = createCommandRegistry(
      mixerRef.current,
      appearanceController,
      sceneController
    );
  }

  // Persiste la configuracion y la ultima mezcla en cada cambio (session-
  // persistence, "Restauracion de la ultima mezcla" y "Persistencia de la
  // configuracion del usuario"): no hay un evento de cierre fiable en una
  // PWA, asi que la ultima escritura antes de cerrar es, por construccion,
  // el estado que se restaura al volver a abrir.
  useEffect(() => {
    const mixer = mixerRef.current!;
    const persist = () => {
      const snapshot = mixer.getSnapshot();
      writeConfig({ masterVolume: snapshot.masterVolume }, notices);
      writeLastMix(mixer.getComposition(), notices);
    };
    return mixer.subscribe(persist);
  }, [notices]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-lg font-semibold text-foreground">dark-echo</h1>

      <Console registry={registryRef.current} notices={notices} />
      <StatusPanel mixer={mixerRef.current} />
      <ThemeSelector store={appearanceRef.current} />
    </main>
  );
}
