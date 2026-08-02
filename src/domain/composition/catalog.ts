import type { EnvironmentDeclaration } from "./environment";
import type { ModifierDeclaration } from "./modifier";
import type { OcclusionDeclaration } from "./occlusion";
import { cabana } from "./environments/cabana";
import { casa } from "./environments/casa";
import { campoAbierto } from "./environments/campoAbierto";
import { techoMadera, techoMaderaGrueso } from "./occlusions/techoMadera";
import { ventanaVidrio } from "./occlusions/ventanaVidrio";
import { distancia } from "./modifiers/distancia";

/**
 * Catalogo del motor de composicion: unica fuente de verdad de los
 * componentes disponibles, igual que `domain/catalog.ts` lo es del catalogo
 * de ambientes del motor actual. Los argumentos validos de los comandos
 * `compose environment/occlusion/modifier` se derivan de aqui, nunca se
 * declaran por separado.
 */

const ENVIRONMENTS: EnvironmentDeclaration[] = [cabana, casa, campoAbierto];
const OCCLUSIONS: OcclusionDeclaration[] = [techoMadera, techoMaderaGrueso, ventanaVidrio];
const MODIFIERS: ModifierDeclaration[] = [distancia];

export function listEnvironments(): { id: string; label: string }[] {
  return ENVIRONMENTS.map(({ id, label }) => ({ id, label }));
}

export function findEnvironment(id: string): EnvironmentDeclaration | undefined {
  return ENVIRONMENTS.find((environment) => environment.id === id);
}

export function listOcclusions(): { id: string; label: string }[] {
  return OCCLUSIONS.map(({ id, label }) => ({ id, label }));
}

export function findOcclusion(id: string): OcclusionDeclaration | undefined {
  return OCCLUSIONS.find((occlusion) => occlusion.id === id);
}

export function listModifiers(): { id: string; label: string }[] {
  return MODIFIERS.map(({ id, label }) => ({ id, label }));
}

export function findModifier(id: string): ModifierDeclaration | undefined {
  return MODIFIERS.find((modifier) => modifier.id === id);
}
