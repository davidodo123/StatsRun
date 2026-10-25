// Idiomas de la app. El español es el original: sus claves mandan y los demás tienen que traducirlas todas
// (TypeScript avisa si falta alguna). Funciona igual en el servidor y en el navegador: el idioma llega como prop.
import { es } from "./es";
import { en } from "./en";
import { ca } from "./ca";
import { pt } from "./pt";
import { fr } from "./fr";

export const LOCALES = ["es", "en", "ca", "pt", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
/** Cookie con el idioma elegido en este dispositivo (además se guarda en la cuenta). */
export const LANG_COOKIE = "rio_lang";

/** Cada idioma con su nombre en ese idioma (así se reconoce en el selector). */
export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English", ca: "Català", pt: "Português", fr: "Français" };
// para Intl (fechas y números)
const INTL: Record<Locale, string> = { es: "es-ES", en: "en-GB", ca: "ca-ES", pt: "pt-PT", fr: "fr-FR" };

export type Key = keyof typeof es;
export type Dict = Record<Key, string>;
const DICTS: Record<Locale, Dict> = { es, en, ca, pt, fr };

export const isLocale = (x: unknown): x is Locale => typeof x === "string" && (LOCALES as readonly string[]).includes(x);

/** Traductor: t("nav.inicio"), t("inicio.hola", { nombre: "David" }) sustituye {nombre}. */
export function translator(locale: Locale) {
  const d = DICTS[locale] ?? es;
  return (key: Key, vars?: Record<string, string | number>) => {
    let s = d[key] ?? es[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
export type T = ReturnType<typeof translator>;

/** «domingo 25 oct» en el idioma (la fecha va en AAAA-MM-DD). */
export function weekdayDate(date: string, locale: Locale): string {
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = d.toLocaleDateString(INTL[locale], { weekday: "long", timeZone: "UTC" });
  return `${weekday} ${dayMonth(date, locale)}`;
}

/** «25 oct» / «25 Oct» en el idioma. */
export function dayMonth(date: string, locale: Locale): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(INTL[locale], { day: "numeric", month: "short", timeZone: "UTC" }).replace(/\.$/, "");
}

/** Nombre corto del día de la semana (0 = lunes): «L», «M»… en español; «M», «T»… en inglés. */
export function weekdayInitials(locale: Locale): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(INTL[locale], { weekday: "narrow", timeZone: "UTC" }).toUpperCase(),
  );
}
