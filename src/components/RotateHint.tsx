"use client";

import { translator } from "@/lib/i18n";
import { useClientLocale } from "./useClientLocale";

/** El iPhone no deja bloquear el giro en la app instalada: en horizontal se pide volver a vertical (globals.css .rotate-hint). */
export function RotateHint() {
  const t = translator(useClientLocale());
  return (
    <div className="rotate-hint" role="alert">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
      <p>{t("sis.girar")}</p>
    </div>
  );
}
