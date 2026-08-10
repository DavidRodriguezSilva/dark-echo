import { describe, expect, it, vi } from "vitest";
import type { CompositionEngine } from "../audio/composition/compositionEngine";
import { setupMediaSession } from "./mediaSession";

interface FakeSnapshot {
  mix: { kind: "empty" | "stopped" | "playing" | "suspended" };
  sources: { id: string }[];
}

function installFakeMediaSession() {
  const handlers = new Map<string, (() => void) | null>();
  const session = {
    playbackState: "none" as string,
    metadata: null as unknown,
    setActionHandler: (action: string, handler: (() => void) | null) =>
      handlers.set(action, handler),
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
  return { session, handlers };
}

function fakeEngine(initial: FakeSnapshot) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const play = vi.fn();
  const stop = vi.fn();
  return {
    engine: {
      getSnapshot: () => snapshot,
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
    const { engine } = fakeEngine({ mix: { kind: "empty" }, sources: [] });
    expect(() => setupMediaSession(engine)).not.toThrow();
  });

  it("con algo sonando, fija playbackState y el titulo con los Source activos", () => {
    const { session } = installFakeMediaSession();
    const { engine } = fakeEngine({
      mix: { kind: "playing" },
      sources: [{ id: "rain" }, { id: "wind" }],
    });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("playing");
    expect((session.metadata as { init: { title: string } }).init.title).toBe("Lluvia + Viento");
  });

  it("suspendido por el entorno se refleja como pausado, no como sonando", () => {
    const { session } = installFakeMediaSession();
    const { engine } = fakeEngine({ mix: { kind: "suspended" }, sources: [{ id: "rain" }] });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("paused");
  });

  it("sin nada sonando, no hay metadata y el playbackState es none", () => {
    const { session } = installFakeMediaSession();
    const { engine } = fakeEngine({ mix: { kind: "empty" }, sources: [] });

    setupMediaSession(engine);

    expect(session.playbackState).toBe("none");
    expect(session.metadata).toBeNull();
  });

  it("reacciona a cambios posteriores del motor", () => {
    const { session } = installFakeMediaSession();
    const { engine, setSnapshot } = fakeEngine({ mix: { kind: "empty" }, sources: [] });
    setupMediaSession(engine);

    setSnapshot({ mix: { kind: "playing" }, sources: [{ id: "ocean" }] });

    expect(session.playbackState).toBe("playing");
  });

  it("los action handlers llaman a play()/stop() del motor", () => {
    const { handlers } = installFakeMediaSession();
    const { engine, play, stop } = fakeEngine({ mix: { kind: "empty" }, sources: [] });
    setupMediaSession(engine);

    handlers.get("play")!();
    handlers.get("pause")!();
    handlers.get("stop")!();

    expect(play).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("al desmontar, limpia handlers, metadata y playbackState", () => {
    const { session, handlers } = installFakeMediaSession();
    const { engine, setSnapshot } = fakeEngine({ mix: { kind: "empty" }, sources: [] });
    const teardown = setupMediaSession(engine);
    setSnapshot({ mix: { kind: "playing" }, sources: [{ id: "rain" }] });

    teardown();

    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe("none");
    expect(handlers.get("play")).toBeNull();
    expect(handlers.get("pause")).toBeNull();
    expect(handlers.get("stop")).toBeNull();
  });
});
