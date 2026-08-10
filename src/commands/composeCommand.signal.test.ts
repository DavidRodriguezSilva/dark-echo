import { beforeEach, describe, expect, it } from "vitest";
import { AmbientMixer } from "../audio/ambientMixer";
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
 * Gramática del comando `compose` con varios `Source`
 * (`add-multi-source-composition`, tarea 3.5). Vive en la suite de señal
 * porque `CompositionEngine` crea nodos de Web Audio reales: un doble del
 * motor probaría el doble, no el comando.
 */

function buildRegistry(): { registry: ReturnType<typeof createCommandRegistry> } {
  const mixer = new AmbientMixer();
  const appearanceStore = new AppearanceStore();

  const appearance: AppearanceController = {
    list: () => listThemes(),
    getCurrent: () => appearanceStore.getSnapshot(),
    set: (preference) => appearanceStore.set(preference),
  };
  const scenes: SceneController = {
    list: () => [],
    save: () => ({ ok: false, message: "no aplica" }),
    load: async () => ({ ok: false, message: "no aplica" }),
    remove: () => ({ ok: false, message: "no aplica" }),
  };
  const update: UpdateController = { isAvailable: () => false, apply: () => {} };

  return {
    registry: createCommandRegistry(mixer, appearance, scenes, update, new CompositionEngine()),
  };
}

async function run(registry: ReturnType<typeof createCommandRegistry>, input: string) {
  const result = await executeCommand(input, registry);
  if (!result) throw new Error(`El comando "${input}" no produjo resultado`);
  return result;
}

beforeEach(() => {
  resetAudioContextForTests();
});

describe("compose source — acumula en vez de sustituir", () => {
  it("incorpora varios Source y los lista todos en status", async () => {
    const { registry } = buildRegistry();

    expect((await run(registry, "compose source rain")).kind).toBe("response");
    expect((await run(registry, "compose source wind")).kind).toBe("response");

    const status = await run(registry, "compose status");
    expect(status.message).toContain("rain");
    expect(status.message).toContain("wind");
  });

  it("admite los ambientes que el piloto no ofrecía", async () => {
    const { registry } = buildRegistry();

    for (const id of ["river", "ocean", "white-noise", "pink-noise", "brown-noise"]) {
      const result = await run(registry, `compose source ${id}`);
      expect(result.kind, `${id} debería aceptarse`).toBe("response");
    }
  });

  it("rechaza un Source que no existe en el catálogo", async () => {
    const { registry } = buildRegistry();

    const result = await run(registry, "compose source volcan");

    expect(result.kind).toBe("error");
  });
});

describe("compose remove — retira un Source concreto", () => {
  it("retira solo el Source nombrado", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");
    await run(registry, "compose source wind");

    const removed = await run(registry, "compose remove rain");
    expect(removed.kind).toBe("response");

    const status = await run(registry, "compose status");
    expect(status.message).not.toContain("rain");
    expect(status.message).toContain("wind");
  });

  it("informa cuando el Source nombrado no está sonando", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");

    const result = await run(registry, "compose remove ocean");

    expect(result.kind).toBe("error");
  });
});

describe("compose source off — retira todos los Source", () => {
  it("deja la escena sin ningún Source", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");
    await run(registry, "compose source wind");

    const result = await run(registry, "compose source off");
    expect(result.kind).toBe("response");

    const status = await run(registry, "compose status");
    expect(status.message).toBe("Motor de composición: sin nada activo.");
  });
});

describe("compose distance / modifier — el Source destinatario es explícito", () => {
  it("aplica la distancia solo al Source nombrado", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");
    await run(registry, "compose source wind");

    const result = await run(registry, "compose distance rain 80");
    expect(result.kind).toBe("response");
    expect(result.message).toContain("rain");

    const status = await run(registry, "compose status");
    expect(status.message).toContain("80 m");
  });

  it("rechaza una orden de distancia sobre un Source que no suena", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");

    const result = await run(registry, "compose distance ocean 80");

    expect(result.kind).toBe("error");
    expect(result.message).toContain("no está sonando");
  });

  it("rechaza una orden de distancia sin nombrar el Source", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");

    // Sin destinatario la forma no valida: la aridad ya no coincide con
    // ninguna forma declarada del comando.
    const result = await run(registry, "compose distance 80");

    expect(result.kind).toBe("error");
  });

  it("retira el Modifier del Source nombrado", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");
    await run(registry, "compose modifier rain distancia");

    const result = await run(registry, "compose modifier rain off");

    expect(result.kind).toBe("response");
  });
});

describe("compose list — deriva el catálogo, no lo repite", () => {
  it("lista los Source con su etiqueta real del catálogo de ambientes", async () => {
    const { registry } = buildRegistry();

    const result = await run(registry, "compose list");

    expect(result.message).toContain("rain");
    expect(result.message).toContain("brown-noise");
    // La etiqueta viene del catálogo: si se repitiera el id como etiqueta,
    // la línea sería "rain — rain".
    expect(result.message).not.toContain("rain — rain");
  });
});

describe("compose — los componentes de escena alcanzan a todos los Source", () => {
  it("un Environment se activa una sola vez con varios Source sonando", async () => {
    const { registry } = buildRegistry();
    await run(registry, "compose source rain");
    await run(registry, "compose source wind");

    const result = await run(registry, "compose environment cabana");

    expect(result.kind).toBe("response");
    const status = await run(registry, "compose status");
    expect(status.message).toContain("cabana");
    expect(status.message).toContain("rain");
    expect(status.message).toContain("wind");
  });
});
