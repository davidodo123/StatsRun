"use client";

import { useTransition } from "react";
import { setLanguage } from "@/app/lang-actions";
import { LOCALES, LOCALE_NAMES, translator, type Locale } from "@/lib/i18n";

/** Selector de idioma (Perfil → Editar perfil): se guarda al elegir, sin botón. */
export function LanguageSelect({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 md:p-5" aria-labelledby="idioma">
      <h2 id="idioma" className="text-xs font-bold tracking-widest text-ink-2 uppercase">
        {t("idioma.titulo")}
      </h2>
      <p className="mt-1 text-sm text-ink-2">{t("idioma.texto")}</p>
      <select
        className="input mt-3 w-full max-w-xs"
        aria-label={t("idioma.titulo")}
        defaultValue={locale}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("lang", e.target.value);
          start(() => setLanguage(fd));
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      {locale !== "es" && <p className="mt-2 text-xs text-muted">{t("idioma.aviso")}</p>}
    </section>
  );
}
