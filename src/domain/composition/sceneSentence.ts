import { listAmbients } from "../catalog";
import { findEnvironment, findModifier, findOcclusion } from "./catalog";

/**
 * Lectura de la escena en lenguaje natural (`command-console`, "Lectura de
 * la escena en lenguaje natural"): una sola frase, compartida por el
 * encabezado del modo visual, la barra de reproducción en curso y `status`
 * de la consola, que dice qué suena y, a continuación, cómo suena — en el
 * orden en que la señal atraviesa la cadena: sonidos → distancia → barrera →
 * recinto (design.md D5).
 *
 * Función pura: no depende de `audio/`, `commands/`, `platform/` ni `ui/`,
 * y todas las etiquetas se leen de los catálogos declarados, nunca se
 * escriben a mano — así la frase no puede desincronizarse de lo que el
 * catálogo declara ni de lo que realmente suena.
 */

export interface SceneSentenceSource {
  id: string;
  modifier: { id: string; distanceMeters: number } | null;
}

export interface SceneSentenceInput {
  sources: SceneSentenceSource[];
  environmentId: string | null;
  occlusionId: string | null;
}

const SILENCE = "Silencio.";
const SILENCE_WITH_INVITATION = "Silencio. Elige un sonido para empezar.";

/** Con más de este número de `Source`, la enumeración se abrevia (design.md D5, riesgo). */
const MAX_NAMED_SOURCES = 3;

function ambientLabel(id: string): string {
  return (listAmbients().find((ambient) => ambient.id === id)?.label ?? id).toLowerCase();
}

/**
 * Enumeración a la española: "a", "a y b", "a, b y c". Con más elementos que
 * `MAX_NAMED_SOURCES`, quien construye `items` ya sustituyó el resto por un
 * último elemento del tipo "y N más" (ver `sourcesClause`).
 */
function joinSpanish(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function sourcesClause(sources: SceneSentenceSource[]): string {
  const labels = sources.map((source) => ambientLabel(source.id));
  if (labels.length <= MAX_NAMED_SOURCES) return joinSpanish(labels);

  const named = labels.slice(0, MAX_NAMED_SOURCES);
  const remaining = labels.length - MAX_NAMED_SOURCES;
  return joinSpanish([...named, `${remaining} más`]);
}

/**
 * Cláusula de "cómo suena" para los `Modifiers` activos. Se lee de
 * `findModifier` en vez de asumir que "distancia" es el único tipo posible,
 * de modo que un `Modifier` futuro de otro tipo no quede sin frase.
 */
function modifierClauses(sources: SceneSentenceSource[]): string | null {
  const modified = sources.filter(
    (
      source
    ): source is SceneSentenceSource & { modifier: NonNullable<SceneSentenceSource["modifier"]> } =>
      source.modifier !== null
  );
  if (modified.length === 0) return null;

  const phraseFor = (source: (typeof modified)[number]): string => {
    const declaration = findModifier(source.modifier.id);
    if (declaration?.kind === "distance") return `a ${source.modifier.distanceMeters} metros`;
    return declaration
      ? declaration.label.toLowerCase()
      : `a ${source.modifier.distanceMeters} metros`;
  };

  if (modified.length === 1) return phraseFor(modified[0]);

  const allEqual = modified.every((source) => phraseFor(source) === phraseFor(modified[0]));
  if (allEqual) return phraseFor(modified[0]);

  return joinSpanish(modified.map((source) => `${ambientLabel(source.id)} ${phraseFor(source)}`));
}

function occlusionClause(occlusionId: string | null): string | null {
  if (!occlusionId) return null;
  const declaration = findOcclusion(occlusionId);
  if (!declaration) return null;
  return `tras ${indefiniteArticle(declaration.label)} ${declaration.label.toLowerCase()}`;
}

function environmentClause(environmentId: string | null): string | null {
  if (!environmentId) return null;
  const declaration = findEnvironment(environmentId);
  if (!declaration) return null;
  return `dentro de ${indefiniteArticle(declaration.label)} ${declaration.label.toLowerCase()}`;
}

/**
 * Heurística de género gramatical para el artículo indefinido: mira la
 * terminación de la primera palabra de la etiqueta declarada ("Techo" → un,
 * "Ventana" → una), en vez de un mapa manual por identificador de catálogo.
 * Cubre el catálogo actual en su totalidad; por defecto resuelve a
 * masculino, que es la opción menos frecuente en fallar de forma audible.
 */
function indefiniteArticle(label: string): "un" | "una" {
  const firstWord = label.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return firstWord.endsWith("a") ? "una" : "un";
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/** La lectura completa de la escena, para el modo visual y para `status`. */
export function sceneSentence(scene: SceneSentenceInput): string {
  if (scene.sources.length === 0) return SILENCE_WITH_INVITATION;

  const clauses = [
    modifierClauses(scene.sources),
    occlusionClause(scene.occlusionId),
    environmentClause(scene.environmentId),
  ].filter((clause): clause is string => clause !== null);

  const sentence =
    clauses.length > 0
      ? `${sourcesClause(scene.sources)}, ${clauses.join(", ")}.`
      : `${sourcesClause(scene.sources)}.`;

  return capitalize(sentence);
}

/**
 * Variante corta para la barra de reproducción en curso: solo "qué suena",
 * sin las cláusulas de "cómo suena" — el recorte por ancho disponible lo
 * resuelve la propia barra con CSS, no esta función (design.md D7).
 */
export function sceneSentenceShort(scene: SceneSentenceInput): string {
  if (scene.sources.length === 0) return SILENCE;
  return `${capitalize(sourcesClause(scene.sources))}.`;
}
