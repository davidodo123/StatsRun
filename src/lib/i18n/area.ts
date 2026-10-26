// Textos de una zona de la app con sus cinco idiomas juntos (más fácil de mantener que un archivo por idioma).
// TypeScript obliga a que todos los idiomas tengan las mismas claves que el español.
export type AreaMessages<K extends string> = { es: Record<K, string>; en: Record<NoInfer<K>, string>; ca: Record<NoInfer<K>, string>; pt: Record<NoInfer<K>, string>; fr: Record<NoInfer<K>, string> };

export function area<K extends string>(m: AreaMessages<K>): AreaMessages<K> {
  return m;
}
