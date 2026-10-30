"use client";

import { useState } from "react";
import { intlLocale, translator, type Locale } from "@/lib/i18n";

// precios decididos 2026-10-30 (diario/Suscripción.md)
export const PRICE = { month: 3.99, year: 29.99 } as const;
type Period = keyof typeof PRICE;

/** Elegir anual o mensual y empezar la prueba de 1 mes. Todavía no cobra: el botón está desactivado y lo explica. */
export function PremiumPlans({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [period, setPeriod] = useState<Period>("year");
  const eur = (n: number) => n.toLocaleString(intlLocale(locale), { style: "currency", currency: "EUR" });
  const save = Math.round((1 - PRICE.year / (PRICE.month * 12)) * 100);
  const options: { id: Period; label: string; price: string; per: string; note?: string; badge?: string }[] = [
    { id: "year", label: t("prem.anual"), price: eur(PRICE.year), per: t("prem.porAno"), note: t("prem.equivale", { precio: eur(Math.floor((PRICE.year / 12) * 100) / 100) }), badge: t("prem.ahorra", { pct: save }) },
    { id: "month", label: t("prem.mensual"), price: eur(PRICE.month), per: t("prem.porMes") },
  ];
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label={t("nav.premium")} className="grid gap-2">
        {options.map((o) => {
          const on = period === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPeriod(o.id)}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${on ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-ink-2"}`}
            >
              <span className="flex items-center gap-3">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-accent" : "border-line"}`} aria-hidden>
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </span>
                <span>
                  <strong className="block">{o.label}</strong>
                  {o.note && <span className="text-xs text-ink-2">{o.note}</span>}
                </span>
              </span>
              <span className="text-right">
                {o.badge && <span className="mb-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">{o.badge}</span>}
                <span className="block tabular">
                  <strong className="text-lg">{o.price}</strong>
                  <span className="text-xs text-ink-2">{o.per}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="btn w-full py-3.5 text-base" disabled aria-describedby="prem-pronto">
        {t("prem.empezar")}
      </button>
      <p id="prem-pronto" className="text-center text-xs text-ink-2">
        {t("prem.pronto")}
      </p>
    </div>
  );
}
