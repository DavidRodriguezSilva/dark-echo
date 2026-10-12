import { beforeEach, describe, expect, it } from "vitest";
import { SleepTimerStore, createSleepTimerController } from "./sleepTimer";

function setup() {
  let clock = 1_000_000;
  let playing = true;
  let tick: (() => void) | null = null;
  const fades: number[] = [];
  const store = new SleepTimerStore({
    now: () => clock,
    every: (cb) => {
      tick = cb;
      return () => {
        tick = null;
      };
    },
    isPlaying: () => playing,
    fadeOut: (s) => {
      fades.push(s);
      playing = false;
    },
  });
  return {
    store,
    fades,
    advance(ms: number) {
      clock += ms;
      tick?.();
    },
    setPlaying(v: boolean) {
      playing = v;
    },
    hasTicker: () => tick !== null,
    now: () => clock,
  };
}

describe("SleepTimerStore", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("rechaza fijar si nada suena", () => {
    t.setPlaying(false);
    expect(t.store.set(t.now() + 60_000).ok).toBe(false);
    expect(t.store.getSnapshot()).toBeNull();
  });

  it("el desvanecimiento de 20 s empieza 20 s antes de la hora y termina en ella", () => {
    t.store.set(t.now() + 5 * 60_000);
    t.advance(4 * 60_000 + 39_000);
    expect(t.fades).toEqual([]);
    t.advance(1_000);
    expect(t.fades).toEqual([20]);
    t.advance(20_000);
    expect(t.store.getSnapshot()).toBeNull();
    expect(t.hasTicker()).toBe(false);
  });

  it("con menos de 20 s restantes desvanece lo que quede", () => {
    t.store.set(t.now() + 10_000);
    expect(t.fades).toEqual([10]);
  });

  it("fijar uno nuevo sustituye al anterior", () => {
    t.store.set(t.now() + 30 * 60_000);
    const end = t.now() + 10 * 60_000;
    t.store.set(end);
    expect(t.store.getSnapshot()?.endAt).toBe(end);
  });

  it("cancelar a mano limpia el estado y avisa a los suscriptores", () => {
    let calls = 0;
    t.store.subscribe(() => calls++);
    t.store.set(t.now() + 60_000);
    const before = calls;
    expect(t.store.cancel()).toBe(true);
    expect(calls).toBe(before + 1);
    expect(t.store.getSnapshot()).toBeNull();
    expect(t.store.cancel()).toBe(false);
  });

  it("detener la reproducción cancela y no se rearma al reanudar", () => {
    t.store.set(t.now() + 60_000);
    t.setPlaying(false);
    t.advance(1_000);
    expect(t.store.getSnapshot()).toBeNull();
    t.setPlaying(true);
    t.advance(120_000);
    expect(t.fades).toEqual([]);
  });

  it("check() tras una pestaña oculta ejecuta el apagado al instante", () => {
    t.store.set(t.now() + 60_000);
    t.advance(10 * 60_000);
    expect(t.fades.length).toBeLessThanOrEqual(1);
    expect(t.store.getSnapshot()).toBeNull();
  });
});

describe("createSleepTimerController", () => {
  it("informa la hora de apagado y el estado", () => {
    const t = setup();
    const c = createSleepTimerController(t.store, t.now);
    expect(c.status()).toContain("No hay");
    const set = c.setIn("30m");
    expect(set.ok).toBe(true);
    expect(set.message).toContain("30:00");
    expect(c.status()).toContain("faltan 30:00");
    expect(c.cancel().message).toContain("cancelado");
  });

  it("propaga el error de formato sin tocar el temporizador activo", () => {
    const t = setup();
    const c = createSleepTimerController(t.store, t.now);
    c.setIn("30m");
    const end = t.store.getSnapshot()?.endAt;
    expect(c.setIn("13h").ok).toBe(false);
    expect(t.store.getSnapshot()?.endAt).toBe(end);
  });
});
