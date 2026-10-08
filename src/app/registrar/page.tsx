import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { ActivityForm, type ActivityFormInitial } from "@/components/ActivityForm";
import { SESSION_KIND } from "@/components/SessionCard";
import { Card, Loading, Notice, PageHeader, Status } from "@/components/ui";
import { fmtDuration, fmtPace } from "@/lib/format";
import { WEEKDAYS, diffDays, shortDate, weekday } from "@/lib/dates";
import type { PlannedSession } from "@/lib/types";
import { deleteActivity } from "../actions";

export const metadata: Metadata = { title: "Registrar entreno" };

const SPORT: Record<string, string> = { run: "Correr", ride: "Bici", swim: "Natación", walk: "Caminar", strength: "Fuerza", other: "Otro" };
const DEFAULT_RPE = { suave: 3, larga: 5, calidad: 7, fuerza: 6, carrera: 9 } as const;

export default function RegistrarPage({ searchParams }: PageProps<"/registrar">) {
  return (
    <>
      <PageHeader title="Registrar entreno" subtitle="Apunta lo que has hecho: el plan, la forma y las estadísticas se actualizan al momento." />
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function fromSession(s: PlannedSession, today: string): ActivityFormInitial {
  return {
    sessionId: s.id,
    sport: s.type === "strength" ? "strength" : "run",
    name: s.title.replace(/^🏁\s*/, ""),
    date: s.date <= today ? s.date : today,
    time: "07:00",
    distanceKm: s.distanceKm || undefined,
    duration: fmtDuration(s.durationMin * 60),
    rpe: DEFAULT_RPE[SESSION_KIND[s.type]],
  };
}

async function Content({ searchParams }: { searchParams: PageProps<"/registrar">["searchParams"] }) {
  const sp = await searchParams;
  const { db, today, matches } = await getAnalysis();
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
      rpe: editing.rpe,
      notes: editing.notes,
    };
  else if (session) initial = fromSession(session, today);
  else initial = { sport: "run", name: "", date: today, time: "07:00", rpe: 4 };

  // sesiones de los últimos 10 días aún sin completar
  const pending = sessions.filter((s) => {
    if (s.date > today || diffDays(today, s.date) > 10) return false;
    const st = matches?.get(s.id)?.status;
    return st === "missed" || st === "today" || st === "partial";
  });
  const recent = [...db.activities].reverse().slice(0, 15);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {sp.guardado && (
        <div className="lg:col-span-3">
          <Notice tone="good">Entreno registrado. Ya cuenta en tu forma, fatiga y estadísticas.</Notice>
        </div>
      )}
      <Card className="lg:col-span-2" title={editing ? "Editar entreno" : session ? "Registrar sesión del plan" : "Nuevo entreno"}>
        <ActivityForm key={editing?.id ?? session?.id ?? "nuevo"} initial={initial} session={session} today={today} />
        {editing && (
          <form action={deleteActivity} className="mt-4 border-t border-line pt-4">
            <input type="hidden" name="id" value={editing.id} />
            <button className="text-sm text-ink-2 underline hover:text-critical">Borrar este entreno</button>
          </form>
        )}
      </Card>

      <div className="space-y-4">
        {pending.length > 0 && (
          <Card title="Pendientes de registrar" subtitle="Sesiones del plan de los últimos días">
            <ul className="space-y-2">
              {pending.map((s) => (
                <li key={s.id}>
                  <Link href={`/registrar?sesion=${encodeURIComponent(s.id)}`} className="block rounded-xl border border-line p-3 hover:border-accent">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                      {WEEKDAYS[weekday(s.date)]} {shortDate(s.date)}
                    </span>
                    <span className="block text-sm font-semibold">{s.title}</span>
                    <span className="mt-1 block">
                      <Status tone={matches?.get(s.id)?.status === "partial" ? "warn" : "neutral"}>
                        {matches?.get(s.id)?.status === "partial" ? "Parcial" : "Registrar"}
                      </Status>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Últimos entrenos">
          {recent.length ? (
            <ul className="divide-y divide-line text-sm">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block text-xs text-muted tabular">
                      {shortDate(a.date)} · {SPORT[a.sport]}
                      {a.distanceM > 0 && ` · ${(a.distanceM / 1000).toFixed(1)} km`} · {fmtDuration(a.movingSec)}
                      {a.sport === "run" && a.distanceM > 0 && ` · ${fmtPace(a.movingSec / (a.distanceM / 1000))}/km`}
                      {a.rpe && ` · RPE ${a.rpe}`}
                    </span>
                  </span>
                  <Link href={`/registrar?editar=${encodeURIComponent(a.id)}`} className="shrink-0 text-xs font-semibold text-accent">
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Aún no has registrado nada.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
