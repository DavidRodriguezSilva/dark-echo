/**
 * Modelo de escena (session-persistence, "Gestion de escenas sonoras"): la
 * composicion de una mezcla, como datos puros — que capas suenan y a que
 * volumen, indexadas por su id compuesto `"<ambiente>.<capa>"` (ver
 * `audio/ambientMixer.ts`). El volumen maestro es una preferencia aparte
 * (`platform/config.ts`), no parte de la escena: la especificacion solo
 * exige reproducir "las mismas capas con los mismos volumenes [por capa]".
 */
export interface Scene {
  layers: Record<string, number>;
}
