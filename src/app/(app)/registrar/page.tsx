import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import type { ActivityFormInitial } from "@/components/ActivityForm";
import { ActivityForm } from "@/components/ActivityForm";
import { coachConfig } from "@/lib/coach";
import { ImportPanel } from "@/components/ImportPanel";
import { SESSION_KIND } from "@/components/SessionCard";
import { Card, ChipLink, Loading, Notice, PageHeader, Status } from "@/components/ui";
import { fmtDuration, fmtPace } from "@/lib/format";
import { diffDays } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { dayMonth, weekdayDate } from "@/lib/i18n";
import { planText } from "@/lib/i18n/planText";
import type { Locale } from "@/lib/i18n";
import type { PlannedSession } from "@/lib/types";
import { DeleteActivityButton } from "@/components/DeleteActivityButton";
import { viewFriends } from "@/lib/authView";
import { TagChips } from "@/components/ActivityItem";
import { tagsForDb } from "@/lib/engine/tags";
import { estimateVdot } from "@/lib/engine/stats";
import { requireViewerId } from "@/lib/session";
import { activityPhotoUrl } from "@/lib/photos";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Registrar entreno" };

const DEFAULT_RPE = { suave: 3, larga: 5, calidad: 7, fuerza: 6, carrera: 9 } as const;

export default function RegistrarPage({ searchParams }: PageProps<"/registrar">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function fromSession(s: PlannedSession, today: string, locale: Locale): ActivityFormInitial {
  return {
    sessionId: s.id,
    sport: s.type === "strength" ? "strength" : "run",
    name: planText(s.title, locale),
    date: s.date <= today ? s.date : today,
    time: "07:00",
    distanceKm: s.distanceKm || undefined,
    duration: fmtDuration(s.durationMin * 60),
    rpe: DEFAULT_RPE[SESSION_KIND[s.type]],
  };
}

async function Content({ searchParams }: { searchParams: PageProps<"/registrar">["searchParams"] }) {
  const [sp, { t, locale }] = await Promise.all([searchParams, getT()]);
  const uid = await requireViewerId();
  const [{ db, today, matches }, friends] = await Promise.all([getAnalysis(), viewFriends(uid)]);
  const sessions = db.plan?.weeks.flatMap((w) => w.sessions) ?? [];

  const editId = typeof sp.editar === "string" ? sp.editar : undefined;
  const sessionId = typeof sp.sesion === "string" ? sp.sesion : undefined;
  const editing = editId ? db.activities.find((a) => a.id === editId) : undefined;
  const session = sessions.find((s) => s.id === (editing?.sessionId ?? sessionId));

  let initial: ActivityFormInitial;
  if (editing)
    initial = {
      id: editing.id,
      sessionId: editing.sessionId,
      sport: editing.sport,
      name: editing.name,
      date: editing.date,
      time: editing.startLocal.slice(11, 16),
      distanceKm: editing.distanceM ? Math.round(editing.distanceM / 10) / 100 : undefined,
      duration: fmtDuration(editing.movingSec),
      elevationGainM: editing.elevationGainM || undefined,
      avgHr: editing.avgHr,
      maxHr: editing.maxHr,
      avgCadence: editing.avgCadence,
      steps: editing.steps,
      maxAltitudeM: editing.maxAltitudeM,
      rpe: editing.rpe,
      feel: editing.feel,
      feelings: editing.feelings,
      notes: editing.notes,
      with: editing.with,
      photo: activityPhotoUrl(uid, editing),
    };
  else if (session) initial = fromSession(session, today, locale);
  else initial = { sport: "run", name: "", date: today, time: "07:00", rpe: 4 };

  // sesiones de los últimos 10 días aún sin completar
  const pending = sessions.filter((s) => {
    if (s.date > today || diffDays(today, s.date) > 10) return false;
    const st = matches?.get(s.id)?.status;
    return st === "missed" || st === "today" || st === "partial";
  });
  // solo los dos últimos: el resto, en Perfil → Entrenos
  const recent = [...db.activities].reverse().slice(0, 2);
  // etiquetas de la sesión recién guardada (récord, más larga…) para celebrarlo
  const savedId = typeof sp.guardado === "string" ? sp.guardado : undefined;
  const savedTags = savedId && db.activities.some((a) => a.id === savedId) ? (tagsForDb(db, estimateVdot(db.activities, db.profile, today).vdot).get(savedId) ?? []) : [];

  return (
    <>
    <PageHeader
      title={t("reg.titulo")}
      subtitle={t("reg.sub")}
      action={
        <Link href="/registrar/gps" className="btn">
          <Icon name="pin" className="mr-1 h-4 w-4 align-[-2px]" /> {t("reg.gps")}
        </Link>
      }
    />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {sp.guardado && (
        <div className="lg:col-span-3">
          <Notice tone="good">
            {t("reg.guardado")}
            {savedTags.length > 0 && (
              <span className="mt-1 block">
                <strong className="text-ink">{savedTags.some((x) => x.kind === "record") ? t("reg.record") : t("reg.bien")}</strong>{" "}
                <TagChips tags={savedTags} locale={locale} />
              </span>
            )}
            {coachConfig().configured && db.plan && ` ${t("reg.ia")}`}
          </Notice>
        </div>
      )}
      <Card className="lg:col-span-2" title={editing ? t("reg.editar") : session ? t("reg.sesionPlan") : t("reg.nuevo")}>
        <ActivityForm
          key={editing?.id ?? session?.id ?? `nuevo-${savedId ?? ""}`}
          initial={initial}
          locale={locale}
          session={session}
          today={today}
          friends={friends.map((f) => ({ id: f.id, name: f.name, username: f.username }))}
          routines={(db.routines ?? []).map((r) => ({ id: r.id, name: r.name }))}
          planStrength={sessions.filter((s) => s.type === "strength" && s.date <= today).map((s) => ({ id: s.id, date: s.date, title: planText(s.title, locale) }))}
        />
        {editing && (
          <div className="mt-4 border-t border-line pt-4">
            <DeleteActivityButton id={editing.id} locale={locale} />
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {pending.length > 0 && (
          <Card title={t("reg.pendientes")} subtitle={t("reg.pendientesSub")}>
            <ul className="space-y-2">
              {pending.map((s) => (
                <li key={s.id}>
                  <Link href={`/registrar?sesion=${encodeURIComponent(s.id)}`} className="block rounded-xl border border-line p-3 hover:border-accent">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                      {weekdayDate(s.date, locale)}
                    </span>
                    <span className="block text-sm font-semibold">{planText(s.title, locale)}</span>
                    <span className="mt-1 block">
                      <Status tone={matches?.get(s.id)?.status === "partial" ? "warn" : "neutral"}>
                        {matches?.get(s.id)?.status === "partial" ? t("sesion.parcial") : t("sesion.registrar")}
                      </Status>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title={t("reg.importar")} subtitle={t("reg.importarSub")}>
          <ImportPanel locale={locale} />
          <details className="mt-3 text-xs text-ink-2">
            <summary className="cursor-pointer font-semibold text-accent">{t("reg.comoSacar")}</summary>
            <ul className="mt-2 space-y-1.5">
              <li>• {t("reg.ex1")}</li>
              <li>• {t("reg.ex2")}</li>
              <li>• {t("reg.ex3")}</li>
              <li>• {t("reg.ex4")}</li>
              <li>• {t("reg.ex5")}</li>
            </ul>
          </details>
        </Card>

        <Card
          title={t("fh.ultimos")}
          action={db.activities.length > 2 && <ChipLink href="/perfil?tab=actividades">{t("pr.verTodos")}</ChipLink>}
        >
          {recent.length ? (
            <ul className="divide-y divide-line text-sm">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block text-xs text-muted tabular">
                      {dayMonth(a.date, locale)} · {t(`sport.${a.sport}`)}
                      {a.distanceM > 0 && ` · ${(a.distanceM / 1000).toFixed(1)} km`} · {fmtDuration(a.movingSec)}
                      {a.sport === "run" && a.distanceM > 0 && ` · ${fmtPace(a.movingSec / (a.distanceM / 1000))}/km`}
                      {a.rpe && ` · RPE ${a.rpe}`}
                    </span>
                  </span>
                  <Link href={`/registrar?editar=${encodeURIComponent(a.id)}`} className="shrink-0 text-xs font-semibold text-accent">
                    {t("ex.editar")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">{t("reg.nada")}</p>
          )}
        </Card>
      </div>
    </div>
    </>
  );
}
