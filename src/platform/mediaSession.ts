import type { CompositionEngine } from "../audio/composition/compositionEngine";
import { findAmbient } from "../domain/catalog";

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

  const title = (sourceIds: string[]): string =>
    sourceIds.length > 0
      ? sourceIds.map((id) => findAmbient(id)?.label ?? id).join(" + ")
      : "dark echo";

  const sync = (): void => {
    const snapshot = engine.getSnapshot();
    const { kind } = snapshot.mix;
    const sounding = kind === "playing" || kind === "suspended";

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
  };
}
