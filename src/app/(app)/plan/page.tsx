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
    <>
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
        <Link href="/carreras" className="block rounded-2xl border border-dashed border-line p-5 text-center hover:bg-surface-2">
          <span className="block text-3xl">🏁</span>
          <strong className="mt-2 block">No tienes ningún plan en marcha</strong>
          <span className="mt-1 block text-sm text-ink-2">Elige tu carrera y la fecha: generamos un plan periodizado hasta ese día.</span>
        </Link>
      )}

      <p className="mt-6 text-sm text-muted">Planes anteriores ({past.length})</p>
      <div className="mt-2 space-y-2">
        {past.map((p) => {
          const c = planCompliance(p.plan, db.activities, today);
          return (
            <Link key={p.id} href={`/plan/anterior/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
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
    </>
  );
}

function ActivePlan({ plan, db, today }: { plan: Plan; db: Awaited<ReturnType<typeof getDb>>; today: string }) {
  const thisWeek = mondayOf(today);
  const idx = plan.weeks.findIndex((w) => w.start === thisWeek);
  const week = plan.weeks[idx];
  const days = diffDays(plan.goal.date, today);
  const c = planCompliance(plan, db.activities, today);
  const progress = plan.weeks.length ? Math.min(1, Math.max(0, (idx + 1) / plan.weeks.length)) : 0;
  const race = plan.weeks.at(-1)?.sessions.find((s) => s.type === "race" && s.date === plan.goal.date);

  return (
    <Link href="/plan/actual" className="block rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Pill className="bg-accent text-accent-ink">En marcha</Pill>
          <strong className="mt-2 block truncate text-lg">{plan.goal.name}</strong>
          <span className="text-sm text-ink-2">
            {shortDate(plan.goal.date)} · {days > 0 ? `faltan ${days} días` : days === 0 ? "¡es hoy!" : "carrera hecha"}
            {plan.goal.targetTimeSec ? ` · objetivo ${fmtDuration(plan.goal.targetTimeSec)}` : ""}
          </span>
        </div>
        <span className="shrink-0 text-sm font-semibold text-accent">Ver plan →</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del plan">
        <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini
          label="Semana"
          value={week ? `${idx + 1}/${plan.weeks.length}` : `${today < (plan.weeks[0]?.start ?? today) ? 0 : plan.weeks.length}/${plan.weeks.length}`}
          sub={week ? PHASE_LABEL[week.phase] + (week.recovery ? " · descarga" : "") : today < (plan.weeks[0]?.start ?? today) ? `empieza el ${shortDate(plan.weeks[0].start)}` : "terminado"}
        />
        <Mini label="Cumplimiento" value={c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"} sub={`${c.past} sesiones`} />
        <Mini label="Previsto" value={race ? fmtDuration(race.durationMin * 60) : "–"} sub="en carrera" />
      </div>
    </Link>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="tabular font-bold">{value}</div>
      {sub && <div className="truncate text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
