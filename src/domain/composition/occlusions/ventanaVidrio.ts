import type { OcclusionDeclaration } from "../occlusion";

/**
 * `ventana-vidrio`: acristalamiento simple de 4 mm
 * (docs/synthesis-reference.md, `transmision-masa` + `resonancia-placa`).
 *
 * Masa superficial 2500 kg/m3 * 0.004 m = 10 kg/m2 -- exactamente la misma
 * que la tabla de pino de 20 mm de `techo-madera`, y por tanto la misma
 * atenuacion por ley de masas. No es una coincidencia forzada: es la razon
 * conocida por la que un acristalamiento simple aisla tan poco como un panel
 * ligero de madera, y deja claro que el material por si mismo no determina
 * el aislamiento; lo hace la masa por unidad de superficie.
 *
 * Lo que si los distingue es la respuesta propia: el vidrio tiene un factor
 * de perdida diez veces menor (0.002 frente a 0.02), asi que sus modos se
 * sostienen mucho mas -- el vidrio tine, la madera golpea.
 *
 * Requiere una `abertura`, no una pared: la afinidad se evalua por presencia
 * estructural, y por eso este es el caso que sostiene la Decision D6 -- una
 * ventana en una casa de concreto es la combinacion mas realista posible
 * precisamente *porque* su material es distinto del muro que la rodea.
 */
export const ventanaVidrio: OcclusionDeclaration = {
  id: "ventana-vidrio",
  label: "Ventana de vidrio",
  model: "transmision-masa",
  densityKgPerCubicMeter: 2500,
  thicknessMeters: 0.004,
  // Una ventana es el hueco de la fachada: construccion ligera por definicion.
  flankingFloorDb: -12,
  requiredSurfaces: ["abertura"],
  affinityTraits: ["construido", "urbano", "rustico"],
  resonance: {
    model: "resonancia-placa",
    geometry: { spanXMeters: 1.2, spanYMeters: 0.8, thicknessMeters: 0.004 },
    material: {
      youngsModulusPa: 70e9,
      densityKgPerCubicMeter: 2500,
      poissonRatio: 0.22,
      // Factor de perdida TOTAL del vidrio enmarcado, no el del vidrio a
      // secas (~0.002): el marco y las juntas disipan mucho mas que el
      // material. Sigue siendo bastante menor que el de la madera montada
      // (0.08), que es lo que mantiene la diferencia audible entre ambos --
      // el vidrio se sostiene mas -- sin llegar al zumbido sostenido que
      // producia el factor del material puro.
      lossFactor: 0.03,
    },
    modalBandHz: [40, 600],
    modeCount: 8,
    // Mas bajo que el del techo: la lluvia incide de refilon sobre un plano
    // vertical, no perpendicular como sobre una cubierta, asi que la excita
    // bastante menos aunque el vidrio resuene con mas facilidad.
    mix: 0.025,
  },
};
