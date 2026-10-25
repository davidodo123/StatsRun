import "server-only";
import { cookies } from "next/headers";
import { getDb } from "../db";
import { viewCache } from "../session";
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, translator, type Locale } from "./index";

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
