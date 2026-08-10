import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetAudioContextForTests } from "../context";
import { CompositionEngine, MAX_COMPOSITION_LAYERS } from "./compositionEngine";

/**
 * Verifica la semántica del motor único (capacidad
 * `ambient-composition-engine`) contra un `AudioContext` real: es obligado,
 * porque `CompositionEngine` llama a `getAudioContext()` y crea nodos de Web
 * Audio de verdad, que en Node no existen.
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
    const engine = new CompositionEngine(undefined, 4);
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
    const engine = new CompositionEngine(undefined, 4);
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

describe("CompositionEngine — estado", () => {
  it("status describe los Source activos o su ausencia", async () => {
    const engine = new CompositionEngine();
    expect(engine.status()).toBe("No hay reproducción en curso.");

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
  it("stop desmonta los cuatro componentes y conserva la escena para reanudarla", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");
    await engine.activateModifier("rain", "distancia", 15);

    const result = engine.stop();

    expect(result.ok).toBe(true);
    const snapshot = engine.getSnapshot();
    expect(snapshot.sources).toEqual([]);
    expect(snapshot.environment).toBeNull();
    expect(snapshot.occlusion).toBeNull();
    // No desaparece: queda conservada y reanudable (command-console,
    // "`stop` conserva la composición").
    expect(snapshot.mix.kind).toBe("stopped");
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
    const snapshot = engine.getSnapshot();
    expect(snapshot.sources).toEqual([{ id: "rain", modifier: null }]);
    expect(snapshot.environment).toBeNull();
    expect(snapshot.occlusion).toBeNull();
  });

  it("stop sin nada sonando informa, aunque haya componentes de escena activos", async () => {
    const engine = new CompositionEngine();
    await engine.activateEnvironment("cabana");

    // `stop` actúa sobre la reproducción, y un Environment sin Source no
    // produce sonido: no hay nada que detener. Vaciar la escena es `reset`.
    const result = engine.stop();

    expect(result.ok).toBe(false);
    expect(engine.getSnapshot().environment).toEqual({ id: "cabana" });
  });

  it("reset vacía la escena entera sin conservar nada", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");

    const result = engine.reset();

    expect(result.ok).toBe(true);
    const snapshot = engine.getSnapshot();
    expect(snapshot.sources).toEqual([]);
    expect(snapshot.environment).toBeNull();
    expect(snapshot.mix.kind).toBe("empty");
  });
});

/**
 * Ciclo de reproducción absorbido del motor de ambientes retirado
 * (`retire-legacy-engine`, grupo 1). Los escenarios se trasladaron desde el
 * test de aquel motor en vez de escribirse de cero, para no perder cobertura
 * por el camino: son requisitos vigentes de `command-console`,
 * `session-persistence` y `offline-playback`, no comportamiento nuevo.
 */
describe("CompositionEngine — play/add: sustituir frente a acumular", () => {
  it("play con argumento sustituye la mezcla anterior", async () => {
    const engine = new CompositionEngine();
    await engine.add("rain");
    await engine.add("wind");

    const result = await engine.play("ocean");

    expect(result.ok).toBe(true);
    expect(engine.activeSourceIds).toEqual(["ocean"]);
  });

  it("add acumula sin retirar lo que ya suena", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    const result = await engine.add("wind");

    expect(result.ok).toBe(true);
    expect(engine.activeSourceIds).toEqual(["rain", "wind"]);
  });

  it("play rechaza un ambiente inexistente sin tocar la mezcla", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    const result = await engine.play("volcan");

    expect(result.ok).toBe(false);
    expect(engine.activeSourceIds).toEqual(["rain"]);
  });
});

describe("CompositionEngine — stop conserva y play reanuda", () => {
  it("stop y play devuelven las mismas capas con los mismos volúmenes", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");
    engine.setLayerVolume("rain.cuerpo", 0.3);
    const antes = engine.getSnapshot().mix;
    const capasAntes =
      antes.kind === "playing" ? [...antes.layers].sort((a, b) => a.id.localeCompare(b.id)) : [];

    engine.stop();
    expect(engine.getSnapshot().mix.kind).toBe("stopped");

    const result = await engine.play();

    expect(result.ok).toBe(true);
    const despues = engine.getSnapshot().mix;
    const capasDespues =
      despues.kind === "playing"
        ? [...despues.layers].sort((a, b) => a.id.localeCompare(b.id))
        : [];
    expect(capasDespues).toEqual(capasAntes);
  });

  it("stop conserva también el recinto, la barrera y la distancia", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");
    await engine.activateModifier("rain", "distancia", 40);

    engine.stop();
    await engine.play();

    const snapshot = engine.getSnapshot();
    expect(snapshot.environment).toEqual({ id: "cabana" });
    expect(snapshot.occlusion).toEqual({ id: "techo-madera" });
    expect(snapshot.sources[0].modifier).toEqual({ id: "distancia", distanceMeters: 40 });
  });

  it("reset vacía la mezcla conservada: play no tiene nada que reanudar", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");
    engine.stop();

    engine.reset();
    const result = await engine.play();

    expect(result.ok).toBe(false);
    expect(engine.getSnapshot().mix.kind).toBe("empty");
  });
});

describe("CompositionEngine — volumen por capa y por Source", () => {
  it("volume sobre una capa solo cambia esa capa", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    const result = engine.setLayerVolume("rain.cuerpo", 0.2);

    expect(result.ok).toBe(true);
    const mix = engine.getSnapshot().mix;
    const layers = mix.kind === "playing" ? mix.layers : [];
    expect(layers.find((l) => l.id === "rain.cuerpo")?.volume).toBe(0.2);
    expect(layers.find((l) => l.id === "rain.impactos")?.volume).not.toBe(0.2);
  });

  it("volume sobre un Source entero cambia todas sus capas", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    const result = engine.setLayerVolume("rain", 0.4);

    expect(result.ok).toBe(true);
    const mix = engine.getSnapshot().mix;
    const layers = mix.kind === "playing" ? mix.layers : [];
    expect(layers.every((l) => l.volume === 0.4)).toBe(true);
  });

  it("volume sobre algo que no suena informa en vez de callar", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    expect(engine.setLayerVolume("ocean", 0.5).ok).toBe(false);
    expect(engine.setLayerVolume("rain.inexistente", 0.5).ok).toBe(false);
  });

  it("rechaza un volumen fuera de rango", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    expect(engine.setLayerVolume("rain", 1.5).ok).toBe(false);
    expect(engine.setMasterVolume(-1).ok).toBe(false);
  });
});

describe("CompositionEngine — remove de capa o de Source", () => {
  it("remove de una capa deja las demás del mismo Source sonando", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");

    const result = engine.removeTarget("rain.goteo");

    expect(result.ok).toBe(true);
    expect(engine.activeLayerIds.sort()).toEqual(["rain.cuerpo", "rain.impactos"]);
  });

  it("remove del último resto de un Source lo retira entero", async () => {
    const engine = new CompositionEngine();
    await engine.play("wind"); // una sola capa

    const result = engine.removeTarget("wind.cuerpo");

    expect(result.ok).toBe(true);
    expect(engine.activeSourceIds).toEqual([]);
  });

  it("remove de un Source entero retira todas sus capas", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");
    await engine.add("wind");

    const result = engine.removeTarget("rain");

    expect(result.ok).toBe(true);
    expect(engine.activeSourceIds).toEqual(["wind"]);
  });
});

describe("CompositionEngine — escena guardada (session-persistence)", () => {
  it("getComposition captura capas, volúmenes y componentes de escena", async () => {
    const engine = new CompositionEngine();
    await engine.play("rain");
    await engine.activateEnvironment("casa");
    await engine.activateOcclusion("ventana-vidrio");
    await engine.activateModifier("rain", "distancia", 25);
    engine.setLayerVolume("rain.cuerpo", 0.35);

    const scene = engine.getComposition()!;

    expect(scene.layers["rain.cuerpo"]).toBe(0.35);
    expect(scene.environment).toBe("casa");
    expect(scene.occlusion).toBe("ventana-vidrio");
    expect(scene.modifiers?.rain).toEqual({ id: "distancia", meters: 25 });
  });

  it("loadComposition restaura la escena completa", async () => {
    const engine = new CompositionEngine();

    const result = await engine.loadComposition({
      layers: { "rain.cuerpo": 0.5, "wind.cuerpo": 0.3 },
      environment: "cabana",
      occlusion: "techo-madera",
      modifiers: { rain: { id: "distancia", meters: 60 } },
    });

    expect(result.ok).toBe(true);
    const snapshot = engine.getSnapshot();
    expect(snapshot.environment).toEqual({ id: "cabana" });
    expect(snapshot.occlusion).toEqual({ id: "techo-madera" });
    expect(snapshot.sources.find((s) => s.id === "rain")?.modifier?.distanceMeters).toBe(60);
    expect(engine.activeLayerIds.sort()).toEqual(["rain.cuerpo", "wind.cuerpo"]);
  });

  it("carga una escena del formato anterior, sin componentes de escena", async () => {
    const engine = new CompositionEngine();

    // Formato v1: solo capas y volúmenes, sin los campos añadidos después.
    const result = await engine.loadComposition({
      layers: { "rain.cuerpo": 0.5, "rain.impactos": 0.4 },
    });

    expect(result.ok).toBe(true);
    const snapshot = engine.getSnapshot();
    expect(snapshot.environment).toBeNull();
    expect(snapshot.occlusion).toBeNull();
    expect(engine.activeLayerIds.sort()).toEqual(["rain.cuerpo", "rain.impactos"]);
  });

  it("carga un subconjunto de las capas de un ambiente, no el ambiente entero", async () => {
    const engine = new CompositionEngine();

    await engine.loadComposition({ layers: { "rain.cuerpo": 0.5 } });

    expect(engine.activeLayerIds).toEqual(["rain.cuerpo"]);
  });

  it("rechaza una escena que excede el límite de capas", async () => {
    const engine = new CompositionEngine(undefined, 2);

    const result = await engine.loadComposition({
      layers: { "rain.cuerpo": 1, "rain.impactos": 1, "rain.goteo": 1 },
    });

    expect(result.ok).toBe(false);
  });
});

describe("CompositionEngine — restauración de la última mezcla", () => {
  it("arranca en estado detenido con la mezcla restaurada, sin sonar", () => {
    const engine = new CompositionEngine({
      composition: { layers: { "rain.cuerpo": 0.5 } },
      masterVolume: 0.7,
    });

    const snapshot = engine.getSnapshot();
    expect(snapshot.mix.kind).toBe("stopped");
    expect(engine.activeSourceIds).toEqual([]);
    expect(snapshot.masterVolume).toBe(0.7);
  });

  it("una sola acción basta para reanudar la mezcla restaurada", async () => {
    const engine = new CompositionEngine({
      composition: { layers: { "rain.cuerpo": 0.5 } },
    });

    const result = await engine.play();

    expect(result.ok).toBe(true);
    expect(engine.activeLayerIds).toEqual(["rain.cuerpo"]);
  });

  it("sin mezcla previa arranca vacío", () => {
    const engine = new CompositionEngine();
    expect(engine.getSnapshot().mix.kind).toBe("empty");
  });
});
