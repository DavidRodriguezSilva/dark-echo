import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { InterfaceModeStore } from "../platform/interfaceMode";
import { SceneStore } from "../platform/sceneStore";
import type { UpdateStore } from "../platform/update";
import { BootSplash } from "./BootSplash";
import { Console } from "./Console";
import { StatusBar } from "./StatusBar";
import { VisualControls } from "./VisualControls";
import { AppearanceProvider } from "./AppearanceContext";

export function App({ updateStore }: { updateStore: UpdateStore }) {
  const [booted, setBooted] = useState(false);
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

  const modeRef = useRef<InterfaceModeStore | null>(null);
  if (!modeRef.current) {
    modeRef.current = new InterfaceModeStore(notices);
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

  // El controlador de escenas se comparte entre la consola (via el registro de
  // comandos) y el modo visual: una sola persistencia, dos superficies.
  const sceneControllerRef = useRef<SceneController | null>(null);
  if (!sceneControllerRef.current) {
    sceneControllerRef.current = {
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
  }

  const registryRef = useRef<ReturnType<typeof createCommandRegistry> | null>(null);
  if (!registryRef.current) {
    const appearanceController: AppearanceController = {
      list: () => listThemes(),
      getCurrent: () => appearanceRef.current!.getSnapshot(),
      set: (preference) => appearanceRef.current!.set(preference),
    };
    const updateController: UpdateController = {
      isAvailable: () => updateStore.getSnapshot(),
      apply: () => updateStore.apply(),
    };
    registryRef.current = createCommandRegistry(
      compositionRef.current,
      appearanceController,
      sceneControllerRef.current,
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
      // Se relee la configuracion en vez de recordar una copia: el modo de
      // interfaz lo escribe `InterfaceModeStore` por su lado, y escribir aqui
      // un objeto construido de cero lo revertiria en cada cambio de volumen.
      const config = readConfig(notices);
      writeConfig({ ...config, masterVolume: snapshot.masterVolume }, notices);
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

  return (
    <AppearanceProvider store={appearanceRef.current}>
      <AppShell
        booted={booted}
        onBooted={() => setBooted(true)}
        engine={compositionRef.current}
        registry={registryRef.current}
        notices={notices}
        modeStore={modeRef.current}
        scenes={sceneControllerRef.current}
      />
    </AppearanceProvider>
  );
}

/**
 * Cuerpo de la aplicación, separado de `App` porque consume el contexto de
 * apariencia que `App` provee — un componente no puede leer un contexto que
 * él mismo monta.
 *
 * Los dos modos son **excluyentes**: el visual no es un panel que se superpone
 * a la consola, es la otra mitad del conmutador. El modo inicial lo decide el
 * dispositivo (`platform/config.ts`), y en cuanto el usuario conmuta, su
 * elección queda registrada y manda.
 */
function AppShell({
  booted,
  onBooted,
  engine,
  registry,
  notices,
  modeStore,
  scenes,
}: {
  booted: boolean;
  onBooted: () => void;
  engine: CompositionEngine;
  registry: ReturnType<typeof createCommandRegistry>;
  notices: SystemNoticeStore;
  modeStore: InterfaceModeStore;
  scenes: SceneController;
}) {
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.getSnapshot);

  if (!booted) {
    return <BootSplash onDone={onBooted} />;
  }

  return (
    <main className="flex h-dvh w-full flex-col">
      {mode === "console" ? (
        <Console registry={registry} notices={notices} />
      ) : (
        <VisualControls engine={engine} scenes={scenes} notices={notices} />
      )}
      <StatusBar engine={engine} mode={mode} onToggleMode={() => modeStore.toggle()} />
    </main>
  );
}
