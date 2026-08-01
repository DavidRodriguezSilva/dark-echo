/**
 * Registro de temas declarados (theming, "Selección de tema en caliente"):
 * el listado que expone la aplicación se deriva de aquí. Los valores de
 * los tokens en sí viven en `styles/tokens.css` — CSS y JS son sistemas
 * separados, así que este registro es la metadata (id, etiqueta) que
 * *debe* corresponder con los bloques `[data-theme="..."]` declarados
 * allí; `tokens.contrast.test.ts` verifica automáticamente que cada tema
 * de esta lista tiene su bloque CSS correspondiente.
 */
export interface ThemeDeclaration {
  id: string;
  label: string;
}

const THEMES: ThemeDeclaration[] = [
  { id: "default", label: "Predeterminado" },
  { id: "ambar", label: "Ámbar" },
];

export type Scheme = "dark" | "light";

export function listThemes(): ThemeDeclaration[] {
  return THEMES;
}

export function findTheme(id: string): ThemeDeclaration | undefined {
  return THEMES.find((theme) => theme.id === id);
}
