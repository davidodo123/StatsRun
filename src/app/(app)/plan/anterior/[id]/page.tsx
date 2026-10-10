import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Stat } from "@/components/ui";
import { deletePastPlan } from "@/app/actions";
import { getDb } from "@/lib/db";
import { matchPlan, planCompliance, type SessionMatch } from "@/lib/engine/planner";
import { WEEKDAYS, shortDate, todayLocal, weekday } from "@/lib/dates";
import { fmtKm } from "@/lib/format";
import type { Phase } from "@/lib/types";

export const metadata: Metadata = { title: "Plan anterior" };

const PHASE_LABEL: Record<Phase, string> = { base: "Base", construccion: "Construcción", especifico: "Específico", taper: "Afinado" };
const STATUS: Record<SessionMatch["status"], { icon: string; cls: string }> = {
  done: { icon: "✓", cls: "text-good-ink" },
  partial: { icon: "◐", cls: "text-warning" },
  missed: { icon: "✕", cls: "text-critical" },
  today: { icon: "•", cls: "text-muted" },
  upcoming: { icon: "·", cls: "text-muted" },
};

export default function PastPlanPage({ params }: PageProps<"/plan/anterior/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/plan/anterior/[id]">["params"] }) {
  const [{ id }, db] = await Promise.all([params, getDb()]);
  const past = db.pastPlans?.find((p) => p.id === id);
  if (!past) notFound();
  const { plan } = past;
  const today = todayLocal();
  const matches = matchPlan(plan, db.activities, today);
  const c = planCompliance(plan, db.activities, today);
  const totalKm = plan.weeks.reduce((s, w) => s + w.targetKm, 0);

  return (
    <>
      <Link href="/plan" className="text-sm text-ink-2 hover:text-ink">
        ← Planes
      </Link>
      <PageHeader
        title={plan.goal.name}
        subtitle={`${shortDate(plan.weeks[0]?.start ?? plan.createdAt.slice(0, 10))} → ${shortDate(plan.goal.date)} · ${plan.weeks.length} semanas · archivado el ${shortDate(past.archivedAt.slice(0, 10))}`}
        action={
          <form action={deletePastPlan}>
            <input type="hidden" name="id" value={past.id} />
            <button className="btn btn-ghost text-critical">Borrar del historial</button>
          </form>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Cumplimiento" value={c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"} sub={`${c.past} sesiones de carrera`} />
        <Stat label="Km hechos" value={fmtKm(c.doneKm)} unit="km" sub={`de ${Math.round(totalKm)} km del plan`} />
        <Stat label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub="al empezar → objetivo" />
        <Stat label="Carreras secundarias" value={past.races?.length ?? 0} />
      </div>

      <div className="mt-4 space-y-3">
        {plan.weeks.map((w) => (
          <Card key={w.index} title={`Semana ${w.index + 1} · ${PHASE_LABEL[w.phase]}${w.recovery ? " · descarga" : ""}`} subtitle={`${shortDate(w.start)} · ${w.targetKm} km previstos`}>
            <ul className="divide-y divide-line text-sm">
              {w.sessions.map((s) => {
                const m = matches.get(s.id);
                const st = STATUS[m?.status ?? "upcoming"];
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <span className={`w-5 text-center font-bold ${st.cls}`}>{st.icon}</span>
                    <span className="w-16 shrink-0 text-xs text-muted">
                      {WEEKDAYS[weekday(s.date)].slice(0, 3)} {shortDate(s.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-ink-2">
                      {s.distanceKm ? `${m && m.doneKm ? `${fmtKm(m.doneKm, 1)}/` : ""}${fmtKm(s.distanceKm, 1)} km` : `${s.durationMin} min`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
