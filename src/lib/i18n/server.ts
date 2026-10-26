import "server-only";
import { cookies, headers } from "next/headers";
import { getDb } from "../db";
import { viewCache } from "../session";
import { DEFAULT_LOCALE, LANG_COOKIE, LOCALES, isLocale, translator, type Locale } from "./index";

/**
 * Idioma para pintar: el de la cookie de este dispositivo; si no hay, el guardado en la cuenta (otro dispositivo,
 * o tras iniciar sesión); si no, español. En la caché privada, como el resto de vistas.
 */
export async function viewLocale(): Promise<Locale> {
  "use cache: private";
  viewCache();
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLocale(c)) return c;
  try {
    const lang = (await getDb()).lang;
    if (isLocale(lang)) return lang;
  } catch {}
  return DEFAULT_LOCALE;
}

/** Idioma y traductor para un componente del servidor. */
export async function getT() {
  const locale = await viewLocale();
  return { locale, t: translator(locale) };
}

/** Sin sesión (pantallas de entrada): la cookie del idioma o, si no hay, el idioma del navegador. */
export async function loginLocale(): Promise<Locale> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLocale(c)) return c;
  // «en-GB,en;q=0.9,es;q=0.8» → el primero que tengamos
  const wanted = ((await headers()).get("accept-language") ?? "").split(",").map((p) => p.split(";")[0].trim().slice(0, 2).toLowerCase());
  return wanted.find((l): l is Locale => (LOCALES as readonly string[]).includes(l)) ?? DEFAULT_LOCALE;
}
