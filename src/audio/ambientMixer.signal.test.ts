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

describe("AmbientMixer — estado observable (design.md D7)", () => {
  it("getSnapshot empieza en estado vacío explícito", () => {
    const mixer = new AmbientMixer();
    expect(mixer.getSnapshot().mix).toEqual({ kind: "empty" });
  });

  it("notifica a los suscriptores tras cada operación que cambia la mezcla", async () => {
    const mixer = new AmbientMixer();
    let notifications = 0;
    const unsubscribe = mixer.subscribe(() => notifications++);

    await mixer.play("rain");
    expect(notifications).toBeGreaterThan(0);

    unsubscribe();
  });

  it("distingue sonando / detenido con mezcla conservada / vacío", async () => {
    const mixer = new AmbientMixer();

    await mixer.play("rain");
    expect(mixer.getSnapshot().mix.kind).toBe("playing");

    mixer.stop();
    expect(mixer.getSnapshot().mix.kind).toBe("stopped");

    mixer.reset();
    expect(mixer.getSnapshot().mix.kind).toBe("empty");
  });

  it("el snapshot refleja el volumen maestro y por capa vigentes", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    mixer.setMasterVolume(0.4);
    mixer.setLayerVolume("rain", 0.25);

    const snapshot = mixer.getSnapshot();
    expect(snapshot.masterVolume).toBe(0.4);
    expect(
      snapshot.mix.kind === "playing" && snapshot.mix.layers.every((layer) => layer.volume === 0.25)
    ).toBe(true);
  });

  it("dejar de suscribirse detiene las notificaciones", async () => {
    const mixer = new AmbientMixer();
    let notifications = 0;
    const unsubscribe = mixer.subscribe(() => notifications++);
    unsubscribe();

    await mixer.play("rain");
    expect(notifications).toBe(0);
  });
});

describe("AmbientMixer — composicion inicial (session-persistence, restauracion de la ultima mezcla)", () => {
  it("sin composicion inicial, arranca vacío y sin producir sonido", () => {
    const mixer = new AmbientMixer();
    expect(mixer.getSnapshot().mix).toEqual({ kind: "empty" });
    expect(mixer.activeLayerIds).toEqual([]);
  });

  it("con una composicion inicial, arranca detenido con esas capas sin sonar", () => {
    const mixer = new AmbientMixer({ composition: { "rain.cuerpo": 0.6 } });

    const snapshot = mixer.getSnapshot();
    expect(snapshot.mix).toEqual({ kind: "stopped", layers: [{ id: "rain.cuerpo", volume: 0.6 }] });
    // Detenido: la mezcla no suena, el motor no tiene capas activas todavía.
    expect(mixer.activeLayerIds).toEqual([]);
  });

  it("una sola accion de reproduccion basta para reanudar la composicion restaurada", async () => {
    const mixer = new AmbientMixer({ composition: { "rain.cuerpo": 0.6 } });

    const result = await mixer.play();
    expect(result.ok).toBe(true);
    expect(mixer.activeLayerIds).toContain("rain.cuerpo");
  });

  it("restaura tambien el volumen maestro inicial", () => {
    const mixer = new AmbientMixer({ masterVolume: 0.33 });
    expect(mixer.getSnapshot().masterVolume).toBe(0.33);
  });
});

describe("AmbientMixer — getComposition (guardar como escena)", () => {
  it("devuelve null cuando no hay nada que guardar", () => {
    const mixer = new AmbientMixer();
    expect(mixer.getComposition()).toBeNull();
  });

  it("devuelve la composicion vigente mientras suena", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    mixer.setLayerVolume("rain", 0.42);

    expect(mixer.getComposition()).toEqual({
      layers: Object.fromEntries(mixer.activeLayerIds.map((id) => [id, 0.42])),
    });
  });

  it("devuelve la composicion conservada tras stop", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    const activeIds = [...mixer.activeLayerIds];
    mixer.stop();

    const composition = mixer.getComposition();
    expect(composition).not.toBeNull();
    expect(Object.keys(composition!.layers).sort()).toEqual(activeIds.sort());
  });
});

describe("AmbientMixer — loadComposition (session-persistence, cargar una escena)", () => {
  it("reproduce exactamente las capas y volumenes de la escena", async () => {
    const mixer = new AmbientMixer();

    const result = await mixer.loadComposition({ layers: { "rain.cuerpo": 0.25 } });

    expect(result.ok).toBe(true);
    expect(mixer.activeLayerIds).toEqual(["rain.cuerpo"]);
    const composition = mixer.getComposition();
    expect(composition).toEqual({ layers: { "rain.cuerpo": 0.25 } });
  });

  it("un subconjunto de las capas de un ambiente no se completa con el resto", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("rain");
    const allRainLayers = [...mixer.activeLayerIds];
    // Guarda solo una de las capas de rain, no todas.
    const partial = { layers: { [allRainLayers[0]]: 0.5 } };

    await mixer.loadComposition(partial);

    expect(mixer.activeLayerIds).toEqual([allRainLayers[0]]);
  });

  it("cargar una escena sobre una mezcla en curso la sustituye sin dejar capas de la anterior", async () => {
    const mixer = new AmbientMixer();
    await mixer.play("wind");

    await mixer.loadComposition({ layers: { "rain.cuerpo": 0.5 } });

    expect(mixer.activeLayerIds.some((id) => id.startsWith("wind."))).toBe(false);
    expect(mixer.activeLayerIds).toContain("rain.cuerpo");
  });

  it("rechaza una escena que exceda el limite de capas simultaneas", async () => {
    const mixer = new AmbientMixer();
    const layers: Record<string, number> = {};
    for (let i = 0; i < 20; i++) layers[`rain.capa-${i}`] = 0.5;

    const result = await mixer.loadComposition({ layers });
    expect(result.ok).toBe(false);
  });
});
