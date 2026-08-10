import type { CompositionEngine } from "../audio/composition/compositionEngine";
import { findAmbient } from "../domain/catalog";

/**
 * Duración del silencio del beacon de audio focus. Chrome en Android solo
 * pide "audio focus" completo —requisito para mostrar la notificación de
 * Media Session— para medios de al menos 5 segundos; se deja margen.
 */
const FOCUS_BEACON_SECONDS = 10;
const FOCUS_BEACON_SAMPLE_RATE = 8000;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/**
 * Un WAV de silencio real (no un `MediaStream` en vivo, sin duración fija)
 * para pedir el "audio focus" de Android: Web Audio API no lo pide por
 * razones históricas, y sin él Chrome nunca reconoce la pestaña como
 * reproduciendo "media" real, así que la notificación no aparece aunque el
 * sonido sí se escuche por los parlantes. Deliberadamente ajeno al grafo de
 * audio real —solo pide el foco, no reemplaza la salida— para no arriesgar
 * la ruta de sonido que ya garantiza `audio-engine`.
 *
 * Referencia: https://developer.chrome.com/blog/media-notifications
 */
function createFocusBeaconUrl(): string {
  const frameCount = FOCUS_BEACON_SECONDS * FOCUS_BEACON_SAMPLE_RATE;
  const dataSize = frameCount * 2; // PCM de 16 bits, un canal.
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // un canal
  view.setUint32(24, FOCUS_BEACON_SAMPLE_RATE, true);
  view.setUint32(28, FOCUS_BEACON_SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits por muestra
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  // El resto del buffer ya nace en cero: es silencio, no hace falta escribirlo.

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/**
 * Controles del sistema (notificación en Android, pantalla de bloqueo) via
 * Media Session API (offline-playback, "Aplicación instalable"). dark echo
 * no tiene pistas que avanzar o retroceder —es una composición continua, no
 * un álbum—, así que solo se expone `play`/`pause`/`stop`, sobre los mismos
 * `play()`/`stop()` que ya usa la consola.
 */
export function setupMediaSession(engine: CompositionEngine): () => void {
  if (!("mediaSession" in navigator)) return () => {};

  const session = navigator.mediaSession;
  const focusBeaconUrl = createFocusBeaconUrl();
  const focusBeacon = new Audio(focusBeaconUrl);
  focusBeacon.loop = true;

  const title = (sourceIds: string[]): string =>
    sourceIds.length > 0
      ? sourceIds.map((id) => findAmbient(id)?.label ?? id).join(" + ")
      : "dark echo";

  const sync = (): void => {
    const snapshot = engine.getSnapshot();
    const { kind } = snapshot.mix;
    const sounding = kind === "playing" || kind === "suspended";

    if (sounding) {
      void focusBeacon.play().catch(() => {
        // Puede rechazar sin gesto del usuario todavia; para cuando algo
        // suena de verdad, ya hubo uno.
      });
    } else {
      focusBeacon.pause();
    }

    session.playbackState =
      kind === "playing" ? "playing" : kind === "suspended" ? "paused" : "none";
    session.metadata = sounding
      ? new MediaMetadata({
          title: title(snapshot.sources.map((source) => source.id)),
          artist: "dark echo",
          artwork: [
            {
              src: `${import.meta.env.BASE_URL}pwa-512x512.png`,
              sizes: "512x512",
              type: "image/png",
            },
          ],
        })
      : null;
  };

  session.setActionHandler("play", () => void engine.play());
  session.setActionHandler("pause", () => engine.stop());
  session.setActionHandler("stop", () => engine.stop());

  sync();
  const unsubscribe = engine.subscribe(sync);

  return () => {
    unsubscribe();
    session.setActionHandler("play", null);
    session.setActionHandler("pause", null);
    session.setActionHandler("stop", null);
    session.metadata = null;
    session.playbackState = "none";
    focusBeacon.pause();
    URL.revokeObjectURL(focusBeaconUrl);
  };
}
