import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AmbientMixer } from "../ambientMixer";
import { resetAudioContextForTests } from "../context";
import { CompositionEngine } from "./compositionEngine";

/**
 * Verifica la semántica del motor de composición (capacidad
 * `ambient-composition-engine`) contra un `AudioContext` real, igual que
 * `audio/ambientMixer.signal.test.ts` verifica el motor actual — porque
 * `CompositionEngine` llama a `getAudioContext()` y crea nodos reales.
 */

beforeAll(async () => {
  const warmup = new CompositionEngine();
  await warmup.activateSource("rain");
  warmup.stop();
}, 30000);

beforeEach(() => {
  resetAudioContextForTests();
});

describe("CompositionEngine — activar y retirar un Source", () => {
  it("activa el único Source del piloto y lo refleja en el snapshot", async () => {
    const engine = new CompositionEngine();

    const result = await engine.activateSource("rain");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot()).toEqual({ source: { id: "rain" } });
  });

  it("rechaza un Source fuera del alcance del piloto sin activar nada", async () => {
    const engine = new CompositionEngine();

    const result = await engine.activateSource("wind");

    expect(result.ok).toBe(false);
    expect(engine.getSnapshot()).toEqual({ source: null });
  });

  it("rechaza un Source inexistente", async () => {
    const engine = new CompositionEngine();

    const result = await engine.activateSource("no-existe");

    expect(result.ok).toBe(false);
  });

  it("deactivateSource retira el Source activo", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = engine.deactivateSource();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot()).toEqual({ source: null });
  });

  it("deactivateSource sin nada activo informa el estado en vez de fallar en silencio", async () => {
    const engine = new CompositionEngine();

    const result = engine.deactivateSource();

    expect(result.ok).toBe(false);
  });

  it("reactivar el mismo Source no dejar duplicados ni fugas de estado", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = await engine.activateSource("rain");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot()).toEqual({ source: { id: "rain" } });
  });
});

describe("CompositionEngine — stop desmonta la escena", () => {
  it("stop retira el Source activo", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = engine.stop();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot()).toEqual({ source: null });
  });

  it("stop sin nada activo informa que no hay nada que detener", async () => {
    const engine = new CompositionEngine();

    const result = engine.stop();

    expect(result.ok).toBe(false);
  });
});

describe("CompositionEngine — estado observable", () => {
  it("empieza sin ningún Source activo", () => {
    const engine = new CompositionEngine();
    expect(engine.getSnapshot()).toEqual({ source: null });
  });

  it("notifica a los suscriptores tras activar y retirar un Source", async () => {
    const engine = new CompositionEngine();
    let notifications = 0;
    const unsubscribe = engine.subscribe(() => notifications++);

    await engine.activateSource("rain");
    expect(notifications).toBeGreaterThan(0);

    engine.deactivateSource();
    expect(notifications).toBeGreaterThan(1);

    unsubscribe();
  });
});

describe("CompositionEngine — coexistencia con el motor actual (design.md D1)", () => {
  it("activar rain en el motor de composición no altera una mezcla ya sonando en AmbientMixer", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    const mixerLayersBefore = [...mixer.activeLayerIds].sort();

    const composition = new CompositionEngine();
    await composition.activateSource("rain");

    expect([...mixer.activeLayerIds].sort()).toEqual(mixerLayersBefore);
    expect(composition.getSnapshot()).toEqual({ source: { id: "rain" } });
  });

  it("detener la composición no afecta lo que AmbientMixer tiene sonando", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");

    const composition = new CompositionEngine();
    await composition.activateSource("rain");
    composition.stop();

    expect(mixer.activeLayerIds.length).toBeGreaterThan(0);
  });

  it("play de rain en AmbientMixer sigue sonando exactamente igual: mismas capas, mismo id por capa (prueba de humo 1.3)", async () => {
    const mixer = new AmbientMixer();

    const result = await mixer.play("rain");

    expect(result.ok).toBe(true);
    expect([...mixer.activeLayerIds].sort()).toEqual(
      ["rain.cuerpo", "rain.impactos", "rain.goteo"].sort()
    );
  });
});

describe("CompositionEngine — estado", () => {
  it("status describe el Source activo o su ausencia", async () => {
    const engine = new CompositionEngine();
    expect(engine.status()).toBe("Motor de composición: sin nada activo.");

    await engine.activateSource("rain");
    expect(engine.status()).toContain("rain");
  });
});
