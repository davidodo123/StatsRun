import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageHeader, Stat } from "@/components/ui";
import { deletePastPlan } from "@/app/actions";
import { getDb } from "@/lib/db";
import { matchPlan, planCompliance, type SessionMatch } from "@/lib/engine/planner";
import { getT } from "@/lib/i18n/server";
import { dayMonth, shortWeekdayDate, type Key } from "@/lib/i18n";
import { viewToday } from "@/lib/analysis";
import { fmtKm } from "@/lib/format";
import type { Phase } from "@/lib/types";
import { planText } from "@/lib/i18n/planText";

export const metadata: Metadata = { title: "Plan anterior" };

const PHASE_LABEL: Record<Phase, Key> = { base: "plan.fase.base", construccion: "plan.fase.construccion", especifico: "plan.fase.especifico", taper: "plan.fase.taper" };
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
  const [{ id }, db, { locale, t }] = await Promise.all([params, getDb(), getT()]);
  const past = db.pastPlans?.find((p) => p.id === id);
  if (!past) notFound();
  const { plan } = past;
  const today = (await viewToday());
  const matches = matchPlan(plan, db.activities, today);
  const c = planCompliance(plan, db.activities, today);
  const totalKm = plan.weeks.reduce((s, w) => s + w.targetKm, 0);

  return (
    <>
      <BackLink href="/plan" label={t("comun.volver")} />
      <PageHeader
        title={plan.goal.name}
        subtitle={t("plan.anteriorSub", {
          inicio: dayMonth(plan.weeks[0]?.start ?? plan.createdAt.slice(0, 10), locale),
          fin: dayMonth(plan.goal.date, locale),
          n: plan.weeks.length,
          fecha: dayMonth(past.archivedAt.slice(0, 10), locale),
        })}
        action={
          <form action={deletePastPlan}>
            <input type="hidden" name="id" value={past.id} />
            <button className="btn btn-ghost text-critical">{t("plan.borrarHistorial")}</button>
          </form>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("plan.cumplimiento")} value={c.compliance !== undefined ? `${Math.round(c.compliance * 100)} %` : "–"} sub={t("plan.sesionesCarrera", { n: c.past })} />
        <Stat label={t("plan.kmHechos")} value={fmtKm(c.doneKm, 1, locale)} unit="km" sub={t("plan.dePlanKm", { km: Math.round(totalKm) })} />
        <Stat label="VDOT" value={`${plan.startVdot.toFixed(1)} → ${plan.targetVdot.toFixed(1)}`} sub={t("plan.alEmpezar")} />
        <Stat label={t("plan.carrerasSecundarias")} value={past.races?.length ?? 0} />
      </div>

      <div className="mt-4 space-y-3">
        {plan.weeks.map((w) => (
          <Card key={w.index} title={`${t("plan.semana", { n: w.index + 1 })} · ${t(PHASE_LABEL[w.phase])}${w.recovery ? ` · ${t("plan.descarga")}` : ""}`}
            subtitle={t("plan.kmPrevistos", { fecha: dayMonth(w.start, locale), km: w.targetKm })}>
            <ul className="divide-y divide-line text-sm">
              {w.sessions.map((s) => {
                const m = matches.get(s.id);
                const st = STATUS[m?.status ?? "upcoming"];
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <span className={`w-5 text-center font-bold ${st.cls}`}>{st.icon}</span>
                    <span className="w-16 shrink-0 text-xs text-muted">
                      {shortWeekdayDate(s.date, locale)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{planText(s.title, locale)}</span>
                    <span className="shrink-0 text-xs text-ink-2">
                      {s.distanceKm ? `${m && m.doneKm ? `${fmtKm(m.doneKm, 1, locale)}/` : ""}${fmtKm(s.distanceKm, 1, locale)} km` : `${s.durationMin} min`}
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
