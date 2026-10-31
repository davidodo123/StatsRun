"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from "@/lib/i18n";

/** Idioma de este dispositivo (cookie rio_lang) para lo que se pinta sin el del servidor: error, aviso de girar… */
export function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    const c = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`))?.[1];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la cookie solo se lee en el navegador
    if (isLocale(c)) setLocale(c);
  }, []);
  return locale;
}
