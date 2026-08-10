import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AmbientMixer } from "../ambientMixer";
import { resetAudioContextForTests } from "../context";
import { CompositionEngine, MAX_COMPOSITION_LAYERS } from "./compositionEngine";

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
  it("activa un Source y lo refleja en el snapshot", async () => {
    const engine = new CompositionEngine();

    const result = await engine.activateSource("rain");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().sources).toEqual([{ id: "rain", modifier: null }]);
  });

  it("admite todo el catálogo de ambientes como Source, no solo rain", async () => {
    const engine = new CompositionEngine();

    for (const id of ["wind", "river", "ocean", "white-noise", "pink-noise", "brown-noise"]) {
      const result = await engine.activateSource(id);
      expect(result.ok, `${id} debería activarse`).toBe(true);
    }

    expect(engine.activeSourceIds).toEqual([
      "wind",
      "river",
      "ocean",
      "white-noise",
      "pink-noise",
      "brown-noise",
    ]);
  });

  it("rechaza un Source inexistente", async () => {
    const engine = new CompositionEngine();

    const result = await engine.activateSource("no-existe");

    expect(result.ok).toBe(false);
  });

  it("deactivateSource sin argumento retira todos los Source activos", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");

    const result = engine.deactivateSource();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().sources).toEqual([]);
  });

  it("deactivateSource sin nada activo informa el estado en vez de fallar en silencio", async () => {
    const engine = new CompositionEngine();

    const result = engine.deactivateSource();

    expect(result.ok).toBe(false);
  });

  it("activar un Source que ya suena lo informa en vez de reiniciarlo", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = await engine.activateSource("rain");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("ya está sonando");
    expect(engine.getSnapshot().sources).toEqual([{ id: "rain", modifier: null }]);
  });
});

describe("CompositionEngine — varios Source simultáneos", () => {
  it("incorporar un Source acumula sobre los que ya suenan", async () => {
    const engine = new CompositionEngine();

    await engine.activateSource("rain");
    await engine.activateSource("wind");

    expect(engine.activeSourceIds).toEqual(["rain", "wind"]);
  });

  it("retirar un Source concreto deja los demás intactos", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");
    await engine.activateSource("river");

    const result = engine.deactivateSource("wind");

    expect(result.ok).toBe(true);
    expect(engine.activeSourceIds).toEqual(["rain", "river"]);
  });

  it("retirar un Source que no suena informa en vez de callar", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = engine.deactivateSource("ocean");

    expect(result.ok).toBe(false);
    expect(engine.activeSourceIds).toEqual(["rain"]);
  });

  it("retirar un Source conserva el Environment y la Occlusion de la escena", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");

    engine.deactivateSource("wind");

    const snapshot = engine.getSnapshot();
    expect(snapshot.sources.map((s) => s.id)).toEqual(["rain"]);
    expect(snapshot.environment).toEqual({ id: "cabana" });
    expect(snapshot.occlusion).toEqual({ id: "techo-madera" });
  });

  it("el catálogo completo cabe dentro del límite de capas declarado", async () => {
    const engine = new CompositionEngine();

    for (const id of [
      "rain",
      "wind",
      "river",
      "ocean",
      "white-noise",
      "pink-noise",
      "brown-noise",
    ]) {
      const result = await engine.activateSource(id);
      expect(result.ok, `${id} debería caber`).toBe(true);
    }

    expect(engine.activeLayers).toBe(12);
    expect(engine.activeLayers).toBeLessThanOrEqual(MAX_COMPOSITION_LAYERS);
  });

  it("rechaza el Source que no cabe y deja la escena en curso intacta", async () => {
    // El limite por defecto esta fijado para que el catalogo entero quepa
    // justo, asi que se prueba la guarda con un limite bajo explicito.
    const engine = new CompositionEngine(4);
    await engine.activateSource("rain"); // 3 capas
    await engine.activateSource("wind"); // 1 capa -> 4, en el limite

    const result = await engine.activateSource("river"); // necesita 3 mas

    expect(result.ok).toBe(false);
    expect(result.message).toContain("No hay sitio");
    expect(result.message).toContain("3 capa");
    expect(result.message).toContain("4");
    // La escena en curso continua sin alteracion.
    expect(engine.activeSourceIds).toEqual(["rain", "wind"]);
    expect(engine.activeLayers).toBe(4);
  });

  it("un Source que sí cabe se acepta con el mismo límite", async () => {
    const engine = new CompositionEngine(4);
    await engine.activateSource("rain");

    const result = await engine.activateSource("white-noise");

    expect(result.ok).toBe(true);
    expect(engine.activeLayers).toBe(4);
  });
});

describe("CompositionEngine — stop desmonta la escena", () => {
  it("stop retira todos los Source activos", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");

    const result = engine.stop();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().sources).toEqual([]);
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
    expect(engine.getSnapshot().sources).toEqual([]);
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
    expect(composition.activeSourceIds).toEqual(["rain"]);
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
  it("status describe los Source activos o su ausencia", async () => {
    const engine = new CompositionEngine();
    expect(engine.status()).toBe("Motor de composición: sin nada activo.");

    await engine.activateSource("rain");
    await engine.activateSource("wind");

    const status = engine.status();
    expect(status).toContain("rain");
    expect(status).toContain("wind");
  });
});

describe("CompositionEngine — Environment compartido de escena (grupo 3)", () => {
  it("como mucho un Environment activo: activar otro sustituye al anterior", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    await engine.activateEnvironment("cabana");
    expect(engine.getSnapshot().environment).toEqual({ id: "cabana" });

    await engine.activateEnvironment("casa");
    expect(engine.getSnapshot().environment).toEqual({ id: "casa" });
  });

  it("sustituir el Environment no retira los Source activos", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");
    await engine.activateEnvironment("cabana");

    await engine.activateEnvironment("casa");

    expect(engine.activeSourceIds).toEqual(["rain", "wind"]);
  });

  it("retirar el Environment deja los Source sonando", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");

    const result = engine.deactivateEnvironment();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().environment).toBeNull();
    expect(engine.activeSourceIds).toEqual(["rain"]);
  });

  it("un Environment puede activarse sin ningun Source presente", async () => {
    const engine = new CompositionEngine();
    const result = await engine.activateEnvironment("cabana");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().environment).toEqual({ id: "cabana" });
    expect(engine.getSnapshot().sources).toEqual([]);
  });

  it("rechaza un Environment inexistente", async () => {
    const engine = new CompositionEngine();
    const result = await engine.activateEnvironment("submarino");
    expect(result.ok).toBe(false);
  });
});

describe("CompositionEngine — Occlusion compartida de escena (grupo 4)", () => {
  it("como mucho una Occlusion activa: activar otra sustituye a la anterior", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("casa");

    await engine.activateOcclusion("techo-madera");
    expect(engine.getSnapshot().occlusion).toEqual({ id: "techo-madera" });

    await engine.activateOcclusion("ventana-vidrio");
    expect(engine.getSnapshot().occlusion).toEqual({ id: "ventana-vidrio" });
  });

  it("sustituir la Occlusion no interrumpe los Source", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateOcclusion("techo-madera");

    await engine.activateOcclusion("ventana-vidrio");

    expect(engine.activeSourceIds).toEqual(["rain"]);
  });
});

describe("CompositionEngine — compatibilidad no bloqueante (grupo 6, tarea 6.4)", () => {
  it("una combinacion de baja afinidad se activa igual y produce la advertencia", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("campo-abierto");

    const result = await engine.activateOcclusion("techo-madera");

    // Se activa: el sistema informa, no impide (design.md D5).
    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().occlusion).toEqual({ id: "techo-madera" });
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain("techo");
  });

  it("una combinacion de alta afinidad se activa sin advertencia", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("casa");

    const result = await engine.activateOcclusion("ventana-vidrio");

    expect(result.ok).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it("cambiar a un entorno que ya no sostiene la oclusion activa tambien advierte", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");
    const sinAdvertencia = await engine.activateOcclusion("techo-madera");
    expect(sinAdvertencia.warning).toBeUndefined();

    const result = await engine.activateEnvironment("campo-abierto");

    expect(result.ok).toBe(true);
    expect(result.warning).toBeDefined();
  });
});

describe("CompositionEngine — Modifier por Source (grupo 5)", () => {
  it("activa la distancia con su valor por defecto declarado", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = await engine.activateModifier("rain", "distancia");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().sources).toEqual([
      { id: "rain", modifier: { id: "distancia", distanceMeters: 20 } },
    ]);
  });

  it("volver a activarlo con otro valor mueve la distancia (movimiento aparente)", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    await engine.activateModifier("rain", "distancia", 5);
    expect(engine.getSnapshot().sources[0].modifier?.distanceMeters).toBe(5);

    await engine.activateModifier("rain", "distancia", 120);
    expect(engine.getSnapshot().sources[0].modifier?.distanceMeters).toBe(120);
  });

  it("acota la distancia al rango declarado", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateModifier("rain", "distancia", 10000);
    expect(engine.getSnapshot().sources[0].modifier?.distanceMeters).toBe(200);
  });

  it("la intensidad de rain no pasa por el Modifier: son rutas distintas (tarea 5.2)", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateModifier("rain", "distancia", 50);

    // El Modifier solo conoce la distancia. La intensidad sigue siendo un
    // parametro del Source (design.md D4): no aparece en el snapshot del
    // Modifier ni existe un `activateModifier("intensidad")`.
    expect(engine.getSnapshot().sources[0].modifier).toEqual({
      id: "distancia",
      distanceMeters: 50,
    });
    const intensidad = await engine.activateModifier("rain", "intensidad");
    expect(intensidad.ok).toBe(false);
  });

  it("el Modifier pertenece al Source: mover uno no mueve el otro", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");

    await engine.activateModifier("rain", "distancia", 100);

    const snapshot = engine.getSnapshot();
    expect(snapshot.sources.find((s) => s.id === "rain")?.modifier?.distanceMeters).toBe(100);
    expect(snapshot.sources.find((s) => s.id === "wind")?.modifier).toBeNull();
  });

  it("cada Source conserva su propia distancia", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");

    await engine.activateModifier("rain", "distancia", 10);
    await engine.activateModifier("wind", "distancia", 150);

    const snapshot = engine.getSnapshot();
    expect(snapshot.sources.find((s) => s.id === "rain")?.modifier?.distanceMeters).toBe(10);
    expect(snapshot.sources.find((s) => s.id === "wind")?.modifier?.distanceMeters).toBe(150);
  });

  it("rechaza una orden de Modifier sobre un Source que no está sonando", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = await engine.activateModifier("ocean", "distancia", 30);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("no está sonando");
  });

  it("retirar un Source retira sus Modifiers y deja intacto el del otro", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateSource("wind");
    await engine.activateModifier("rain", "distancia", 10);
    await engine.activateModifier("wind", "distancia", 150);

    engine.deactivateSource("rain");

    const snapshot = engine.getSnapshot();
    expect(snapshot.sources).toEqual([
      { id: "wind", modifier: { id: "distancia", distanceMeters: 150 } },
    ]);
  });
});

describe("CompositionEngine — desmontaje de la escena (grupo 7, tarea 7.2)", () => {
  it("stop retira los cuatro componentes a la vez", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");
    await engine.activateModifier("rain", "distancia", 15);

    const result = engine.stop();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot()).toEqual({
      sources: [],
      environment: null,
      occlusion: null,
    });
  });

  it("retirar los componentes uno a uno deja el Source intacto en cada paso", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");
    await engine.activateModifier("rain", "distancia", 15);

    engine.deactivateModifier("rain");
    expect(engine.activeSourceIds).toEqual(["rain"]);

    engine.deactivateOcclusion();
    expect(engine.activeSourceIds).toEqual(["rain"]);

    engine.deactivateEnvironment();
    expect(engine.getSnapshot()).toEqual({
      sources: [{ id: "rain", modifier: null }],
      environment: null,
      occlusion: null,
    });
  });

  it("stop tambien desmonta una escena sin Source pero con componentes activos", async () => {
    const engine = new CompositionEngine();
    await engine.activateEnvironment("cabana");

    const result = engine.stop();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().environment).toBeNull();
  });
});
