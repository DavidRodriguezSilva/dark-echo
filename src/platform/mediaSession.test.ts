import { describe, expect, it, vi } from "vitest";
import type { CompositionEngine } from "../audio/composition/compositionEngine";
import type { Scene } from "../domain/scene";
import { setupMediaSession } from "./mediaSession";

interface FakeSnapshot {
  mix: { kind: "empty" | "stopped" | "playing" | "suspended" };
  composition: Scene | null;
}

function sceneWith(...sourceIds: string[]): Scene {
  return { layers: Object.fromEntries(sourceIds.map((id) => [`${id}.cuerpo`, 1])) };
}

class FakeAudio {
  loop = false;
  paused = true;
  src: string;
  constructor(src: string) {
    this.src = src;
  }
  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
}

function installFakeMediaSession() {
  const handlers = new Map<string, (() => void) | null>();
  const session = {
    playbackState: "none" as string,
    metadata: null as unknown,
    positionState: null as { duration: number; position: number; playbackRate: number } | null,
    setActionHandler: (action: string, handler: (() => void) | null) =>
      handlers.set(action, handler),
    setPositionState: (state?: { duration: number; position: number; playbackRate: number }) => {
      session.positionState = state ?? null;
    },
  };
  vi.stubGlobal("navigator", { mediaSession: session });
  vi.stubGlobal(
    "MediaMetadata",
    class {
      init: unknown;
      constructor(init: unknown) {
        this.init = init;
      }
    }
  );
  const audioInstances: FakeAudio[] = [];
  vi.stubGlobal(
    "Audio",
    class extends FakeAudio {
      constructor(src: string) {
        super(src);
        audioInstances.push(this);
      }
    }
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:fake-focus-beacon",
    revokeObjectURL: vi.fn(),
  });
  return { session, handlers, audioInstances };
}

function fakeEngine(initial: FakeSnapshot) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const play = vi.fn();
  const stop = vi.fn();
  return {
    engine: {
      getSnapshot: () => snapshot,
      getComposition: () => snapshot.composition,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      play,
      stop,
    } as unknown as CompositionEngine,
    setSnapshot: (next: FakeSnapshot) => {
      snapshot = next;
      for (const listener of listeners) listener();
    },
    play,
    stop,
  };
}

describe("setupMediaSession", () => {
  it("sin soporte de Media Session, no hace nada y no lanza", () => {
    vi.stubGlobal("navigator", {});
    const { engine } = fakeEngine({ mix: { kind: "empty" }, composition: null });
    expect(() => setupMediaSession(engine)).not.toThrow();
  });

  it("con algo sonando, fija playbackState, el titulo con los Source activos y reproduce el beacon de audio focus", () => {
    const { session, audioInstances } = installFakeMediaSession();
    const { engine } = fakeEngine({
      mix: { kind: "playing" },
      composition: sceneWith("rain", "wind"),
    });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("playing");
    expect((session.metadata as { init: { title: string } }).init.title).toBe("Lluvia + Viento");
    expect(audioInstances[0].paused).toBe(false);
    expect(audioInstances[0].loop).toBe(true);
    expect(session.positionState?.duration).toBe(Infinity);
  });

  it("con un temporizador activo, la barra avanza hacia la hora de apagado; sin él, vuelve a Infinity", () => {
    const { session } = installFakeMediaSession();
    const { engine } = fakeEngine({ mix: { kind: "playing" }, composition: sceneWith("rain") });
    let state: { startedAt: number; endAt: number; fading: boolean } | null = null;
    const listeners = new Set<() => void>();
    const timer = {
      getSnapshot: () => state,
      subscribe: (l: () => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    };

    setupMediaSession(engine, timer, () => 130_000);
    expect(session.positionState?.duration).toBe(Infinity);

    state = { startedAt: 100_000, endAt: 1_900_000, fading: false };
    for (const l of listeners) l();
    expect(session.positionState).toEqual({ duration: 1800, position: 30, playbackRate: 1 });

    state = null;
    for (const l of listeners) l();
    expect(session.positionState?.duration).toBe(Infinity);
  });

  it("suspendido por el entorno se refleja como pausado, no como sonando, pero conserva el titulo", () => {
    const { session } = installFakeMediaSession();
    const { engine } = fakeEngine({ mix: { kind: "suspended" }, composition: sceneWith("rain") });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("paused");
    expect((session.metadata as { init: { title: string } }).init.title).toBe("Lluvia");
  });

  it('detenido ("pausa") conserva el titulo y el playbackState -- no cae al nombre del sitio', () => {
    const { session, audioInstances } = installFakeMediaSession();
    const { engine } = fakeEngine({ mix: { kind: "stopped" }, composition: sceneWith("ocean") });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("paused");
    expect((session.metadata as { init: { title: string } }).init.title).toBe("Océano");
    expect(audioInstances[0].paused).toBe(true);
  });

  it("sin nada sonando, no hay metadata, el playbackState es none y el beacon esta pausado", () => {
    const { session, audioInstances } = installFakeMediaSession();
    const { engine } = fakeEngine({ mix: { kind: "empty" }, composition: null });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("none");
    expect(session.metadata).toBeNull();
    expect(session.positionState).toBeNull();
    expect(audioInstances[0].paused).toBe(true);
  });

  it("reacciona a cambios posteriores del motor", () => {
    const { session } = installFakeMediaSession();
    const { engine, setSnapshot } = fakeEngine({ mix: { kind: "empty" }, composition: null });
    setupMediaSession(engine);

    setSnapshot({ mix: { kind: "playing" }, composition: sceneWith("ocean") });

    expect(session.playbackState).toBe("playing");
  });

  it("los action handlers llaman a play()/stop() del motor", () => {
    const { handlers } = installFakeMediaSession();
    const { engine, play, stop } = fakeEngine({ mix: { kind: "empty" }, composition: null });
    setupMediaSession(engine);

    handlers.get("play")!();
    handlers.get("pause")!();
    handlers.get("stop")!();

    expect(play).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("al desmontar, limpia handlers, metadata, playbackState y pausa el beacon", () => {
    const { session, handlers, audioInstances } = installFakeMediaSession();
    const { engine, setSnapshot } = fakeEngine({ mix: { kind: "empty" }, composition: null });
    const teardown = setupMediaSession(engine);
    setSnapshot({ mix: { kind: "playing" }, composition: sceneWith("rain") });

    teardown();

    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe("none");
    expect(session.positionState).toBeNull();
    expect(handlers.get("play")).toBeNull();
    expect(handlers.get("pause")).toBeNull();
    expect(handlers.get("stop")).toBeNull();
    expect(audioInstances[0].paused).toBe(true);
  });
});
