"use client";

import Link from "next/link";
import { useState } from "react";
import { PROFILE_TONE, type Race } from "@/lib/races";
import { intlLocale, translator, type Key, type Locale } from "@/lib/i18n";

const FILTERS = [
  { id: "all", test: () => true },
  { id: "42", test: (r: Race) => r.distanceKm > 40 },
  { id: "21", test: (r: Race) => r.distanceKm > 19 && r.distanceKm < 25 },
  { id: "10", test: (r: Race) => r.distanceKm === 10 },
  { id: "5", test: (r: Race) => r.distanceKm === 5 },
];

export function RaceList({ races, locale = "es" }: { races: Race[]; locale?: Locale }) {
  const t = translator(locale);
  const intl = intlLocale(locale);
  const monthName = (m: number) => new Date(Date.UTC(2024, m - 1, 1)).toLocaleDateString(intl, { month: "long", timeZone: "UTC" });
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const filter = FILTERS.find((x) => x.id === f)!;
  const shown = races.filter((r) => filter.test(r) && `${r.name} ${r.city} ${r.country}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            onClick={() => setF(x.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${f === x.id ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2 hover:bg-surface-2"}`}
          >
            {t(`car.f.${x.id}` as Key)}
          </button>
        ))}
        <input className="input ml-auto max-w-56" placeholder={t("car.buscar")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/carreras/personalizada" className="flex flex-col justify-center rounded-2xl border border-dashed border-line bg-surface p-4 text-center hover:bg-surface-2">
          <span className="text-2xl">＋</span>
          <span className="font-semibold">{t("car.otra")}</span>
          <span className="text-xs text-ink-2">{t("car.otraSub")}</span>
        </Link>
        {shown.map((r) => (
          <Link key={r.id} href={`/carreras/${r.id}`} className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`car.pais.${r.country}` as Key)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROFILE_TONE[r.profile]}`}>{t(`car.perfil.${r.profile}` as Key)}</span>
            </div>
            <h3 className="mt-2 font-semibold leading-snug group-hover:text-accent">{r.name}</h3>
            <p className="text-xs text-ink-2">
              {r.city} · {r.month ? monthName(r.month) : t("car.todoAno")}
            </p>
            <p className="mt-2 text-xs text-muted tabular">
              {r.distanceKm.toLocaleString(intl, { maximumFractionDigits: 3 })} km · +{r.elevationGainM} m · ~{r.temperatureC} °C
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
