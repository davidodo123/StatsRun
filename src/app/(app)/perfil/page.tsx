import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getAnalysis } from "@/lib/analysis";
import { revokeHealthKey, syncProfileAverages } from "@/app/actions";
import { HealthKey } from "@/components/HealthKey";
import { healthSummary, monthlyHealth, recoverySignals, todayMadrid } from "@/lib/health";
import { ProfileForm } from "@/components/ProfileForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { SessionCard } from "@/components/SessionCard";
import { UndoSkip } from "@/components/UndoSkip";
import { SimpleBars, TrendLine } from "@/components/charts";
import { Card, Empty, Loading, Pill, Stat } from "@/components/ui";
import { bmi, bmiLabel, hrMaxOf, hrRestOf, hrZones } from "@/lib/engine/physiology";
import { achievements, bestTimes, periodAverages, profileAverages, strengthSummary, type Achievement, type PeriodAvg } from "@/lib/engine/profile";
import type { SessionMatch } from "@/lib/engine/planner";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { diffDays, mondayOf, shortDate } from "@/lib/dates";
import { focusOf, type Activity, type Db, type Focus, type Phase } from "@/lib/types";
import { workoutVolume } from "@/lib/strength/workouts";
import type { Stats } from "@/lib/engine/stats";
import { ActivityItem } from "@/components/ActivityItem";
import { tagsForDb } from "@/lib/engine/tags";
import { getFriends } from "@/lib/auth";
import { requireUserId } from "@/lib/session";
import { Icon } from "@/components/icons";
import { AiMemory } from "@/components/AiMemory";

export const metadata: Metadata = { title: "Perfil" };

// Logros (icono en la barra de arriba) y Editar (botón de la cabecera) no van en la fila de pestañas
const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "running", label: "Running" },
  { id: "fuerza", label: "Fuerza" },
  { id: "actividades", label: "Actividades", short: "Entrenos" },
  { id: "salud", label: "Salud" },
  { id: "logros", label: "Logros", hidden: true },
  { id: "editar", label: "Editar perfil", hidden: true },
] as const;
type Tab = (typeof TABS)[number]["id"];

const LEVEL: Record<string, string> = { nuevo: "Empezando", principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" };
const PHASE_LABEL: Record<Phase, string> = { base: "Base", construccion: "Construcción", especifico: "Específico", taper: "Afinado" };
const PAGE_SIZE = 25;

export default function PerfilPage({ searchParams }: PageProps<"/perfil">) {
  return (
    <>
      <h1 className="sr-only">Perfil</h1>
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/perfil">["searchParams"] }) {
  const sp = await searchParams;
  const { db, stats, matches, today } = await getAnalysis();
  // solo fuerza: sin Resumen ni Running (son de correr) y se abre en Fuerza
  const focus = focusOf(db.profile);
  const tabs = TABS.filter((t) => focus !== "fuerza" || (t.id !== "resumen" && t.id !== "running"));
  const first = tabs[0].id;
  const requested = typeof sp.tab === "string" ? sp.tab : first;
  // sin perfil solo tiene sentido el formulario
  const tab: Tab = !db.profile || !stats ? "editar" : (tabs.find((t) => t.id === requested)?.id ?? first);
  const foco = sp.foco === "fuerza" || sp.foco === "running" || sp.foco === "ambos" ? (sp.foco as Focus) : undefined;

  return (
    <div className="space-y-4">
      {db.profile && stats && (
        <ProfileHeader db={db} stats={stats} tab={tab}>
          {/* las pestañas, dentro de la misma tarjeta: todas a la vista también en el móvil */}
          <nav aria-label="Secciones del perfil" className="mt-4 border-t border-line pt-3">
            <div className="flex gap-1">
              {tabs
                .filter((t) => !("hidden" in t))
                .map((t) => (
                  <Link
                    key={t.id}
                    href={t.id === first ? "/perfil" : `/perfil?tab=${t.id}`}
                    aria-current={t.id === tab ? "page" : undefined}
                    className={`min-w-0 flex-auto truncate rounded-lg px-1.5 py-1.5 text-center text-[13px] font-medium md:flex-none md:px-3 md:text-sm ${t.id === tab ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}
                  >
                    {"short" in t ? (
                      <>
                        <span className="sm:hidden">{t.short}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                      </>
                    ) : (
                      t.label
                    )}
                  </Link>
                ))}
            </div>
          </nav>
        </ProfileHeader>
      )}

      {tab === "resumen" && <Resumen db={db} stats={stats!} matches={matches} today={today} />}
      {tab === "running" && <Running db={db} stats={stats!} today={today} />}
      {tab === "fuerza" && <Fuerza db={db} today={today} />}
      {tab === "actividades" && <Actividades db={db} sport={typeof sp.deporte === "string" ? sp.deporte : "todos"} page={Number(sp.pagina) || 1} />}
      {tab === "logros" && <Logros list={achievements(db.activities, matches)} />}
      {tab === "salud" && <Salud db={db} />}
      {tab === "editar" && <Editar db={db} today={today} initialFocus={foco} />}
    </div>
  );
}

// ---------------- Cabecera ----------------

function ProfileHeader({ db, stats, tab, children }: { db: Db; stats: Stats; tab: Tab; children: ReactNode }) {
  const p = db.profile!;
  const T = stats.totals;
  const strengthOnly = focusOf(p) === "fuerza";
  const lifts = db.activities.filter((a) => a.workout);
  const cells = strengthOnly
    ? [
        ["Entrenos", fmtNum(lifts.length)],
        ["Toneladas", fmtNum(lifts.reduce((t, a) => t + workoutVolume(a.workout!), 0) / 1000, 1)],
        ["Horas", fmtNum(lifts.reduce((t, a) => t + a.movingSec, 0) / 3600)],
      ]
    : [
        ["Km totales", fmtNum(T.allKm)],
        ["Carreras", fmtNum(T.allRuns)],
        ["Horas", fmtNum(T.allHours)],
      ];
  const initials = p.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const btn = (on: boolean) => `grid h-9 w-9 shrink-0 place-items-center rounded-full border ${on ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2 hover:bg-surface-2"}`;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-accent-ink" aria-hidden>
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{p.name}</p>
          <p className="text-xs text-ink-2">
            {strengthOnly ? "Fuerza" : `${LEVEL[p.level]} · `}
            {strengthOnly ? ` · ${p.age} años` : `${p.age} años · VDOT ${stats.vdot.vdot.toFixed(1)}`}
            {db.goal && ` · Objetivo: ${db.goal.name}`}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:order-last sm:self-center">
          {/* en el móvil, Logros está en la barra de arriba */}
          <Link href="/perfil?tab=logros" aria-label="Logros" aria-current={tab === "logros" ? "page" : undefined} className={`hidden md:grid ${btn(tab === "logros")}`}>
            <Icon name="trophy" className="h-[18px] w-[18px]" />
          </Link>
          <Link href="/perfil?tab=editar" aria-label="Editar perfil" aria-current={tab === "editar" ? "page" : undefined} className={btn(tab === "editar")}>
            <Icon name="edit" className="h-[18px] w-[18px]" />
          </Link>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:gap-6">
          {cells.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-muted">{label}</dt>
              <dd className="font-bold tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {children}
    </section>
  );
}

// ---------------- Resumen ----------------

function Resumen({ db, stats, matches, today }: { db: Db; stats: Stats; matches?: Map<string, SessionMatch>; today: string }) {
  const recent = [...db.activities].sort((a, b) => b.startLocal.localeCompare(a.startLocal)).slice(0, 5);
  const logros = achievements(db.activities, matches);
  const unlocked = logros.filter((a) => a.unlocked).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Preparacion db={db} matches={matches} today={today} />
        <Card
          title="Sesiones recientes"
          action={
            <Link href="/perfil?tab=actividades" className="text-xs font-semibold text-accent">
              Ver todas →
            </Link>
          }
        >
          {recent.length ? <ActivityList acts={recent} /> : <p className="text-sm text-ink-2">Aún no hay sesiones.</p>}
        </Card>
      </div>
      <div className="space-y-4">
        <BestTimesCard acts={db.activities} />
        <Card
          title="Logros"
          subtitle={`${unlocked.length} de ${logros.length} conseguidos`}
          action={
            <Link href="/perfil?tab=logros" className="text-xs font-semibold text-accent">
              Ver todos →
            </Link>
          }
        >
          {unlocked.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {unlocked.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-xl bg-surface-2 p-2 text-center" title={a.detail}>
                  <Icon name={a.icon} className="mx-auto mb-1 block h-7 w-7 text-accent" />
                  <span className="block text-[11px] font-medium leading-tight">{a.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Registra tu primera carrera para estrenar la vitrina.</p>
          )}
        </Card>
        <Card title="Forma actual">
          <ul className="divide-y divide-line text-sm">
            <Row label="VDOT" value={stats.vdot.vdot.toFixed(1)} />
            <Row label="Media 6 semanas" value={`${fmtKm(stats.totals.avgWeeklyKm6)} km/sem`} />
            <Row label="Racha actual" value={`${stats.totals.streakDays} días`} />
            <Row label="Constancia (12 sem)" value={`${Math.round(stats.totals.consistency)} %`} />
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Preparacion({ db, matches, today }: { db: Db; matches?: Map<string, SessionMatch>; today: string }) {
  const plan = db.plan;
  if (!plan)
    return (
      <Card title="Tu preparación">
        <Empty title="Sin plan activo" href="/carreras" cta="Elegir carrera">
          Elige una carrera y fecha y te preparamos el plan.
        </Empty>
      </Card>
    );
  const thisWeek = mondayOf(today);
  const idx = plan.weeks.findIndex((w) => w.start === thisWeek);
  const week = idx >= 0 ? plan.weeks[idx] : undefined;
  const past = [...(matches?.values() ?? [])].filter((m) => m.session.date < today && m.session.type !== "race");
  const done = past.filter((m) => m.status === "done").length;
  const next = plan.weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date >= today)
    .slice(0, 3);
  const daysLeft = diffDays(plan.goal.date, today);
  const progress = plan.weeks.length ? Math.min(1, Math.max(0, (idx + 1) / plan.weeks.length)) : 0;
  return (
    <Card
      title="Tu preparación"
      subtitle={`${plan.goal.name} · ${shortDate(plan.goal.date)}${plan.goal.targetTimeSec ? ` · objetivo ${fmtDuration(plan.goal.targetTimeSec)}` : ""}`}
      action={
        <Link href="/plan/actual" className="text-xs font-semibold text-accent">
          Ver plan →
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-[11px] text-muted">Faltan</p>
          <p className="font-bold tabular">{daysLeft >= 0 ? `${daysLeft} días` : "Hecha"}</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-[11px] text-muted">Semana</p>
          <p className="font-bold tabular">{week ? `${idx + 1} de ${plan.weeks.length}` : "–"}</p>
          {week && <p className="text-[11px] text-ink-2">{PHASE_LABEL[week.phase]}{week.recovery ? " · descarga" : ""}</p>}
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-[11px] text-muted">Cumplidas</p>
          <p className="font-bold tabular">{past.length ? `${done}/${past.length}` : "–"}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del plan">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
      </div>
      {week && <p className="mt-2 text-xs text-ink-2">{week.focus}</p>}
      {next.length > 0 && (
        <div className="mt-3 space-y-2">
          <UndoSkip db={db} today={today} className="" />
          {next.map((s) => (
            <SessionCard key={s.id} s={s} match={matches?.get(s.id)} compact />
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------- Running ----------------

function Running({ db, stats, today }: { db: Db; stats: Stats; today: string }) {
  const T = stats.totals;
  const runsList = db.activities.filter((a) => a.sport === "run").sort((a, b) => b.startLocal.localeCompare(a.startLocal));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Km este año" value={fmtNum(T.yearKm)} unit="km" sub={`${T.yearRuns} carreras`} />
        <Stat label="Km este mes" value={fmtKm(T.monthKm)} unit="km" />
        <Stat label="Media 6 semanas" value={fmtKm(T.avgWeeklyKm6)} unit="km/sem" />
        <Stat label="Desnivel total" value={fmtNum(T.elevation)} unit="m" />
      </div>
      <ImprovementTable rows={periodAverages(db.activities, today)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BestTimesCard acts={db.activities} />
        <Card title="Últimas carreras" className="lg:col-span-2">
          {runsList.length ? <ActivityList acts={runsList.slice(0, 10)} /> : <p className="text-sm text-ink-2">Aún no hay carreras.</p>}
          {runsList.length > 10 && (
            <Link href="/perfil?tab=actividades&deporte=run" className="mt-2 inline-block text-xs font-semibold text-accent">
              Ver las {runsList.length} carreras →
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Tabla de mejora: medias de 3 bloques de 4 semanas y cambio del último respecto al anterior. */
function ImprovementTable({ rows }: { rows: PeriodAvg[] }) {
  const [now, prev] = rows;
  type Metric = { label: string; get: (r: PeriodAvg) => number | undefined; fmt: (v: number) => string; better: "up" | "down" };
  const METRICS: Metric[] = [
    { label: "Km por semana", get: (r) => r.kmPerWeek, fmt: (v) => fmtKm(v), better: "up" },
    { label: "Carreras por semana", get: (r) => r.runsPerWeek, fmt: (v) => fmtKm(v), better: "up" },
    { label: "Ritmo medio (/km)", get: (r) => r.avgPace, fmt: fmtPace, better: "down" },
    { label: "FC media", get: (r) => r.avgHr, fmt: (v) => String(Math.round(v)), better: "down" },
    { label: "Eficiencia (EF)", get: (r) => r.ef, fmt: (v) => v.toFixed(2), better: "up" },
    { label: "Cadencia (ppm)", get: (r) => r.cadence, fmt: (v) => String(Math.round(v)), better: "up" },
    { label: "Tirada más larga", get: (r) => r.longestKm || undefined, fmt: (v) => `${fmtKm(v)} km`, better: "up" },
    { label: "Fuerza por semana", get: (r) => r.strengthPerWeek, fmt: (v) => fmtKm(v), better: "up" },
  ];
  return (
    <Card title="Tabla de mejora" subtitle="Medias por bloques de 4 semanas. La flecha compara el último bloque con el anterior.">
      <div>
        <table className="w-full text-sm tabular">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">Métrica</th>
              {rows.map((r, i) => (
                <th key={r.label} className={`pb-2 pl-2 text-right font-medium ${i === 2 ? "hidden sm:table-cell" : ""}`}>
                  {r.label}
                </th>
              ))}
              <th className="pb-2 text-right font-medium">Cambio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {METRICS.map((m) => {
              const a = m.get(now);
              const b = m.get(prev);
              const delta = a !== undefined && b !== undefined && b !== 0 ? ((a - b) / b) * 100 : undefined;
              const good = delta !== undefined && Math.abs(delta) >= 1 ? (m.better === "up" ? delta > 0 : delta < 0) : undefined;
              return (
                <tr key={m.label}>
                  <td className="py-1.5">{m.label}</td>
                  {rows.map((r, i) => {
                    const v = m.get(r);
                    return (
                      // en móvil solo caben los dos últimos bloques
                      <td key={r.label} className={`py-1.5 pl-2 text-right ${i === 2 ? "hidden sm:table-cell" : ""}`}>
                        {v !== undefined ? m.fmt(v) : "–"}
                      </td>
                    );
                  })}
                  <td className={`py-1.5 text-right font-semibold ${good === undefined ? "text-muted" : good ? "text-good-ink" : "text-critical"}`}>
                    {delta === undefined ? "–" : `${good === undefined ? "=" : good ? "▲" : "▼"} ${delta > 0 ? "+" : ""}${delta.toFixed(0)} %`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">▲ verde = mejora (por ejemplo, ritmo más rápido o menos pulsaciones). ▼ rojo = empeora.</p>
    </Card>
  );
}

function BestTimesCard({ acts }: { acts: Activity[] }) {
  const list = bestTimes(acts);
  return (
    <Card title="Mejores tiempos" subtitle="Con el ritmo medio de cada carrera">
      {list.length ? (
        <ul className="divide-y divide-line text-sm">
          {list.map((b) => (
            <li key={b.label} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block font-medium">{b.label}</span>
                <span className="block truncate text-xs text-muted">
                  {b.activity.name} · {shortDate(b.activity.date)}
                  {!b.exact && ` · estimado de ${fmtKm(b.activity.distanceM / 1000)} km`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular">{fmtDuration(b.timeSec)}</span>
                <span className="block text-[11px] text-muted tabular">{fmtPace(b.paceSec)}/km</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">Corre al menos 5 km para tener tu primera marca.</p>
      )}
    </Card>
  );
}

// ---------------- Fuerza ----------------

function Fuerza({ db, today }: { db: Db; today: string }) {
  const s = strengthSummary(db.activities, today);
  const target = db.profile?.strengthPerWeek ?? 0;
  const list = db.activities.filter((a) => a.sport === "strength").sort((a, b) => b.startLocal.localeCompare(a.startLocal));
  const upcoming = db.plan?.weeks
    .flatMap((w) => w.sessions)
    .filter((x) => x.type === "strength" && x.date >= today)
    .slice(0, 2);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sesiones totales" value={s.total} sub={`${fmtNum(s.totalMin / 60, 1)} h en total`} />
        <Stat label="Últimas 4 semanas" value={s.last28} sub={`${s.min28} min`} />
        <Stat label="Media semanal" value={fmtKm(s.perWeek28)} sub={target ? `Objetivo del plan: ${target}/sem` : "Recomendado: 2/sem"} />
        <Stat label="Última sesión" value={s.last ? shortDate(s.last.date) : "–"} sub={s.last ? `Hace ${diffDays(today, s.last.date)} días` : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sesiones por semana" subtitle="Últimas 12 semanas" className="lg:col-span-2">
          <SimpleBars data={s.weeks.map((w) => ({ week: w.week, n: w.count }))} xKey="week" yKey="n" name="Sesiones" unit="" xFormat="day" height={200} />
        </Card>
        <Card title="Próximas en el plan">
          {upcoming?.length ? (
            <div className="space-y-2">
              {upcoming.map((x) => (
                <SessionCard key={x.id} s={x} compact />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-2">{db.plan ? "No hay sesiones de fuerza próximas." : "Sin plan activo."}</p>
          )}
          <p className="mt-3 text-xs text-muted">La fuerza reduce lesiones y mejora la economía de carrera (ver el estudio de entrenamiento).</p>
          <Link href="/fuerza" className="btn btn-ghost mt-3 w-full">
            Ejercicios y material →
          </Link>
        </Card>
      </div>
      <Card title="Historial de fuerza">
        {list.length ? <ActivityList acts={list.slice(0, 20)} /> : <p className="text-sm text-ink-2">Aún no has registrado sesiones de fuerza.</p>}
      </Card>
    </div>
  );
}

// ---------------- Actividades ----------------

const SPORT_FILTERS = [
  { id: "todos", label: "Todas" },
  { id: "run", label: "Correr" },
  { id: "strength", label: "Fuerza" },
  { id: "otros", label: "Otros" },
];

function Actividades({ db, sport, page }: { db: Db; sport: string; page: number }) {
  const filtered = db.activities
    .filter((a) => (sport === "run" ? a.sport === "run" : sport === "strength" ? a.sport === "strength" : sport === "otros" ? a.sport !== "run" && a.sport !== "strength" : true))
    .sort((a, b) => b.startLocal.localeCompare(a.startLocal));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const href = (s: string, p = 1) => `/perfil?tab=actividades${s !== "todos" ? `&deporte=${s}` : ""}${p > 1 ? `&pagina=${p}` : ""}`;
  const km = filtered.reduce((s, a) => s + a.distanceM, 0) / 1000;
  const sec = filtered.reduce((s, a) => s + a.movingSec, 0);
  return (
    <Card title="Todas tus sesiones" subtitle={`${filtered.length} sesiones · ${fmtNum(km)} km · ${fmtNum(sec / 3600)} h`}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SPORT_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            aria-current={f.id === sport ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${f.id === sport ? "border-accent bg-surface-2 text-ink" : "border-line text-ink-2 hover:border-accent"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {filtered.length ? <ActivityList acts={filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} /> : <p className="text-sm text-ink-2">No hay sesiones con este filtro.</p>}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          {current > 1 ? (
            <Link href={href(sport, current - 1)} className="font-semibold text-accent">
              ← Más recientes
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Página {current} de {pages}
          </span>
          {current < pages ? (
            <Link href={href(sport, current + 1)} className="font-semibold text-accent">
              Más antiguas →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------- Logros ----------------

function Logros({ list }: { list: Achievement[] }) {
  const groups = [...new Set(list.map((a) => a.group))];
  const unlocked = list.filter((a) => a.unlocked).length;
  return (
    <div className="space-y-4">
      <Card title="Vitrina de logros" subtitle={`${unlocked} de ${list.length} conseguidos`}>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={unlocked} aria-valuemin={0} aria-valuemax={list.length} aria-label="Logros conseguidos">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(unlocked / Math.max(1, list.length)) * 100}%` }} />
        </div>
      </Card>
      {groups.map((g) => (
        <Card key={g} title={g}>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list
              .filter((a) => a.group === g)
              .map((a) => (
                <li key={a.id} className={`flex gap-3 rounded-xl border p-3 ${a.unlocked ? "border-accent bg-surface-2" : "border-line"}`}>
                  <Icon name={a.icon} className={`h-7 w-7 ${a.unlocked ? "text-accent" : "text-muted opacity-40"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {a.title}
                      {a.unlocked && <Pill className="bg-accent text-accent-ink">✓</Pill>}
                    </span>
                    <span className="block text-xs text-ink-2">{a.detail}</span>
                    {a.unlocked ? (
                      a.date && <span className="mt-1 block text-[11px] text-muted">Conseguido el {shortDate(a.date)}</span>
                    ) : (
                      a.progress > 0 && (
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-label={`Progreso ${Math.round(a.progress * 100)} %`}>
                          <span className="block h-full rounded-full bg-muted" style={{ width: `${a.progress * 100}%` }} />
                        </span>
                      )
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

// ---------------- Pasos y calorías ----------------

function Salud({ db }: { db: Db }) {
  const today = todayMadrid();
  const h = healthSummary(db.health, today);
  const endpoint = `${(process.env.APP_URL ?? "https://run-in-out.vercel.app").replace(/\/$/, "")}/api/salud`;
  const last = db.health?.at(-1);
  const rec = recoverySignals(db.health, today);
  const n1 = (v?: number) => (v === undefined ? "–" : v.toLocaleString("es-ES", { maximumFractionDigits: 1 }));
  return (
    <div className="space-y-4">
      {h ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Pasos hoy" value={h.today?.steps !== undefined ? fmtNum(h.today.steps) : "–"} sub={h.avgSteps7 !== undefined ? `Media 7 días: ${fmtNum(h.avgSteps7)}` : undefined} />
            <Stat
              label="Calorías activas hoy"
              value={h.today?.activeKcal !== undefined ? fmtNum(h.today.activeKcal) : "–"}
              unit="kcal"
              sub={h.avgActiveKcal7 !== undefined ? `Media 7 días: ${fmtNum(h.avgActiveKcal7)} kcal` : undefined}
            />
            <Stat
              label="Calorías totales hoy"
              value={h.today?.activeKcal !== undefined && h.today.restingKcal !== undefined ? fmtNum(h.today.activeKcal + h.today.restingKcal) : "–"}
              unit="kcal"
              sub="Activas + en reposo"
            />
            <Stat label="Último envío" value={last ? shortDate(last.date) : "–"} sub={last ? new Date(last.updatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : undefined} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Pasos" subtitle="Últimos 30 días">
              <SimpleBars data={h.last30} xKey="date" yKey="steps" name="Pasos" unit="" xFormat="day" />
            </Card>
            <Card title="Calorías activas" subtitle="Últimos 30 días">
              <SimpleBars data={h.last30} xKey="date" yKey="kcal" name="Calorías activas" unit="kcal" xFormat="day" />
            </Card>
          </div>
          <HealthMonths db={db} today={today} />
          {h.hasRecovery && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat
                  label="Sueño (3 noches)"
                  value={n1(rec.sleepAvg3)}
                  unit="h"
                  status={rec.sleepAvg3 === undefined ? undefined : rec.shortSleep ? { tone: "warn", label: "Poco: menos de 6,5 h" } : { tone: "good", label: "Bien" }}
                />
                <Stat
                  label="Pulso en reposo (3 días)"
                  value={n1(rec.restingHrAvg3)}
                  unit="ppm"
                  sub={rec.restingHrBase !== undefined ? `Lo normal para ti: ${n1(rec.restingHrBase)}` : "Hacen falta 2 semanas de datos para tu línea base"}
                  status={rec.restingHrBase === undefined ? undefined : rec.highRestingHr ? { tone: "warn", label: "Alto: posible fatiga" } : { tone: "good", label: "Normal" }}
                />
                <Stat
                  label="VFC (7 días)"
                  value={n1(rec.hrvAvg7)}
                  unit="ms"
                  sub={rec.hrvLow !== undefined ? `Tu rango normal: más de ${n1(rec.hrvLow)}` : "Hacen falta 2 semanas de datos para tu línea base"}
                  status={rec.hrvLow === undefined ? undefined : rec.lowHrv ? { tone: "warn", label: "Baja: posible fatiga" } : { tone: "good", label: "Normal" }}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title="Sueño" subtitle="Horas por noche, 30 días">
                  <TrendLine data={h.last30} dataKey="sleep" name="Sueño (h)" xKey="date" format="dec1" height={160} />
                </Card>
                <Card title="Pulso en reposo" subtitle="ppm, 30 días">
                  <TrendLine data={h.last30} dataKey="rhr" name="Pulso en reposo" xKey="date" color="s2" format="int" height={160} />
                </Card>
                <Card title="VFC" subtitle="ms, 30 días (más alta = más recuperado)">
                  <TrendLine data={h.last30} dataKey="hrv" name="VFC" xKey="date" color="s3" format="int" height={160} />
                </Card>
              </div>
              <p className="text-xs text-muted">
                El entrenador IA los tiene en cuenta: con poco sueño, el pulso en reposo alto o la VFC baja frente a tu línea base de 30 días, no sube la carga.
              </p>
            </>
          )}
        </>
      ) : (
        <Empty title="Aún no hay datos de Salud">Crea tu clave y el atajo de abajo: cada día llegarán tus pasos y tus calorías del iPhone (o del Apple Watch).</Empty>
      )}

      <Card title="Conectar con Salud del iPhone" subtitle="Con un atajo de la app Atajos: sin instalar nada más.">
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-semibold">1. Tu clave personal</p>
            <HealthKey hasKey={!!db.healthTokenHash} endpoint={endpoint} />
            {db.healthTokenHash && (
              <form action={revokeHealthKey} className="mt-2">
                <button className="text-xs text-muted underline hover:text-critical">Desactivar la clave</button>
              </form>
            )}
          </div>
          <div>
            <p className="mb-1 font-semibold">2. Crea el atajo en el iPhone</p>
            <p className="mb-3 text-ink-2">
              Abre la <strong className="text-ink">app Atajos</strong> (icono de dos cuadrados rosa y azul; no es Ajustes → Atajos) → pestaña Atajos → <em>+</em>. Cada
              acción se añade desde la barra <em>Buscar acciones</em> de abajo y se coloca al final: el orden importa.
            </p>
            <ol className="space-y-5">
              <ShortcutStep n={1} title="Pasos de los últimos 7 días">
                Busca <em>muestras</em> y añade <strong className="text-ink">Buscar muestras de salud</strong> (puede llamarse «Buscar muestras médicas»). Tipo{" "}
                <em>Pasos</em>, filtro <em>Fecha de inicio · está en los últimos 7 días</em>, <strong className="text-ink">Agrupar por: Día</strong> y unidad <em>contar</em>.
                Así cada envío lleva la semana entera: si un día el atajo no se ejecuta, el siguiente lo recupera.
              </ShortcutStep>
              <ShortcutStep n={2} title="Sus fechas y sus valores">
                Añade <strong className="text-ink">Obtener detalles de muestras de salud</strong> → <em>Fecha de inicio</em> y luego <strong className="text-ink">Definir variable</strong>{" "}
                <code>FechasPasos</code>. Otra vez <strong className="text-ink">Obtener detalles de muestras de salud</strong> (de las mismas muestras: toca el valor y elige el
                resultado del paso 1) → <em>Valor</em> y <strong className="text-ink">Definir variable</strong> <code>Pasos</code>.
              </ShortcutStep>
              <ShortcutStep n={3} title="Lo mismo con las calorías">
                Repite los pasos 1 y 2 con el tipo <em>Energía en actividad</em> (unidad <em>kcal</em>) y las variables <code>FechasKcal</code> y <code>Activas</code>.
              </ShortcutStep>
              <ShortcutStep n={4} img="4-buscar-url" w={600} h={831} title="La acción que envía">
                Busca <em>contenido</em> y elige <strong className="text-ink">Obtener contenido de URL</strong> (icono verde con flecha). No sirven «URL» ni «Abrir URL».
              </ShortcutStep>
              <ShortcutStep n={5} title="Configura el envío">
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    URL: <code className="break-all">{endpoint}</code>
                  </li>
                  <li>
                    Método: <em>POST</em>.
                  </li>
                  <li>
                    Cabeceras → Añadir nueva cabecera: <code>Authorization</code> y como valor lo copiado en el paso 1 (<code>Bearer rio_…</code>, con un espacio).
                  </li>
                  <li>
                    Cuerpo de la solicitud: <em>JSON</em>, cuatro campos de tipo <strong className="text-ink">Texto</strong>, con la clave escrita exactamente así:{" "}
                    <code>fechasPasos</code>, <code>pasos</code>, <code>fechasKcal</code> y <code>kcalActivas</code>. En cada uno, <em>Seleccionar variable</em> y elige la suya
                    (FechasPasos, Pasos y FechasKcal salen encima del teclado; en <code>kcalActivas</code>, «Seleccionar variable» y toca la acción «Obtener Valor» de las
                    calorías).
                  </li>
                </ul>
              </ShortcutStep>
              <ShortcutStep n={6} img="6-resultado" w={600} h={393} title="Pruébalo">
                Añade <strong className="text-ink">Mostrar resultado</strong> y pulsa <Icon name="play" className="h-3 w-3 align-[-1px]" />. La primera vez pide permiso para leer Salud: <em>Permitir</em>. Tiene que salir{" "}
                <code>&quot;ok&quot; : true</code> y «7 días guardados (del … al …)». Si da un error con una fecha o con las listas, mándame la captura. Si salen 0 pasos de
                día, revisa Ajustes → Salud → Acceso a datos → Atajos.
              </ShortcutStep>
            </ol>
          </div>
          <div>
            <p className="mb-1 font-semibold">3. Que se ejecute solo</p>
            <ol className="space-y-5">
              <ShortcutStep n={7} img="7-automatizacion" w={600} h={362} title="Cada noche a las 23:50">
                En Atajos → <em>Automatización</em> → <em>+</em> → <em>Hora del día</em>: 23:50, todos los días → <em>Ejecutar inmediatamente</em> (sin «Notificar al
                ejecutar») → elige tu atajo.
              </ShortcutStep>
              <ShortcutStep n={8} title="Y por la mañana, al quitar el cargador">
                Otra automatización: <em>Cargador</em> → <em>Se desconecta</em> → <em>Ejecutar inmediatamente</em> → el mismo atajo. iOS no deja leer Salud con el iPhone
                bloqueado, así que la de la noche a veces falla; la de la mañana (cuando lo coges) lo recupera. Como cada envío lleva 7 días, no se pierde ninguno aunque
                fallen varias seguidas. No hace falta pulsarlo nunca a mano.
              </ShortcutStep>
            </ol>
          </div>
          <div>
            <p className="mb-1 font-semibold">4. Opcional: recuperación (con Apple Watch)</p>
            <p className="mb-3 text-ink-2">
              Con VFC, pulso en reposo y sueño la IA sabe si estás recuperado sin que se lo digas. Añade estas acciones <strong className="text-ink">antes</strong> de
              «Obtener contenido de URL», igual que las de pasos.
            </p>
            <ol className="space-y-4">
              <ShortcutStep n={9} title="VFC → «VFC»">
                <strong className="text-ink">Buscar muestras de salud</strong>, tipo <em>Variabilidad de la frecuencia cardiaca</em>, filtro <em>Fecha de inicio · es hoy</em>.
                Luego <strong className="text-ink">Calcular estadísticas</strong> con <em>Media</em> y <strong className="text-ink">Definir variable</strong> <code>VFC</code>.
              </ShortcutStep>
              <ShortcutStep n={10} title="Pulso en reposo → «PulsoReposo»">
                Igual, con el tipo <em>Frecuencia cardiaca en reposo</em>, <em>Media</em> y la variable <code>PulsoReposo</code>.
              </ShortcutStep>
              <ShortcutStep n={11} title="Sueño → «Sueno»">
                <strong className="text-ink">Buscar muestras de salud</strong>, tipo <em>Análisis del sueño</em>, filtro <em>Fecha de inicio · está en los últimos 1 días</em> y{" "}
                <em>Valor · no es · En la cama</em> (si no aparece ese filtro, déjalo sin él). Luego <strong className="text-ink">Obtener detalles de muestras de salud</strong> →{" "}
                <em>Duración</em>, <strong className="text-ink">Calcular estadísticas</strong> con <em>Suma</em> y la variable <code>Sueno</code>. Vale en horas, minutos o
                segundos: la app lo entiende.
              </ShortcutStep>
              <ShortcutStep n={12} title="Añádelos al envío">
                En el cuerpo JSON de «Obtener contenido de URL», tres campos más de tipo <em>Número</em>: <code>vfc</code>, <code>pulsoReposo</code> y <code>sueno</code>, con sus
                variables. Al ejecutarlo, la respuesta debe seguir diciendo <code>&quot;ok&quot; : true</code>. Si un día no hay dato (sin reloj puesto), no pasa nada.
              </ShortcutStep>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthName = (ym: string) => MONTH_NAMES[Number(ym.slice(5, 7)) - 1];

/** Pasos y calorías por meses: el mes en curso frente al anterior, la evolución y la tabla. */
function HealthMonths({ db, today }: { db: Db; today: string }) {
  const months = monthlyHealth(db.health);
  if (!months.length) return null;
  const cur = months.find((m) => m.month === today.slice(0, 7)) ?? months[months.length - 1];
  const prev = months[months.indexOf(cur) - 1];
  const pct = (a?: number, b?: number) => (a !== undefined && b ? Math.round(((a - b) / b) * 100) : undefined);
  const delta = pct(cur.avgSteps, prev?.avgSteps);
  return (
    <Card title={`Este mes: ${monthName(cur.month)}`} subtitle={prev ? `Comparado con ${monthName(prev.month)}` : "Tu primer mes con datos"}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Media diaria"
          value={cur.avgSteps !== undefined ? fmtNum(cur.avgSteps) : "–"}
          unit="pasos"
          sub={delta !== undefined ? `${delta > 0 ? "+" : ""}${delta} % que en ${monthName(prev!.month)}` : `${cur.days} días con datos`}
        />
        <Stat label="Pasos del mes" value={fmtNum(cur.steps)} sub={`${cur.days} días con datos`} />
        <Stat label="Días de 10.000+" value={cur.days10k} sub={prev ? `${prev.days10k} en ${monthName(prev.month)}` : undefined} />
        <Stat label="Mejor día" value={cur.bestDay ? fmtNum(cur.bestDay.steps) : "–"} unit={cur.bestDay ? "pasos" : undefined} sub={cur.bestDay ? shortDate(cur.bestDay.date) : undefined} />
      </div>
      {months.length > 1 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted">Media de pasos por día, mes a mes</p>
          <SimpleBars data={months.map((m) => ({ month: `${m.month}-01`, steps: m.avgSteps ?? 0 }))} xKey="month" yKey="steps" name="Media de pasos" unit="" xFormat="month" height={180} />
        </div>
      )}
      <table className="mt-4 w-full text-sm tabular">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-2 font-medium">Mes</th>
            <th className="pb-2 text-right font-medium">Media/día</th>
            <th className="pb-2 text-right font-medium">10.000+</th>
            <th className="hidden pb-2 text-right font-medium sm:table-cell">Total</th>
            <th className="pb-2 text-right font-medium">kcal/día</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {[...months].reverse().map((m) => (
            <tr key={m.month}>
              <td className="py-1.5 capitalize">{monthName(m.month)} {m.month.slice(2, 4)}</td>
              <td className="py-1.5 text-right font-semibold">{m.avgSteps !== undefined ? fmtNum(m.avgSteps) : "–"}</td>
              <td className="py-1.5 text-right">{m.days10k}</td>
              <td className="hidden py-1.5 text-right sm:table-cell">{fmtNum(m.steps)}</td>
              <td className="py-1.5 text-right">{m.avgKcal !== undefined ? fmtNum(m.avgKcal) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {months.length < 3 && (
        <p className="mt-3 text-xs text-muted">
          Para ver los meses anteriores, cambia una vez en el atajo los dos «últimos 7 días» por <strong>365</strong>, ejecútalo y vuelve a dejarlo en 7.
        </p>
      )}
    </Card>
  );
}

/** Paso de la guía del atajo con su captura del iPhone (public/atajo, la clave personal va tapada). */
function ShortcutStep({ n, title, img, w = 600, h = 600, children }: { n: number; title: string; img?: string; w?: number; h?: number; children: ReactNode }) {
  return (
    <li className={`grid grid-cols-1 gap-3 ${img ? "sm:grid-cols-[1fr_220px]" : ""}`}>
      <div className="text-ink-2">
        <p className="mb-1 font-semibold text-ink">
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-accent-ink">{n}</span>
          {title}
        </p>
        {children}
      </div>
      {img && <Image src={`/atajo/${img}.webp`} width={w} height={h} alt={`Captura del paso ${n}: ${title}`} unoptimized className="h-auto w-full max-w-[260px] rounded-xl border border-line sm:max-w-none" />}
    </li>
  );
}

// ---------------- Editar ----------------

function Editar({ db, today, initialFocus }: { db: Db; today: string; initialFocus?: Focus }) {
  const { profile } = db;
  const avg = profileAverages(db.activities, today);
  const outdated = profile && avg && (Math.abs(avg.weeklyKm - profile.weeklyKm) >= 3 || Math.abs(avg.longestRunKm - profile.longestRunKm) >= 2);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProfileForm key={`${profile?.weeklyKm}-${profile?.longestRunKm}-${profile?.focus}`} profile={profile} initialFocus={initialFocus} />
      </div>
      {profile && (
        <div className="space-y-4">
          <Card title="Lo que la IA sabe de ti" subtitle="Lo tienen en cuenta el chat, tus rutinas y el ajuste del plan">
            <AiMemory list={db.aiPreferences ?? []} />
          </Card>
          {avg && (
            <Card title="Tus promedios reales" subtitle="Últimas 6 semanas, calculados con tus entrenos">
              <ul className="divide-y divide-line text-sm">
                <Row label="Km por semana" value={`${avg.weeklyKm} km`} note={`En el perfil: ${profile.weeklyKm}`} />
                <Row label="Tirada más larga" value={`${fmtKm(avg.longestRunKm)} km`} note={`En el perfil: ${profile.longestRunKm}`} />
                <Row label="Días corriendo / sem" value={fmtKm(avg.runDaysPerWeek)} />
                <Row label="Fuerza / sem" value={fmtKm(avg.strengthPerWeek)} />
              </ul>
              {outdated ? (
                <form action={syncProfileAverages} className="mt-3">
                  <button className="btn w-full">Actualizar el perfil con estos datos</button>
                </form>
              ) : (
                <p className="mt-3 text-xs text-good-ink">✓ Tu perfil está al día con tus entrenos.</p>
              )}
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="IMC" value={bmi(profile.weightKg, profile.heightCm).toFixed(1)} sub={bmiLabel(bmi(profile.weightKg, profile.heightCm))} />
            <Stat label="FC máx" value={hrMaxOf(profile)} unit="ppm" sub={profile.hrMax ? "Medida" : "Estimada (Tanaka)"} />
          </div>
          <Card title="Borrar mi cuenta" subtitle={<Link href="/privacidad" className="underline">Política de privacidad</Link>}>
            <DeleteAccountForm />
          </Card>
          <Card title="Tus zonas de frecuencia cardiaca" subtitle={`Karvonen · FC reposo ${hrRestOf(profile)} ppm`}>
            <table className="w-full text-sm tabular">
              <tbody className="divide-y divide-line">
                {hrZones(hrMaxOf(profile), hrRestOf(profile)).map((z) => (
                  <tr key={z.zone}>
                    <td className="py-2 pr-2 font-semibold">Z{z.zone}</td>
                    <td className="py-2 pr-2">
                      {z.name}
                      <span className="block text-xs text-muted">{z.purpose}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      {z.min}–{z.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------- Piezas ----------------

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="text-ink-2">{label}</span>
      <span className="text-right font-semibold tabular">
        {value}
        {note && <span className="block text-[11px] font-normal text-muted">{note}</span>}
      </span>
    </li>
  );
}

async function ActivityList({ acts }: { acts: Activity[] }) {
  // nombres para «con quién»; la lectura de usuarios se memoriza por petición
  const names = new Map((await getFriends(await requireUserId())).map((f) => [f.id, f.name]));
  const { db, stats } = await getAnalysis();
  const tags = tagsForDb(db, stats?.vdot.vdot);
  return (
    <ul className="divide-y divide-line">
      {acts.map((a) => (
        <ActivityItem
          key={a.id}
          a={a}
          href={`/actividad/${encodeURIComponent(a.id)}`}
          names={names}
          tags={tags.get(a.id)}
          action={
            <Link href={`/registrar?editar=${encodeURIComponent(a.id)}`} className="shrink-0 text-xs font-semibold text-accent">
              Editar
            </Link>
          }
        />
      ))}
    </ul>
  );
}
