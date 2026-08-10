/**
 * Ciclo de vida del contexto de audio (audio-engine, "Arranque diferido por
 * gesto del usuario" y "Fallo explicito en entornos no soportados"). El
 * contexto se crea la primera vez que se pide, nunca antes; si el entorno no
 * admite `AudioWorklet`, el fallo es explicito y no hay degradacion
 * silenciosa.
 *
 * Los modulos de worklet se cargan por URL, fuera del grafo de imports del
 * bundle principal (design.md, Context). El sufijo `?url` a secas solo copia
 * el archivo *tal cual* -- codifica el TypeScript sin transpilar como base64,
 * lo que rompe en tiempo de ejecucion --. `?worker&url` es el que hace que
 * Vite trate el archivo como una entrada propia: lo transpila, resuelve sus
 * imports de `dsp/` en un chunk real y devuelve la URL final con hash. Esa
 * URL con hash es lo que `vite-plugin-pwa` puede precachear (tarea 7.2).
 */
import noiseProcessorUrl from "./worklets/noiseProcessor.ts?worker&url";
import modulatorProcessorUrl from "./worklets/modulatorProcessor.ts?worker&url";
import denseGranularProcessorUrl from "./worklets/denseGranularProcessor.ts?worker&url";
import waveEnvelopeProcessorUrl from "./worklets/waveEnvelopeProcessor.ts?worker&url";

export const NOISE_PROCESSOR_NAME = "dark-echo-noise-processor";
export const MODULATOR_PROCESSOR_NAME = "dark-echo-modulator-processor";
export const DENSE_GRANULAR_PROCESSOR_NAME = "dark-echo-dense-granular-processor";
export const WAVE_ENVELOPE_PROCESSOR_NAME = "dark-echo-wave-envelope-processor";

const WORKLET_MODULE_URLS = [
  noiseProcessorUrl,
  modulatorProcessorUrl,
  denseGranularProcessorUrl,
  waveEnvelopeProcessorUrl,
];

export type AudioContextResult =
  { ok: true; context: AudioContext; output: AudioNode } | { ok: false; reason: string };

export function isAudioWorkletSupported(): boolean {
  return typeof AudioContext !== "undefined" && "audioWorklet" in AudioContext.prototype;
}

let sharedContext: AudioContext | null = null;
let modulesLoaded: Promise<void> | null = null;
let focusBeacon: MediaStreamAudioDestinationNode | null = null;

/**
 * Web Audio API no pide el "audio focus" de Android por razones historicas:
 * sin el, Chrome nunca reconoce la pestana como reproduciendo "media" real,
 * y la notificacion de Media Session (`platform/mediaSession.ts`) no
 * aparece nunca -- aunque el sonido si se escuche por los parlantes.
 *
 * El unico arreglo documentado es que la salida real pase por un elemento
 * `<audio>` genuino. Por eso el motor conecta su grafo aqui, al destino de
 * este `MediaStreamAudioDestinationNode`, y no en paralelo a
 * `context.destination` -- eso duplicaria el sonido (una vez por los
 * parlantes directo, otra vez por el elemento oculto).
 *
 * Referencia: https://developer.chrome.com/blog/media-notifications
 */
function createFocusBeacon(context: AudioContext): MediaStreamAudioDestinationNode {
  const destination = context.createMediaStreamDestination();
  const audio = new Audio();
  audio.srcObject = destination.stream;
  void audio.play().catch(() => {
    // Puede rechazar sin gesto del usuario todavia; getAudioContext() solo
    // se llama en respuesta a uno, asi que para entonces ya hubo uno.
  });
  return destination;
}

/**
 * Obtiene el contexto de audio compartido, creandolo y cargando sus modulos
 * de worklet la primera vez que se llama. Reanuda el contexto si el
 * navegador lo mantiene suspendido. No debe llamarse mas que en respuesta a
 * una accion del usuario.
 */
export async function getAudioContext(): Promise<AudioContextResult> {
  if (!isAudioWorkletSupported()) {
    return {
      ok: false,
      reason:
        "Este navegador no admite AudioWorklet; la sintesis procedural no puede ejecutarse aqui.",
    };
  }

  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  const context = sharedContext;

  if (!focusBeacon) {
    focusBeacon = createFocusBeacon(context);
  }

  if (!modulesLoaded) {
    modulesLoaded = Promise.all(
      WORKLET_MODULE_URLS.map((url) => context.audioWorklet.addModule(url))
    ).then(() => undefined);
  }

  try {
    await modulesLoaded;
  } catch (error) {
    modulesLoaded = null;
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `No se pudieron cargar los procesadores de audio: ${message}` };
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  return { ok: true, context, output: focusBeacon };
}

/** Solo para tests: descarta el contexto compartido entre ejemplos. */
export function resetAudioContextForTests(): void {
  const previous = sharedContext;
  sharedContext = null;
  modulesLoaded = null;
  focusBeacon = null;

  // Cerrarlo de verdad, no solo soltar la referencia: el navegador limita
  // cuantos `AudioContext` pueden coexistir, y una suite que crea uno por
  // ejemplo agota ese limite. Pasado el techo, `new AudioContext()` deja de
  // arrancar y los ejemplos siguientes se quedan esperando indefinidamente
  // -- fallan por tiempo agotado, sin relacion aparente con lo que prueban.
  // El cierre es asincrono y no se espera: liberar el recurso empieza ya, y
  // el ejemplo siguiente crea el suyo propio.
  try {
    void previous?.close().catch(() => {});
  } catch {
    // Ya estaba cerrado: nada que liberar.
  }
}
