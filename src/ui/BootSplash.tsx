import { useEffect, useState } from "react";

/**
 * Pantalla de arranque: nombre de la app en tipografia grande, visible un
 * tiempo minimo antes de dar paso a la consola. No hay ninguna
 * inicializacion asincrona real que mostrar aqui -- el AudioContext se crea
 * recien al primer `play`, por diseño, porque no puede arrancar sin gesto
 * del usuario (audio-engine, "Arranque diferido por gesto del usuario") --
 * asi que esto es una marca de intencion breve, no una barra de progreso
 * inventada.
 */
const MIN_VISIBLE_MS = 600;

export function BootSplash({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <p className="font-mono text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
        dark-echo
        <span
          aria-hidden="true"
          className="ml-1 inline-block animate-pulse text-terminal-cursor motion-reduce:animate-none"
        >
          ▋
        </span>
      </p>
    </div>
  );
}
