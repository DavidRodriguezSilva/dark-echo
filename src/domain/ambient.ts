import type { LayerDeclaration } from "./layer";

/**
 * Un ambiente es una composicion declarativa de capas, cada una
 * direccionable de forma individual (procedural-ambiences, "El ambiente es
 * una composicion declarativa de capas"). Anadir un ambiente nuevo al
 * catalogo consiste en declarar este tipo, sin tocar el runtime de audio ni
 * la gramatica de comandos.
 */
export interface AmbientDeclaration {
  id: string;
  /** Descripcion breve para el listado del catalogo. */
  label: string;
  /** Capas, indexadas por un identificador propio del ambiente (p. ej. "cuerpo", "goteo"). */
  layers: Record<string, LayerDeclaration>;
}
