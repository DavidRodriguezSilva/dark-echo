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

function sortedRecordEntries<T>(record: Record<string, T> | undefined): [string, T][] {
  return Object.entries(record ?? {}).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Compara dos escenas por su contenido, no por identidad de objeto
 * (`update-interface-design`, design.md D9): distingue una escena guardada
 * de una con cambios sin guardar comparando la composición activa con la
 * escena de la que se cargó. El orden de las claves de `layers` y
 * `modifiers` no importa — solo sus valores.
 */
export function sameScene(a: Scene, b: Scene): boolean {
  const layersA = sortedRecordEntries(a.layers);
  const layersB = sortedRecordEntries(b.layers);
  if (layersA.length !== layersB.length) return false;
  if (
    layersA.some(([key, value], index) => layersB[index][0] !== key || layersB[index][1] !== value)
  )
    return false;

  if ((a.environment ?? null) !== (b.environment ?? null)) return false;
  if ((a.occlusion ?? null) !== (b.occlusion ?? null)) return false;

  const modifiersA = sortedRecordEntries(a.modifiers);
  const modifiersB = sortedRecordEntries(b.modifiers);
  if (modifiersA.length !== modifiersB.length) return false;
  return !modifiersA.some(
    ([key, value], index) =>
      modifiersB[index][0] !== key ||
      modifiersB[index][1].id !== value.id ||
      modifiersB[index][1].meters !== value.meters
  );
}
