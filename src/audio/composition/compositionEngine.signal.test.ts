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
    expect(engine.getSnapshot().source).toEqual({ id: "rain" });
  });

  it("rechaza un Source fuera del alcance del piloto sin activar nada", async () => {
    const engine = new CompositionEngine();

    const result = await engine.activateSource("wind");

    expect(result.ok).toBe(false);
    expect(engine.getSnapshot().source).toBeNull();
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
    expect(engine.getSnapshot().source).toBeNull();
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
    expect(engine.getSnapshot().source).toEqual({ id: "rain" });
  });
});

describe("CompositionEngine — stop desmonta la escena", () => {
  it("stop retira el Source activo", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    const result = engine.stop();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().source).toBeNull();
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
    expect(engine.getSnapshot().source).toBeNull();
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
    expect(composition.getSnapshot().source).toEqual({ id: "rain" });
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

describe("CompositionEngine — Environment compartido de escena (grupo 3)", () => {
  it("como mucho un Environment activo: activar otro sustituye al anterior", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    await engine.activateEnvironment("cabana");
    expect(engine.getSnapshot().environment).toEqual({ id: "cabana" });

    await engine.activateEnvironment("casa");
    expect(engine.getSnapshot().environment).toEqual({ id: "casa" });
  });

  it("sustituir el Environment no retira el Source activo", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");

    await engine.activateEnvironment("casa");

    expect(engine.getSnapshot().source).toEqual({ id: "rain" });
  });

  it("retirar el Environment deja el Source sonando", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");

    const result = engine.deactivateEnvironment();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().environment).toBeNull();
    expect(engine.getSnapshot().source).toEqual({ id: "rain" });
  });

  it("un Environment puede activarse sin ningun Source presente", async () => {
    const engine = new CompositionEngine();
    const result = await engine.activateEnvironment("cabana");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().environment).toEqual({ id: "cabana" });
    expect(engine.getSnapshot().source).toBeNull();
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

  it("sustituir la Occlusion no interrumpe el Source", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateOcclusion("techo-madera");

    await engine.activateOcclusion("ventana-vidrio");

    expect(engine.getSnapshot().source).toEqual({ id: "rain" });
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

    const result = await engine.activateModifier("distancia");

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().modifier).toEqual({ id: "distancia", distanceMeters: 20 });
  });

  it("volver a activarlo con otro valor mueve la distancia (movimiento aparente)", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");

    await engine.activateModifier("distancia", 5);
    expect(engine.getSnapshot().modifier?.distanceMeters).toBe(5);

    await engine.activateModifier("distancia", 120);
    expect(engine.getSnapshot().modifier?.distanceMeters).toBe(120);
  });

  it("acota la distancia al rango declarado", async () => {
    const engine = new CompositionEngine();
    await engine.activateModifier("distancia", 10000);
    expect(engine.getSnapshot().modifier?.distanceMeters).toBe(200);
  });

  it("la intensidad de rain no pasa por el Modifier: son rutas distintas (tarea 5.2)", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateModifier("distancia", 50);

    // El Modifier solo conoce la distancia. La intensidad sigue siendo un
    // parametro del Source (design.md D4): no aparece en el snapshot del
    // Modifier ni existe un `activateModifier("intensidad")`.
    expect(engine.getSnapshot().modifier).toEqual({ id: "distancia", distanceMeters: 50 });
    const intensidad = await engine.activateModifier("intensidad");
    expect(intensidad.ok).toBe(false);
  });
});

describe("CompositionEngine — desmontaje de la escena (grupo 7, tarea 7.2)", () => {
  it("stop retira los cuatro componentes a la vez", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");
    await engine.activateModifier("distancia", 15);

    const result = engine.stop();

    expect(result.ok).toBe(true);
    expect(engine.getSnapshot()).toEqual({
      source: null,
      environment: null,
      occlusion: null,
      modifier: null,
    });
  });

  it("retirar los componentes uno a uno deja el Source intacto en cada paso", async () => {
    const engine = new CompositionEngine();
    await engine.activateSource("rain");
    await engine.activateEnvironment("cabana");
    await engine.activateOcclusion("techo-madera");
    await engine.activateModifier("distancia", 15);

    engine.deactivateModifier();
    expect(engine.getSnapshot().source).toEqual({ id: "rain" });

    engine.deactivateOcclusion();
    expect(engine.getSnapshot().source).toEqual({ id: "rain" });

    engine.deactivateEnvironment();
    expect(engine.getSnapshot()).toEqual({
      source: { id: "rain" },
      environment: null,
      occlusion: null,
      modifier: null,
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
