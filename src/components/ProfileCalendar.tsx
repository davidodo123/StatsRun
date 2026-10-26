"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "./icons";
import { intlLocale, translator, weekdayDate, weekdayInitials, type Locale } from "@/lib/i18n";

export interface CalendarDay {
  acts: { id: string; name: string; sport: string; km: number; min: number }[];
  plan: { id: string; title: string; km: number; min: number; strength: boolean; pending: boolean }[];
}

const SPORT_ICON: Record<string, IconName> = { run: "run", ride: "bike", swim: "swim", walk: "walk", strength: "dumbbell" };
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Calendario del mes: verde lo hecho, contorno lo que queda del plan. Al tocar un día se ven sus sesiones. */
export function ProfileCalendar({ days, today, locale }: { days: Record<string, CalendarDay>; today: string; locale: Locale }) {
  const t = translator(locale);
  const [month, setMonth] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [sel, setSel] = useState(today);
  const first = new Date(Date.UTC(month.y, month.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // huecos antes del día 1 (la semana empieza en lunes)
  const count = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const go = (d: number) => setMonth(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const raw = first.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });
  const title = raw.charAt(0).toUpperCase() + raw.slice(1); // «Octubre de 2026», no «Octubre De 2026»
  const day = days[sel];
  const nf = intlLocale(locale);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">{t("cal.titulo")}</h2>
          <p className="mt-0.5 text-sm font-semibold">{title}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => go(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-accent" aria-label={t("cal.anterior")}>
            <Icon name="chevron" className="h-4 w-4 rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-accent" aria-label={t("cal.siguiente")}>
            <Icon name="chevron" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {weekdayInitials(locale).map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`h${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = iso(month.y, month.m, i + 1);
          const d = days[date];
          const done = Boolean(d?.acts.length);
          const pending = !done && Boolean(d?.plan.some((p) => p.pending));
          // sesión del plan que pasó sin hacerse: puntito rojo
          const missed = Boolean(d?.plan.some((p) => !p.pending));
          const selected = date === sel;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSel(date)}
              aria-pressed={selected}
              aria-label={weekdayDate(date, locale)}
              className={`relative grid aspect-square place-items-center rounded-full text-sm tabular transition ${
                done ? "bg-accent font-bold text-accent-ink" : pending ? "border border-accent text-ink" : "text-ink-2 hover:bg-surface-2"
              } ${selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""} ${date === today && !done ? "font-bold text-accent" : ""}`}
            >
              {i + 1}
              {missed && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-critical" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-accent" /> {t("cal.hecho")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-accent" /> {t("cal.porHacer")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-critical" /> {t("cal.noHecho")}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-line p-3 text-sm">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
          {sel === today ? `${t("cal.hoy")} · ` : ""}
          {weekdayDate(sel, locale)}
        </p>
        {day && (day.acts.length > 0 || day.plan.length > 0) ? (
          <ul className="mt-2 space-y-2">
            {day.acts.map((a) => (
              <li key={a.id}>
                <Link href={`/actividad/${encodeURIComponent(a.id)}`} className="flex items-center gap-3 hover:text-accent">
                  <Icon name={SPORT_ICON[a.sport] ?? "bolt"} className="h-5 w-5 text-accent" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">{a.name}</strong>
                    <span className="text-xs text-ink-2 tabular">
                      {a.km > 0 && `${a.km.toLocaleString(nf, { maximumFractionDigits: 2 })} km · `}
                      {a.min} min
                    </span>
                  </span>
                  <span className="text-xs text-good-ink">{t("cal.hecho")}</span>
                </Link>
              </li>
            ))}
            {day.plan.map((p) => (
              <li key={p.id}>
                <Link href="/plan/actual" className="flex items-center gap-3 hover:text-accent">
                  <Icon name={p.strength ? "dumbbell" : "run"} className="h-5 w-5 text-muted" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">{p.title}</strong>
                    <span className="text-xs text-ink-2 tabular">
                      {p.km > 0 && `${p.km.toLocaleString(nf)} km · `}~{p.min} min
                    </span>
                  </span>
                  <span className={`text-xs ${p.pending ? "text-accent" : "text-critical"}`}>{p.pending ? t("cal.porHacer") : t("cal.noHecho")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-ink-2">{t("cal.nada")}</p>
        )}
      </div>
    </section>
  );
}
