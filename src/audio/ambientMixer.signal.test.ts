import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AmbientMixer } from "./ambientMixer";
import { resetAudioContextForTests } from "./context";

/**
 * Verifica la semantica de mezcla de command-console ("Vocabulario de
 * comandos y semantica de la mezcla") contra un AudioContext real -- no un
 * doble -- porque AmbientMixer llama a WorkletEngine, que crea nodos reales.
 */

// Precalienta la carga y compilacion de los modulos de worklet una sola
// vez, con un timeout generoso, para que los tests individuales no
// hereden ese coste de arranque.
beforeAll(async () => {
  const warmup = new AmbientMixer();
  await warmup.play("rain");
  warmup.reset();
}, 30000);

beforeEach(() => {
  resetAudioContextForTests();
});

describe("AmbientMixer — play sustituye la mezcla", () => {
  it("play de un ambiente nuevo retira el anterior", async () => {
    const mixer = new AmbientMixer();

    await mixer.play("rain");
    expect(mixer.activeLayerIds.every((id) => id.startsWith("rain."))).toBe(true);

    await mixer.play("wind");
    expect(mixer.activeLayerIds.every((id) => id.startsWith("wind."))).toBe(true);
    expect(mixer.activeLayerIds.some((id) => id.startsWith("rain."))).toBe(false);
  });

  it("rechaza un ambiente inexistente sin alterar la mezcla activa", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    const before = [...mixer.activeLayerIds].sort();

    const result = await mixer.play("tormenta");

    expect(result.ok).toBe(false);
    expect([...mixer.activeLayerIds].sort()).toEqual(before);
  });
});

describe("AmbientMixer — add acumula sobre la mezcla", () => {
  it("add no retira lo que ya suena", async () => {
    const mixer = new AmbientMixer();

    await mixer.play("rain");
    const rainLayers = [...mixer.activeLayerIds];

    await mixer.add("wind");

    for (const id of rainLayers) expect(mixer.activeLayerIds).toContain(id);
    expect(mixer.activeLayerIds.some((id) => id.startsWith("wind."))).toBe(true);
  });
});

describe("AmbientMixer — remove retira una capa o un ambiente", () => {
  it("retira solo el ambiente indicado, dejando el resto sonando", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    await mixer.add("wind");

    const result = mixer.remove("wind");

    expect(result.ok).toBe(true);
    expect(mixer.activeLayerIds.some((id) => id.startsWith("wind."))).toBe(false);
    expect(mixer.activeLayerIds.some((id) => id.startsWith("rain."))).toBe(true);
  });
});

describe("AmbientMixer — stop conserva la composición", () => {
  it("stop y luego play sin argumento reanuda exactamente la misma mezcla", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    await mixer.add("wind");
    mixer.setLayerVolume("rain", 0.2);
    const composed = [...mixer.activeLayerIds].sort();

    const stopResult = mixer.stop();
    expect(stopResult.ok).toBe(true);
    expect(mixer.activeLayerIds).toEqual([]);

    const resumeResult = await mixer.play();
    expect(resumeResult.ok).toBe(true);
    expect([...mixer.activeLayerIds].sort()).toEqual(composed);
  });

  it("play sin mezcla conservada informa que no hay nada que reanudar", async () => {
    const mixer = new AmbientMixer();
    const result = await mixer.play();

    expect(result.ok).toBe(false);
  });
});

describe("AmbientMixer — reset vacía la mezcla", () => {
  it("tras reset, play sin argumento no tiene nada que reanudar", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    mixer.stop();

    const resetResult = mixer.reset();
    expect(resetResult.ok).toBe(true);

    const resumeResult = await mixer.play();
    expect(resumeResult.ok).toBe(false);
  });
});

describe("AmbientMixer — volumen maestro y por capa", () => {
  it("rechaza un volumen maestro fuera de rango sin modificar el vigente", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");

    const result = mixer.setMasterVolume(5);
    expect(result.ok).toBe(false);
  });

  it("ajustar el volumen de un ambiente no afecta a otro", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    await mixer.add("wind");

    const result = mixer.setLayerVolume("wind", 0.1);
    expect(result.ok).toBe(true);
  });
});
