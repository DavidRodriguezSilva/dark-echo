import { beforeEach, describe, expect, it } from "vitest";
import { CompositionEngine } from "../audio/composition/compositionEngine";
import { resetAudioContextForTests } from "../audio/context";
import { AppearanceStore } from "../platform/appearance";
import { listThemes } from "../domain/themes";
import { executeCommand } from "./executeCommand";
import {
  createCommandRegistry,
  type AppearanceController,
  type SceneController,
  type UpdateController,
} from "./commands";

/**
 * Gramática de la consola sobre el motor único (`retire-legacy-engine`,
 * tareas 3.5 y 4.6). Vive en la suite de señal porque `CompositionEngine`
 * crea nodos de Web Audio reales: un doble del motor probaría el doble, no el
 * comando.
 */

function buildRegistry() {
  const appearanceStore = new AppearanceStore();

  const appearance: AppearanceController = {
    list: () => listThemes(),
    getCurrent: () => appearanceStore.getSnapshot(),
    set: (preference) => appearanceStore.set(preference),
  };
  const scenes: SceneController = {
    list: () => [],
    save: () => ({ ok: true, message: "Escena guardada." }),
    load: async () => ({ ok: true, message: "Escena cargada." }),
    remove: () => ({ ok: false, message: "no aplica" }),
  };
  const update: UpdateController = { isAvailable: () => false, apply: () => {} };

  return createCommandRegistry(new CompositionEngine(), appearance, scenes, update);
}

async function run(registry: ReturnType<typeof buildRegistry>, input: string) {
  const result = await executeCommand(input, registry);
  if (!result) throw new Error(`El comando "${input}" no produjo resultado`);
  return result;
}

beforeEach(() => {
  resetAudioContextForTests();
});

describe("Gramática clásica sobre el motor único", () => {
  it("play sustituye y add acumula", async () => {
    const registry = buildRegistry();

    await run(registry, "play rain");
    await run(registry, "add wind");
    let status = await run(registry, "status");
    expect(status.message).toContain("rain");
    expect(status.message).toContain("wind");

    await run(registry, "play ocean");
    status = await run(registry, "status");
    expect(status.message).toContain("ocean");
    expect(status.message).not.toContain("wind");
  });

  it("remove retira una capa concreta", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const result = await run(registry, "remove rain.goteo");

    expect(result.kind).toBe("response");
    const status = await run(registry, "status");
    expect(status.message).not.toContain("goteo");
  });

  it("stop conserva y play reanuda", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const stopped = await run(registry, "stop");
    expect(stopped.kind).toBe("response");
    expect((await run(registry, "status")).message).toContain("Detenido");

    const resumed = await run(registry, "play");
    expect(resumed.kind).toBe("response");
    expect((await run(registry, "status")).message).toContain("Sonando");
  });

  it("reset vacía y deja play sin nada que reanudar", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");
    await run(registry, "stop");
    await run(registry, "reset");

    const result = await run(registry, "play");

    expect(result.kind).toBe("error");
  });

  it("volume acepta maestro, ambiente y capa", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    expect((await run(registry, "volume 0.4")).kind).toBe("response");
    expect((await run(registry, "volume rain 0.3")).kind).toBe("response");
    expect((await run(registry, "volume rain.cuerpo 0.2")).kind).toBe("response");
    expect((await run(registry, "volume ocean 0.2")).kind).toBe("error");
  });
});

describe("compose — solo componentes de escena", () => {
  it("ya no ofrece los verbos que duplicaban a los clásicos", async () => {
    const registry = buildRegistry();

    for (const input of [
      "compose source rain",
      "compose remove rain",
      "compose stop",
      "compose volume 0.5",
    ]) {
      const result = await run(registry, input);
      expect(result.kind, `"${input}" debería haber desaparecido`).toBe("error");
    }
  });

  it("environment y occlusion alcanzan a toda la escena con una sola orden", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");
    await run(registry, "add wind");

    expect((await run(registry, "compose environment cabana")).kind).toBe("response");
    expect((await run(registry, "compose occlusion techo-madera")).kind).toBe("response");

    const status = await run(registry, "compose status");
    expect(status.message).toContain("cabana");
    expect(status.message).toContain("techo-madera");
  });

  it("distance nombra el sonido destinatario", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");
    await run(registry, "add wind");

    const result = await run(registry, "compose distance rain 80");

    expect(result.kind).toBe("response");
    expect(result.message).toContain("rain");
    // Sin destinatario la forma ya no valida.
    expect((await run(registry, "compose distance 80")).kind).toBe("error");
  });

  it("rechaza una orden de distancia sobre un sonido que no suena", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const result = await run(registry, "compose distance ocean 80");

    expect(result.kind).toBe("error");
    expect(result.message).toContain("no está sonando");
  });

  it("compose list muestra los componentes de escena, no los sonidos", async () => {
    const registry = buildRegistry();

    const result = await run(registry, "compose list");

    expect(result.message).toContain("cabana");
    expect(result.message).toContain("techo-madera");
    expect(result.message).toContain("distancia");
  });
});

describe("Sugerencia contextual (command-console)", () => {
  it("tras play ofrece recinto, barrera y distancia", async () => {
    const registry = buildRegistry();

    const result = await run(registry, "play rain");

    expect(result.message).toContain("siguiente");
    expect(result.message).toContain("compose environment");
    expect(result.message).toContain("cabana");
    expect(result.message).toContain("compose occlusion");
  });

  it("deja de ofrecer el recinto una vez activo", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const result = await run(registry, "compose environment cabana");

    expect(result.message).not.toContain("compose environment");
    expect(result.message).toContain("compose occlusion");
  });

  it("marca la afinidad de las barreras sin ocultarlas", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const result = await run(registry, "compose environment campo-abierto");

    // Se ofrece igual, marcada: el sistema advierte, no impide.
    expect(result.message).toContain("techo-madera");
    expect(result.message).toMatch(/techo-madera \(/);
  });

  it("marca con ✓ la barrera que el recinto sostiene", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const result = await run(registry, "compose environment cabana");

    expect(result.message).toContain("techo-madera ✓");
  });

  it("con la escena vacía sugiere empezar por un sonido", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    const result = await run(registry, "reset");

    expect(result.message).toContain("play");
    expect(result.message).toContain("rain");
  });

  it("no aparece tras órdenes que no cambian la escena", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");

    for (const input of ["help", "list", "status", "clear", "compose list", "scene list"]) {
      const result = await run(registry, input);
      expect(result.message, `"${input}" no debería sugerir`).not.toContain("siguiente ·");
    }
  });

  it("no aparece cuando la orden falla", async () => {
    const registry = buildRegistry();

    const result = await run(registry, "compose distance rain 50");

    expect(result.kind).toBe("error");
    expect(result.message).not.toContain("siguiente ·");
  });

  it("la advertencia de afinidad convive con la sugerencia", async () => {
    const registry = buildRegistry();
    await run(registry, "play rain");
    await run(registry, "compose environment campo-abierto");

    const result = await run(registry, "compose occlusion techo-madera");

    expect(result.kind).toBe("response");
    expect(result.message).toContain("Afinidad baja");
    expect(result.message).toContain("siguiente ·");
  });
});
