import { useEffect, useRef, useState } from "react";
import { CompositionEngine } from "../audio/composition/compositionEngine";
import { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import {
  createCommandRegistry,
  type AppearanceController,
  type SceneController,
  type UpdateController,
} from "../commands/commands";
import { SystemNoticeStore } from "../platform/systemNotices";
import { readConfig, writeConfig } from "../platform/config";
import { readLastMix, writeLastMix } from "../platform/lastMix";
import { SceneStore } from "../platform/sceneStore";
import type { UpdateStore } from "../platform/update";
import { BootSplash } from "./BootSplash";
import { Console } from "./Console";
import { StatusBar } from "./StatusBar";
import { TouchControls } from "./TouchControls";

export function App({ updateStore }: { updateStore: UpdateStore }) {
  const [booted, setBooted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const noticesRef = useRef<SystemNoticeStore | null>(null);
  if (!noticesRef.current) {
    noticesRef.current = new SystemNoticeStore();
  }
  const notices = noticesRef.current;

  const sceneStoreRef = useRef<SceneStore | null>(null);
  if (!sceneStoreRef.current) {
    sceneStoreRef.current = new SceneStore(notices);
  }

  const appearanceRef = useRef<AppearanceStore | null>(null);
  if (!appearanceRef.current) {
    appearanceRef.current = new AppearanceStore();
  }

  const compositionRef = useRef<CompositionEngine | null>(null);
  if (!compositionRef.current) {
    const config = readConfig(notices);
    const lastMix = readLastMix(notices);
    compositionRef.current = new CompositionEngine({
      masterVolume: config.masterVolume,
      composition: lastMix,
    });
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
        const composition = compositionRef.current!.getComposition();
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
        return compositionRef.current!.loadComposition(scene);
      },
      remove: (name) => {
        const removed = sceneStoreRef.current!.remove(name);
        return removed
          ? { ok: true, message: `Escena "${name}" eliminada.` }
          : { ok: false, message: `No existe la escena "${name}".` };
      },
    };
    const updateController: UpdateController = {
      isAvailable: () => updateStore.getSnapshot(),
      apply: () => updateStore.apply(),
    };
    registryRef.current = createCommandRegistry(
      compositionRef.current,
      appearanceController,
      sceneController,
      updateController
    );
  }

  // Persiste la configuracion y la ultima mezcla en cada cambio (session-
  // persistence, "Restauracion de la ultima mezcla" y "Persistencia de la
  // configuracion del usuario"): no hay un evento de cierre fiable en una
  // PWA, asi que la ultima escritura antes de cerrar es, por construccion,
  // el estado que se restaura al volver a abrir.
  useEffect(() => {
    const engine = compositionRef.current!;
    const persist = () => {
      const snapshot = engine.getSnapshot();
      writeConfig({ masterVolume: snapshot.masterVolume }, notices);
      writeLastMix(engine.getComposition(), notices);
    };
    return engine.subscribe(persist);
  }, [notices]);

  // Actualizacion no disruptiva (offline-playback): la decision se toma en
  // el instante en que se detecta la version nueva, mirando si hay alguna
  // capa activa en ese momento. Sin nada sonando, se aplica sola; con algo
  // sonando, se avisa y queda a decision del usuario (comando `update`) —
  // no se reintenta automáticamente mas tarde, para no sorprender con una
  // recarga tras algo que el usuario puso a sonar despues del aviso.
  useEffect(() => {
    return updateStore.subscribe(() => {
      if (!updateStore.getSnapshot()) return;

      const mix = compositionRef.current!.getSnapshot().mix;
      if (mix.kind === "empty") {
        updateStore.apply();
        return;
      }
      notices.push('Hay una actualización disponible. Ejecuta "update" para aplicarla.');
    });
  }, [updateStore, notices]);

  if (!booted) {
    return <BootSplash onDone={() => setBooted(true)} />;
  }

  return (
    <main className="flex h-dvh w-full flex-col">
      <Console registry={registryRef.current} notices={notices} />
      {controlsVisible && (
        <TouchControls engine={compositionRef.current} appearance={appearanceRef.current} />
      )}
      <StatusBar
        engine={compositionRef.current}
        appearance={appearanceRef.current}
        controlsVisible={controlsVisible}
        onToggleControls={() => setControlsVisible((visible) => !visible)}
      />
    </main>
  );
}
