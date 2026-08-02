import type { EnvironmentDeclaration } from "../environment";

/**
 * `casa`: habitacion de obra, paredes de concreto (docs/synthesis-reference.md,
 * `reverberacion-sabine`). Geometria de 5 x 6 x 2.7 m: V = 81 m3, superficie
 * interior 2*(5*6) + 2*(5*2.7) + 2*(6*2.7) = 119.4 m2.
 *
 * Coeficientes de concreto pintado con el aporte del mobiliario. El concreto
 * absorbe mucho menos que la madera en todas las bandas, asi que con un
 * volumen solo un 35% mayor el RT60 casi se duplica: la casa es un recinto
 * vivo y con cola, frente a la cabana, que es corta y seca. Esa es la
 * diferencia audible entre ambos entornos, y sale de los coeficientes
 * tabulados, no de un ajuste.
 */
export const casa: EnvironmentDeclaration = {
  id: "casa",
  label: "Casa de concreto",
  model: "reverberacion-sabine",
  volumeCubicMeters: 81,
  surfaceAreaSquareMeters: 119.4,
  absorption: { low: 0.14, mid: 0.1, high: 0.12 },
  reverberantFraction: 0.7,
  surfaces: ["techo", "pared", "abertura", "suelo"],
  traits: ["construido", "urbano"],
};
