/**
 * Preferencia del sistema por movimiento reducido (`command-console`,
 * "Identidad visual de terminal"; `visual-identity`, "Pantalla de arranque y
 * transición entre modos"): una sola forma de consultarla, compartida por la
 * introducción progresiva de la consola y la transición entre modos.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
