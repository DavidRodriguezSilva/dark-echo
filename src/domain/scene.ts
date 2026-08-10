/**
 * Modelo de escena (session-persistence, "Gestion de escenas sonoras"): la
 * composicion completa, como datos puros.
 *
 * Las capas se indexan por su id compuesto `"<ambiente>.<capa>"`. Ese id es el
 * mismo que usaba el motor de ambientes retirado, y no por casualidad: el
 * motor de composicion reutiliza las mismas declaraciones de
 * `domain/ambients/`, asi que una escena guardada con el motor anterior es
 * literalmente una escena de este sin componentes de escena. De ahi que los
 * tres campos nuevos sean opcionales — leerlos ausentes **es** el formato v1
 * (change `retire-legacy-engine`, design.md D2).
 *
 * El volumen maestro es una preferencia aparte (`platform/config.ts`), no
 * parte de la escena: la especificacion solo exige reproducir "las mismas
 * capas con los mismos volumenes [por capa]".
 */

/** Un `Modifier` activo sobre un `Source`, con su valor vigente. */
export interface SceneModifier {
  id: string;
  meters: number;
}

export interface Scene {
  layers: Record<string, number>;
  /** Recinto de la escena; ausente o `null` significa ninguno. */
  environment?: string | null;
  /** Barrera de la escena; ausente o `null` significa ninguna. */
  occlusion?: string | null;
  /** `Modifiers` por `Source`, indexados por el id del `Source`. */
  modifiers?: Record<string, SceneModifier>;
}
