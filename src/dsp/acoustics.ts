/**
 * Acustica de salas y de barreras (docs/synthesis-reference.md, modelos
 * `reverberacion-sabine`, `transmision-masa`, `resonancia-placa` y
 * `atenuacion-distancia`). Igual que `dsp/coefficients.ts`, aqui no se
 * declara ningun coeficiente ajustado a oido: cada funcion parte de
 * magnitudes fisicas medibles -- volumen en m3, superficie en m2, coeficiente
 * de absorcion adimensional, masa superficial en kg/m2, modulo de Young en
 * Pa -- y devuelve la magnitud acustica que se deriva de ellas.
 */

/** Banda de analisis: los modelos de entorno y barrera se declaran por banda, no como un valor unico. */
export type BandKey = "low" | "mid" | "high";

export const BAND_KEYS: readonly BandKey[] = ["low", "mid", "high"] as const;

/** Un valor por banda (p. ej. coeficiente de absorcion, tiempo de reverberacion). */
export type PerBand<T = number> = Record<BandKey, T>;

/**
 * Frecuencias de cruce entre las tres bandas de analisis, en Hz. Elegidas
 * sobre las bandas de octava estandar de la acustica arquitectonica, donde
 * los coeficientes de absorcion de materiales estan tabulados: la banda
 * `low` cubre hasta 250 Hz (octavas de 125 y 250), `mid` de 250 a 2000 Hz
 * (500 y 1000) y `high` por encima de 2000 Hz (2000 y 4000).
 */
export const BAND_CROSSOVER_HZ = { lowMid: 250, midHigh: 2000 } as const;

/**
 * Tiempo de reverberacion RT60 por la formula de Sabine:
 *
 *   RT60 = 0.161 * V / A,   con A = suma(S_i * alpha_i)
 *
 * `V` en m3, `A` en m2 sabin (metros cuadrados de absorcion equivalente).
 * La constante 0.161 s/m tiene unidades: procede de 24*ln(10)/c con c la
 * velocidad del sonido a temperatura ambiente (~343 m/s).
 *
 * Devuelve 0 cuando no hay absorcion declarada o el recinto no encierra
 * volumen (un espacio abierto no tiene cola reverberante que calcular).
 */
export function sabineReverbTimeSeconds(
  volumeCubicMeters: number,
  surfaceAreaSquareMeters: number,
  absorptionCoefficient: number
): number {
  const equivalentAbsorption = surfaceAreaSquareMeters * absorptionCoefficient;
  if (volumeCubicMeters <= 0 || equivalentAbsorption <= 0) return 0;
  return (0.161 * volumeCubicMeters) / equivalentAbsorption;
}

/** `sabineReverbTimeSeconds` aplicada a las tres bandas de analisis. */
export function sabineReverbTimePerBand(
  volumeCubicMeters: number,
  surfaceAreaSquareMeters: number,
  absorption: PerBand
): PerBand {
  return {
    low: sabineReverbTimeSeconds(volumeCubicMeters, surfaceAreaSquareMeters, absorption.low),
    mid: sabineReverbTimeSeconds(volumeCubicMeters, surfaceAreaSquareMeters, absorption.mid),
    high: sabineReverbTimeSeconds(volumeCubicMeters, surfaceAreaSquareMeters, absorption.high),
  };
}

/**
 * Constante de la ley de masas de incidencia de campo, en dB:
 *
 *   TL(f) = 20 * log10(m_s * f) - 47
 *
 * con `m_s` la masa superficial en kg/m2 y `f` en Hz. Los 47 dB son la
 * constante estandar para incidencia de campo (la version de incidencia
 * normal usa 48).
 */
const MASS_LAW_CONSTANT_DB = 47;

/** Perdida por transmision de una barrera homogenea a `frequencyHz`, en dB (ley de masas). */
export function massLawTransmissionLossDb(
  surfaceMassKgPerSquareMeter: number,
  frequencyHz: number
): number {
  if (surfaceMassKgPerSquareMeter <= 0 || frequencyHz <= 0) return 0;
  return 20 * Math.log10(surfaceMassKgPerSquareMeter * frequencyHz) - MASS_LAW_CONSTANT_DB;
}

/**
 * Frecuencia de corte del pasa-bajos de un polo equivalente a la ley de
 * masas de esa barrera, en Hz.
 *
 * La ley de masas cae 6 dB por octava en todo el rango audible, que es
 * exactamente la pendiente asintotica de un pasa-bajos de un polo por encima
 * de su corte. Igualando la ganancia lineal de ambos:
 *
 *   |H(f)| = 10^(-TL/20) = 10^(47/20) / (m_s * f)   y   |H(f)| ~= f_c / f
 *   =>  f_c = 10^(47/20) / m_s ~= 223.9 / m_s
 *
 * Es decir: la barrera *es* un pasa-bajos cuyo corte lo fija su masa
 * superficial. Una barrera del doble de masa corta una octava mas abajo, y
 * por tanto atenua 6 dB mas en toda la banda audible -- de ahi sale, sin
 * ningun ajuste adicional, la diferencia entre una variante delgada y una
 * gruesa del mismo material.
 */
export function massLawCutoffHz(surfaceMassKgPerSquareMeter: number): number {
  if (surfaceMassKgPerSquareMeter <= 0) return Number.POSITIVE_INFINITY;
  return Math.pow(10, MASS_LAW_CONSTANT_DB / 20) / surfaceMassKgPerSquareMeter;
}

/**
 * Frecuencia por debajo de la cual la ley de masas deja de ser valida, en Hz.
 *
 * La ley de masas describe la region *controlada por masa*. Por debajo de la
 * primera resonancia del pano manda la rigidez, no la masa, y la formula deja
 * de aplicar: extrapolada hacia el infrasonido predice una transmision
 * creciente sin limite, cuando ninguna barrera pasiva amplifica.
 *
 * Los panos de este catalogo tienen su primera resonancia entre 43 Hz (el
 * acristalamiento) y 110 Hz (la tabla de cubierta), y se toma 100 Hz como
 * suelo comun. Ademas de acotar la formula, ese valor evita un efecto
 * secundario medido sobre el render real: la ventaja de la ley de masas en
 * graves, aplicada sin suelo, amplificaba unos 26 dB una zona donde el
 * `Source` no tiene contenido modelado -- `impacto-gota` no describe nada por
 * debajo de 1 kHz, asi que lo que hay ahi es suelo de ruido de los
 * generadores --. Con el suelo en 50 Hz, la energia por debajo de 80 Hz
 * pasaba del 2% de la escena al 37-50%: la barrera convertia un residuo en la
 * mitad de la salida.
 */
export const MASS_LAW_VALIDITY_FLOOR_HZ = 100;

/**
 * Suelo de atenuacion por transmision indirecta (flanking), en dB.
 *
 * La ley de masas describe una barrera *aislada e infinita*. En una
 * construccion real el sonido tambien llega por caminos que la rodean --
 * uniones, forjado, carpinteria, rendijas -- y esos caminos ponen un limite
 * al aislamiento efectivo por mucho que la barrera mejore. Es un fenomeno
 * conocido y medido: es la razon por la que el aislamiento de campo de una
 * particion nunca alcanza el de laboratorio.
 *
 * Sin este suelo, la ley extrapolada hace que la barrera tienda al silencio
 * en agudos (-33 dB a 1 kHz, -45 dB a 4 kHz) y lo unico que sobrevive es la
 * banda mas grave: el resultado deja de sonar a "lluvia apagada" para sonar a
 * un retumbo sin identidad. Con el suelo, la lluvia sigue siendo reconocible
 * a bajo nivel, que es lo que de verdad se oye dentro de una casa.
 *
 * Es el valor **por defecto**, y cada `Occlusion` puede declarar el suyo,
 * porque el flanking describe la *instalacion*, no el material: una cubierta
 * de tabla gruesa pertenece a una construccion mas maciza y mejor sellada que
 * una de tabla fina. Tratarlo como una constante global fue un error medido:
 * con un unico suelo para todas, el camino indirecto dominaba siempre y las
 * propiedades de la propia barrera dejaban de importar -- una cubierta del
 * doble de masa sonaba 0.06 dB mas baja que la fina, es decir, igual.
 *
 * -12 dB corresponde a una construccion ligera con huecos (una cabana de
 * tabla, una fachada con ventana), donde el aislamiento aparente frente al
 * ruido exterior es del orden de 10-15 dB, muy lejos del valor de laboratorio
 * de la particion aislada. Un valor mucho mas severo (-24 dB) se probo
 * primero y resulto ser el motivo de que la oclusion "atenuara casi todo el
 * sonido" en la escucha.
 */
export const FLANKING_FLOOR_DB = -12;

export interface MassLawResponse {
  /** Corte del pasa-bajos equivalente, en Hz. */
  cutoffHz: number;
  /** Ganancia lineal de banda plana por debajo del corte. */
  gain: number;
  /**
   * Ganancia lineal del camino indirecto, plano en frecuencia: lo que rodea a
   * la barrera en lugar de atravesarla.
   */
  flankingGain: number;
}

/**
 * Respuesta de transmision de una barrera, acotada a la region donde la ley
 * de masas es valida.
 *
 * Por encima del suelo de validez reproduce la ley exactamente (6 dB/octava,
 * con el nivel absoluto que la ley predice); por debajo se aplana en lugar de
 * seguir subiendo. Es una caida monotona que **nunca amplifica**: la ganancia
 * maxima es la del propio suelo de validez.
 *
 * Sustituye a la version anterior, que colocaba el corte en `223.9 / m_s`
 * -- unos 22 Hz -- y compensaba con una ganancia constante de +33 dB para que
 * el resultado fuera audible. Aquello era equivalente en la banda de medios
 * pero anadia un realce enorme de graves por debajo de 50 Hz, hasta el punto
 * de dejar el pico espectral de toda la escena en 32 Hz.
 */
export function massLawResponse(
  surfaceMassKgPerSquareMeter: number,
  flankingFloorDb = FLANKING_FLOOR_DB,
  validityFloorHz = MASS_LAW_VALIDITY_FLOOR_HZ
): MassLawResponse {
  const lossDb = massLawTransmissionLossDb(surfaceMassKgPerSquareMeter, validityFloorHz);
  const directGain = Math.min(1, Math.pow(10, -lossDb / 20));
  return {
    cutoffHz: validityFloorHz,
    // Nunca por encima de la unidad: una barrera pasiva atenua o deja pasar,
    // no amplifica, por muy ligera que sea.
    gain: directGain,
    // Constante: el camino indirecto depende de como esta construido el
    // recinto, no de la barrera. Es un **suelo**, no un tope -- cuanto mejor
    // aisla la barrera, mas domina el flanking, y ese es justamente el
    // fenomeno: por encima de cierto punto, reforzar la barrera ya no mejora
    // el aislamiento porque el sonido la rodea. Los dos caminos van en
    // paralelo, asi que la suma se queda con el que mas deje pasar en cada
    // frecuencia sin necesidad de compararlos aqui.
    flankingGain: Math.pow(10, flankingFloorDb / 20),
  };
}

/** Masa superficial de una lamina homogenea, en kg/m2. */
export function surfaceMassKgPerSquareMeter(
  densityKgPerCubicMeter: number,
  thicknessMeters: number
): number {
  return densityKgPerCubicMeter * thicknessMeters;
}

/**
 * Velocidad caracteristica de flexion de una placa delgada, en m2/s:
 *
 *   c_B = h * sqrt(E / (12 * (1 - nu^2) * rho))
 *
 * Es el factor que multiplica al termino modal en la formula de frecuencias
 * propias de una placa rectangular simplemente apoyada.
 */
export function plateBendingFactor(
  youngsModulusPa: number,
  densityKgPerCubicMeter: number,
  poissonRatio: number,
  thicknessMeters: number
): number {
  const denominator = 12 * (1 - poissonRatio * poissonRatio) * densityKgPerCubicMeter;
  return thicknessMeters * Math.sqrt(youngsModulusPa / denominator);
}

export interface PlateGeometry {
  /** Lado mayor del pano entre apoyos, en m. */
  spanXMeters: number;
  /** Lado menor del pano entre apoyos, en m. */
  spanYMeters: number;
  /** Espesor de la placa, en m. */
  thicknessMeters: number;
}

export interface PlateMaterial {
  youngsModulusPa: number;
  densityKgPerCubicMeter: number;
  poissonRatio: number;
  /**
   * Factor de perdida **total de la placa instalada** (adimensional):
   * Q = 1 / eta.
   *
   * Es el factor total, no el del material a secas. Una placa montada y
   * radiando al aire pierde energia por tres vias -- amortiguamiento interno
   * del material, radiacion acustica y disipacion en los apoyos -- y para un
   * panel ligero las dos ultimas dominan sobre la primera. Usar solo el
   * amortiguamiento del material da un Q un orden de magnitud demasiado
   * alto, y con el la placa deja de sonar a placa golpeada para sonar a
   * zumbido sostenido (ver docs/synthesis-reference.md, `resonancia-placa`,
   * "Alternativas consideradas").
   */
  lossFactor: number;
}

export interface PlateMode {
  frequencyHz: number;
  /** Factor de calidad del modo, derivado del factor de perdida total. */
  q: number;
}

/**
 * Frecuencias propias de una placa rectangular delgada simplemente apoyada:
 *
 *   f_mn = (pi / 2) * c_B * [ (m / Lx)^2 + (n / Ly)^2 ]
 *
 * El `Q` de cada modo se deriva del factor de perdida total de la placa
 * instalada (Q = 1/eta), no se ajusta: es la razon por la que un vidrio
 * enmarcado se sostiene bastante mas que una tabla sobre cabios, aunque sus
 * frecuencias modales sean del mismo orden.
 *
 * **Los modos devueltos se reparten por el rango audible, no son los
 * `modeCount` mas graves.** La serie modal de una placa arranca muy apretada
 * -- los seis primeros modos de un pano de cubierta caben en menos de una
 * octava -- y quedarse con ese grupo produce un cumulo de resonancias vecinas
 * que, excitadas sin pausa, zumban como una sola en vez de dar el color de la
 * placa. Repartirlos en escala logaritmica hace que el banco represente la
 * respuesta de la placa **en toda la banda**, que es lo que hace un panel
 * real, cuyos modos siguen mucho mas alla de los seis primeros.
 *
 * `qBounds` acota el Q resultante por implementacion, no por fisica: un `Q`
 * alto en un biquad de precision simple a frecuencia baja es numericamente
 * delicado, y ademas un banco discreto no debe sonar mas resonante que la
 * placa continua que aproxima.
 */
export function plateModes(
  geometry: PlateGeometry,
  material: PlateMaterial,
  modeCount: number,
  audibleRangeHz: [number, number] = [40, 8000],
  qBounds: [number, number] = [4, 20]
): PlateMode[] {
  const bending = plateBendingFactor(
    material.youngsModulusPa,
    material.densityKgPerCubicMeter,
    material.poissonRatio,
    geometry.thicknessMeters
  );

  const q = Math.min(qBounds[1], Math.max(qBounds[0], 1 / material.lossFactor));
  const [minHz, maxHz] = audibleRangeHz;

  // Se exploran los primeros ordenes en ambas direcciones y se descartan los
  // que caen fuera del rango audible. El orden maximo es alto a proposito: la
  // seleccion posterior necesita candidatos repartidos por toda la banda, no
  // solo el cumulo inicial de la serie.
  const MAX_ORDER = 40;
  const candidates: number[] = [];
  for (let m = 1; m <= MAX_ORDER; m++) {
    for (let n = 1; n <= MAX_ORDER; n++) {
      const frequencyHz =
        (Math.PI / 2) *
        bending *
        ((m / geometry.spanXMeters) ** 2 + (n / geometry.spanYMeters) ** 2);
      if (frequencyHz < minHz || frequencyHz > maxHz) continue;
      candidates.push(frequencyHz);
    }
  }

  if (candidates.length === 0) return [];
  candidates.sort((a, b) => a - b);
  if (candidates.length <= modeCount) {
    return candidates.map((frequencyHz) => ({ frequencyHz, q }));
  }

  // Reparto logaritmico: se recorre la banda entre el modo mas grave y el mas
  // agudo en pasos iguales de octava, y en cada paso se toma el modo real mas
  // proximo. Los modos siguen siendo los que la placa tiene de verdad -- no se
  // inventa ninguna frecuencia -- pero el banco cubre la banda en lugar de
  // amontonarse donde la serie modal arranca mas densa.
  const lowest = candidates[0];
  const highest = candidates[candidates.length - 1];
  const selected: PlateMode[] = [];
  const used = new Set<number>();

  for (let step = 0; step < modeCount; step++) {
    const fraction = modeCount === 1 ? 0 : step / (modeCount - 1);
    const target = lowest * Math.pow(highest / lowest, fraction);

    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      const distance = Math.abs(Math.log2(candidates[i] / target));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    used.add(bestIndex);
    selected.push({ frequencyHz: candidates[bestIndex], q });
  }

  return selected.sort((a, b) => a.frequencyHz - b.frequencyHz);
}

/**
 * Atenuacion por distancia en campo libre (ley del inverso del cuadrado):
 * -6 dB por cada duplicacion de la distancia, referida a `referenceMeters`.
 * Devuelve una ganancia lineal, no dB.
 */
export function distanceGain(distanceMeters: number, referenceMeters = 1): number {
  if (distanceMeters <= 0) return 1;
  return referenceMeters / Math.max(distanceMeters, referenceMeters);
}

/**
 * Coeficiente de absorcion atmosferica de las frecuencias altas, en dB por
 * metro, a 20 C y 50% de humedad relativa (orden de magnitud de la norma
 * ISO 9613-1). La absorcion crece aproximadamente con el cuadrado de la
 * frecuencia, por lo que a distancia solo sobrevive la parte grave del
 * espectro -- que es lo que hace que una fuente lejana suene apagada y no
 * solo mas floja.
 */
export function airAbsorptionDbPerMeter(frequencyHz: number): number {
  const kHz = frequencyHz / 1000;
  return 0.0025 * kHz * kHz;
}

/**
 * Frecuencia por encima de la cual la absorcion atmosferica supera
 * `budgetDb` tras recorrer `distanceMeters`. Es la frecuencia de corte del
 * pasa-bajos que representa esa absorcion: la distancia se oye como una
 * combinacion de menos nivel y menos brillo, no solo de menos nivel.
 */
export function airAbsorptionCutoffHz(distanceMeters: number, budgetDb = 3): number {
  if (distanceMeters <= 0) return Number.POSITIVE_INFINITY;
  // budgetDb = 0.0025 * (f/1000)^2 * d  =>  f = 1000 * sqrt(budgetDb / (0.0025 * d))
  return 1000 * Math.sqrt(budgetDb / (0.0025 * distanceMeters));
}
