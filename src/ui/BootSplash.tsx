import { useEffect } from "react";
import { prefersReducedMotion } from "./lib/reducedMotion";
import { Wordmark } from "./Wordmark";

/**
 * Pantalla de marca (`visual-identity`, "Pantalla de arranque y transición
 * entre modos"): la marca centrada con el cursor parpadeando, sin
 * controles ni texto adicional. Sirve dos papeles con el mismo componente
 * — el arranque de la aplicación y la transición al conmutar entre el modo
 * visual y la consola — porque son el mismo gesto: una interposición breve
 * e intencional antes de mostrar el destino.
 *
 * No hay ninguna inicialización asíncrona real que mostrar aquí -- el
 * `AudioContext` se crea recién al primer `play`, por diseño, porque no
 * puede arrancar sin gesto del usuario (`audio-engine`, "Arranque diferido
 * por gesto del usuario") -- así que esto es una marca de intención breve,
 * no una barra de progreso inventada.
 *
 * Con preferencia por movimiento reducido, no se muestra en absoluto: el
 * destino aparece directamente, sin parpadeo ni animación intermedia.
 */
export function BootSplash({
  onDone,
  minVisibleMs = 600,
}: {
  onDone: () => void;
  minVisibleMs?: number;
}) {
  useEffect(() => {
    if (prefersReducedMotion()) {
      onDone();
      return;
    }
    const timer = setTimeout(onDone, minVisibleMs);
    return () => clearTimeout(timer);
  }, [onDone, minVisibleMs]);

  if (prefersReducedMotion()) return null;

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <div className="flex items-baseline font-mono text-5xl sm:text-6xl">
        <Wordmark size="lg" />
        <span
          aria-hidden="true"
          className="ml-1 inline-block animate-pulse text-terminal-cursor motion-reduce:animate-none"
        >
          ▋
        </span>
      </div>
    </div>
  );
}
