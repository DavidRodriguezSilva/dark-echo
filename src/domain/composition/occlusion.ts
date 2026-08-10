import type { PlateGeometry, PlateMaterial } from "../../dsp/acoustics";
import type { EnvironmentTrait, StructuralSurface } from "./environment";

/**
 * Declaracion de una `Occlusion` (capacidad `ambient-occlusion`): la barrera
 * compartida de escena entre el oyente y el `Source`. Declara dos cosas
 * distintas, que el runtime compila como dos caminos paralelos:
 *
 * 1. **Transmision**: cuanto atenua y filtra lo que la atraviesa, derivado de
 *    su masa superficial por la ley de masas (`transmision-masa`).
 * 2. **Respuesta propia**: como suena la propia barrera al ser excitada por
 *    el `Source` que incide sobre ella -- la lluvia repiqueteando sobre un
 *    techo (design.md D9, modelo `resonancia-placa`). Opcional: una barrera
 *    puede limitarse a atenuar.
 */

export interface OcclusionResonance {
  /** Identificador del modelo en docs/synthesis-reference.md. */
  model: string;
  geometry: PlateGeometry;
  material: PlateMaterial;
  /**
   * Banda, en Hz, dentro de la cual los modos de la placa se compilan como
   * resonadores discretos.
   *
   * No cubre todo el rango audible a proposito. La densidad modal de una
   * placa crece con la frecuencia: por debajo de unos cientos de Hz los modos
   * estan bien separados y se oyen como resonancias propias, pero por encima
   * se solapan por decenas y su suma es una respuesta *suave*, no una serie
   * de picos. Representar esa zona con un punado de resonadores discretos no
   * es una simplificacion inofensiva -- introduce tonos que la placa real no
   * tiene, y con excitacion continua se oyen como un silbido. Por encima de
   * esta banda, el color de la barrera lo aporta el camino de transmision,
   * que ya es suave por construccion.
   */
  modalBandHz: [number, number];
  /** Cuantos modos propios se compilan; acota el coste del banco resonante. */
  modeCount: number;
  /**
   * Nivel de la respuesta propia frente a la senal transmitida, en [0, 1].
   * Es una decision de mezcla, no una magnitud fisica: la fisica fija *que*
   * frecuencias suenan y cuanto duran (geometria y material), no cuanto pesa
   * ese camino en la escucha final.
   */
  mix: number;
}

export interface OcclusionDeclaration {
  id: string;
  label: string;
  /** Identificador del modelo de transmision en docs/synthesis-reference.md. */
  model: string;
  /** Densidad del material de la barrera, en kg/m3. */
  densityKgPerCubicMeter: number;
  /** Espesor de la barrera, en m. La variante gruesa del mismo material solo cambia esto. */
  thicknessMeters: number;
  /**
   * Suelo de aislamiento por transmision indirecta de *esta instalacion*, en
   * dB negativos (ver `FLANKING_FLOOR_DB`). Opcional: por defecto, el de una
   * construccion ligera.
   *
   * Se declara por barrera y no globalmente porque describe como esta puesta,
   * no de que esta hecha: una cubierta maciza pertenece a una construccion
   * mejor sellada. Con un suelo unico para todo el catalogo, el camino
   * indirecto dominaba siempre y el espesor de la barrera dejaba de oirse.
   */
  flankingFloorDb?: number;
  /**
   * Superficies que el `Environment` activo debe contener para que esta
   * barrera tenga sentido posicional (design.md D6): un techo necesita que el
   * entorno tenga techo, no que sea del mismo material que el techo.
   */
  requiredSurfaces: StructuralSurface[];
  /** Rasgos con los que esta barrera es tipica; termino blando de la afinidad. */
  affinityTraits: EnvironmentTrait[];
  /** Respuesta sonora propia de la barrera, si la tiene (design.md D9). */
  resonance?: OcclusionResonance;
}
