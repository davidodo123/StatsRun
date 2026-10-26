import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader, Pill } from "@/components/ui";
import { getDb } from "@/lib/db";
import { planCompliance } from "@/lib/engine/planner";
import { diffDays, mondayOf } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { dayMonth, intlLocale, type Key, type Locale, type T } from "@/lib/i18n";
import { viewToday } from "@/lib/analysis";
import { fmtDuration } from "@/lib/format";
import type { Phase, Plan } from "@/lib/types";
import { planTitle } from "@/lib/engine/planner";

export const metadata: Metadata = { title: "Planes" };

const PHASE_LABEL: Record<Phase, Key> = { base: "plan.fase.base", construccion: "plan.fase.construccion", especifico: "plan.fase.especifico", taper: "plan.fase.taper" };

export default function PlansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [db, today, { locale, t }] = await Promise.all([getDb(), viewToday(), getT()]);
  const plan = db.plan;
  const past = db.pastPlans ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("plan.planes")}
        action={
          <Link href="/carreras" className="btn">
            {t("plan.crearPlan")}
          </Link>
        }
      />

      {plan ? (
        <ActivePlan plan={plan} db={db} today={today} t={t} locale={locale} />
      ) : (
        <Link href="/carreras" className="block rounded-2xl border border-dashed border-line p-6 text-center transition hover:border-accent">
          <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
          </svg>
          <strong className="mt-2 block">{t("plan.ningunPlan")}</strong>
          <span className="mt-1 block text-sm text-ink-2">{t("plan.ningunPlanTexto")}</span>
        </Link>
      )}

      <p className="mt-6 text-sm text-muted">{t("plan.anteriores", { n: past.length })}</p>
      <div className="mt-2 space-y-2">
        {past.map((p) => {
          const c = planCompliance(p.plan, db.activities, today);
          return (
            <Link key={p.id} href={`/plan/anterior/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
              <span className="min-w-0">
                <strong className="block truncate">{planTitle(p.plan)}</strong>
                <span className="text-xs text-muted">
                  {dayMonth(p.plan.weeks[0]?.start ?? p.plan.createdAt.slice(0, 10), locale)} → {dayMonth(p.plan.goal.date, locale)} · {t("plan.semanas", { n: p.plan.weeks.length })}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm font-semibold">
                {c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"}
                <span className="block text-[11px] font-normal text-muted">{t("plan.cumplido")}</span>
              </span>
            </Link>
          );
        })}
        {!past.length && <p className="text-sm text-ink-2">{t("plan.sinAnteriores")}</p>}
      </div>
    </div>
  );
}

function ActivePlan({ plan, db, today, t, locale }: { plan: Plan; db: Awaited<ReturnType<typeof getDb>>; today: string; t: T; locale: Locale }) {
  const thisWeek = mondayOf(today);
  const idx = plan.weeks.findIndex((w) => w.start === thisWeek);
  const week = plan.weeks[idx];
  const total = plan.weeks.length;
  const notStarted = today < (plan.weeks[0]?.start ?? today);
  const done = week ? idx + 1 : notStarted ? 0 : total;
  const days = diffDays(plan.goal.date, today);
  const c = planCompliance(plan, db.activities, today);
  const race = plan.weeks.at(-1)?.sessions.find((s) => s.type === "race" && s.date === plan.goal.date);
  const totalKm = Math.round(plan.weeks.reduce((s, w) => s + w.targetKm, 0));

  return (
    <Link href="/plan/actual" className="group block rounded-2xl border border-line bg-surface p-5 transition hover:border-accent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Pill className="bg-accent text-accent-ink">{t("plan.enMarcha")}</Pill>
          <strong className="mt-2 block truncate text-xl">{planTitle(plan)}</strong>
          <span className="text-sm text-ink-2">
            {dayMonth(plan.goal.date, locale)} · {days > 0 ? t("plan.faltan", { n: days }) : days === 0 ? t("plan.esHoy") : t("plan.carreraHecha")} ·{" "}
            {plan.goal.distanceKm.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 })} km
            {plan.goal.targetTimeSec ? ` · ${t("plan.objetivoTiempo", { tiempo: fmtDuration(plan.goal.targetTimeSec) })}` : ""}
          </span>
        </div>
        <span className="shrink-0 text-sm font-semibold text-accent transition group-hover:translate-x-0.5">{t("plan.verPlan")}</span>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-ink-2">
          <span>
            {t("plan.deSemanas", { hechas: done, total })}
            {week
              ? ` · ${t(PHASE_LABEL[week.phase])}${week.recovery ? ` (${t("plan.descarga")})` : ""}`
              : notStarted
                ? ` · ${t("plan.empiezaEl", { fecha: dayMonth(plan.weeks[0].start, locale) })}`
                : ` · ${t("plan.terminado")}`}
          </span>
          <span className="tabular">{Math.round((done / Math.max(1, total)) * 100)} %</span>
        </div>
        <div className="flex h-2 gap-0.5" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={t("plan.avance")}>
          {plan.weeks.map((w, i) => (
            <span key={w.index} className={`flex-1 rounded-full ${i < done ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label={t("plan.cumplimiento")} value={c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"} sub={c.past ? t("plan.nSesiones", { n: c.past }) : t("plan.sinSesionesAun")} />
        <Mini label={t("plan.tiempoPrevisto")} value={race ? fmtDuration(race.durationMin * 60) : "–"} sub={t("plan.enCarrera")} />
        <Mini label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub={t("plan.alEmpezar")} />
        <Mini label={t("plan.kmPlan")} value={`${totalKm} km`} sub={t("plan.semanas", { n: total })} />
      </div>
    </Link>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="tabular text-lg font-bold">{value}</div>
      {sub && <div className="truncate text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
