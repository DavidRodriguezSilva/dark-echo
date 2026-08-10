import { cn } from "./lib/utils";

const MARK_SIZES = {
  sm: "text-lg",
  md: "text-3xl",
  lg: "text-5xl sm:text-6xl",
} as const;

const TEXT_SIZES = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-4xl sm:text-5xl",
} as const;

export type WordmarkSize = keyof typeof MARK_SIZES;

/**
 * Marca del producto (`visual-identity`, "Nombre y marca del producto"): el
 * bloque de cursor que ya vive en el prompt de la consola, duplicado y
 * atenuado — un eco, una señal que vuelve más débil — seguido del nombre.
 *
 * El eco reutiliza el mismo color que el bloque sólido
 * (`--terminal-cursor`, que por defecto alía al acento del tema) en vez de
 * un valor fijo: lo que identifica la marca es la forma sólido + eco, no un
 * color concreto, así que sigue siendo reconocible en cualquier tema y en
 * ambos esquemas.
 */
export function Wordmark({
  size = "md",
  showText = true,
  className,
}: {
  size?: WordmarkSize;
  showText?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 font-mono font-semibold whitespace-nowrap",
        className
      )}
      role={showText ? undefined : "img"}
      aria-label={showText ? undefined : "dark echo"}
    >
      <span className={cn("relative inline-block", MARK_SIZES[size])} aria-hidden="true">
        <span className="absolute top-[0.26em] left-[0.32em] text-terminal-cursor opacity-40">
          ▋
        </span>
        <span className="relative text-terminal-cursor">▋</span>
      </span>
      {showText && (
        <span className={cn("tracking-tight text-foreground", TEXT_SIZES[size])}>dark echo</span>
      )}
    </span>
  );
}
