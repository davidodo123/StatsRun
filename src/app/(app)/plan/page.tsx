import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader, Pill } from "@/components/ui";
import { getDb } from "@/lib/db";
import { planCompliance } from "@/lib/engine/planner";
import { diffDays, mondayOf, shortDate, todayLocal } from "@/lib/dates";
import { fmtDuration } from "@/lib/format";
import type { Phase, Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Planes" };

const PHASE_LABEL: Record<Phase, string> = { base: "Base", construccion: "Construcción", especifico: "Específico", taper: "Afinado" };

export default function PlansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const db = await getDb();
  const today = todayLocal();
  const plan = db.plan;
  const past = db.pastPlans ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Planes"
        action={
          <Link href="/carreras" className="btn">
            + Crear plan
          </Link>
        }
      />

      {plan ? (
        <ActivePlan plan={plan} db={db} today={today} />
      ) : (
        <Link href="/carreras" className="block rounded-2xl border border-dashed border-line p-6 text-center transition hover:border-accent">
          <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
          </svg>
          <strong className="mt-2 block">No tienes ningún plan en marcha</strong>
          <span className="mt-1 block text-sm text-ink-2">Elige tu carrera y la fecha: generamos un plan periodizado hasta ese día.</span>
        </Link>
      )}

      <p className="mt-6 text-sm text-muted">Planes anteriores ({past.length})</p>
      <div className="mt-2 space-y-2">
        {past.map((p) => {
          const c = planCompliance(p.plan, db.activities, today);
          return (
            <Link key={p.id} href={`/plan/anterior/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
              <span className="min-w-0">
                <strong className="block truncate">{p.plan.goal.name}</strong>
                <span className="text-xs text-muted">
                  {shortDate(p.plan.weeks[0]?.start ?? p.plan.createdAt.slice(0, 10))} → {shortDate(p.plan.goal.date)} · {p.plan.weeks.length} semanas
                </span>
              </span>
              <span className="shrink-0 text-right text-sm font-semibold">
                {c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"}
                <span className="block text-[11px] font-normal text-muted">cumplido</span>
              </span>
            </Link>
          );
        })}
        {!past.length && <p className="text-sm text-ink-2">Cuando termines un plan o empieces otro para una carrera distinta, el anterior se guarda aquí.</p>}
      </div>
    </div>
  );
}

function ActivePlan({ plan, db, today }: { plan: Plan; db: Awaited<ReturnType<typeof getDb>>; today: string }) {
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
          <Pill className="bg-accent text-accent-ink">En marcha</Pill>
          <strong className="mt-2 block truncate text-xl">{plan.goal.name}</strong>
          <span className="text-sm text-ink-2">
            {shortDate(plan.goal.date)} · {days > 0 ? `faltan ${days} días` : days === 0 ? "¡es hoy!" : "carrera hecha"} · {plan.goal.distanceKm.toLocaleString("es-ES", { maximumFractionDigits: 1 })} km
            {plan.goal.targetTimeSec ? ` · objetivo ${fmtDuration(plan.goal.targetTimeSec)}` : ""}
          </span>
        </div>
        <span className="shrink-0 text-sm font-semibold text-accent transition group-hover:translate-x-0.5">Ver plan →</span>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-ink-2">
          <span>
            {done} de {total} semanas
            {week ? ` · ${PHASE_LABEL[week.phase]}${week.recovery ? " (descarga)" : ""}` : notStarted ? ` · empieza el ${shortDate(plan.weeks[0].start)}` : " · terminado"}
          </span>
          <span className="tabular">{Math.round((done / Math.max(1, total)) * 100)} %</span>
        </div>
        <div className="flex h-2 gap-0.5" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Avance del plan">
          {plan.weeks.map((w, i) => (
            <span key={w.index} className={`flex-1 rounded-full ${i < done ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Cumplimiento" value={c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"} sub={c.past ? `${c.past} sesiones` : "aún sin sesiones"} />
        <Mini label="Tiempo previsto" value={race ? fmtDuration(race.durationMin * 60) : "–"} sub="en carrera" />
        <Mini label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub="al empezar → objetivo" />
        <Mini label="Km del plan" value={`${totalKm} km`} sub={`${total} semanas`} />
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
