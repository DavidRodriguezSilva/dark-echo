import type { OcclusionDeclaration } from "../occlusion";

/**
 * `techo-madera`: cubierta de tabla de pino de 20 mm
 * (docs/synthesis-reference.md, `transmision-masa` + `resonancia-placa`).
 *
 * Masa superficial 500 kg/m3 * 0.02 m = 10 kg/m2, de la que la ley de masas
 * deriva su atenuacion y su caracter apagado sin ningun ajuste adicional.
 *
 * Es tambien la barrera con la respuesta propia mas caracteristica del
 * catalogo (design.md D9): el pano entre cabios, de 0.6 x 3 m, resuena en la
 * banda grave-media al ser golpeado por la lluvia. El factor de perdida alto
 * de la madera (0.02, Q = 50) hace que cada impacto suene como un golpe seco
 * y no como un timbre sostenido -- la diferencia audible frente al vidrio,
 * que tiene frecuencias modales del mismo orden pero apenas se amortigua.
 */
export const techoMadera: OcclusionDeclaration = {
  id: "techo-madera",
  label: "Techo de madera",
  model: "transmision-masa",
  densityKgPerCubicMeter: 500,
  thicknessMeters: 0.02,
  requiredSurfaces: ["techo"],
  affinityTraits: ["construido", "rustico"],
  resonance: {
    model: "resonancia-placa",
    // Pano entre cabios: la luz corta la fija la separacion entre apoyos.
    geometry: { spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.02 },
    material: {
      // Modulo efectivo de pino: la madera es muy anisotropa (unos 10 GPa en
      // la direccion de la fibra frente a ~0.5 GPa en la transversal), asi
      // que se usa un valor efectivo intermedio para el pano completo.
      youngsModulusPa: 8e9,
      densityKgPerCubicMeter: 500,
      poissonRatio: 0.3,
      // Factor de perdida TOTAL de la tabla montada sobre cabios, no el del
      // pino a secas (~0.02): en un panel ligero que radia al aire, la
      // radiacion acustica y la disipacion en los apoyos pesan mas que el
      // amortiguamiento interno del material.
      lossFactor: 0.08,
    },
    // Solo la banda grave-media, donde los modos de este pano estan
    // realmente separados: es el "tamborileo" de la cubierta.
    modalBandHz: [40, 600],
    modeCount: 4,
    mix: 0.6,
  },
};

/**
 * `techo-madera-grueso`: la misma cubierta en tabla de 40 mm.
 *
 * Unica diferencia declarada frente a `techo-madera`: el espesor. Al doblar
 * la masa superficial, la ley de masas atenua 6 dB mas en toda la banda
 * audible, y el pano mas rigido sube sus frecuencias modales -- las dos
 * consecuencias salen de la fisica, no de una segunda tabla de valores. Es
 * el par que demuestra el requisito "Grado propio de atenuacion" de la
 * capacidad `ambient-occlusion`.
 */
export const techoMaderaGrueso: OcclusionDeclaration = {
  ...techoMadera,
  id: "techo-madera-grueso",
  label: "Techo de madera grueso",
  thicknessMeters: 0.04,
  resonance: {
    ...techoMadera.resonance!,
    geometry: { spanXMeters: 3, spanYMeters: 0.6, thicknessMeters: 0.04 },
  },
};
