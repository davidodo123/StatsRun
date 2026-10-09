import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAnalysis } from "@/lib/analysis";
import { logout } from "@/app/auth-actions";
import { syncProfileAverages } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { SessionCard } from "@/components/SessionCard";
import { SimpleBars } from "@/components/charts";
import { Card, Empty, Loading, PageHeader, Pill, Stat } from "@/components/ui";
import { bmi, bmiLabel, hrMaxOf, hrRestOf, hrZones } from "@/lib/engine/physiology";
import { achievements, bestTimes, periodAverages, profileAverages, strengthSummary, type Achievement, type PeriodAvg } from "@/lib/engine/profile";
import type { SessionMatch } from "@/lib/engine/planner";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { diffDays, mondayOf, shortDate } from "@/lib/dates";
import type { Activity, Db, Phase } from "@/lib/types";
import type { Stats } from "@/lib/engine/stats";
import { ActivityItem } from "@/components/ActivityItem";
import { tagsForDb } from "@/lib/engine/tags";
import { getFriends } from "@/lib/auth";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Perfil" };

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "running", label: "Running" },
  { id: "fuerza", label: "Fuerza" },
  { id: "actividades", label: "Actividades" },
  { id: "logros", label: "Logros" },
  { id: "editar", label: "Editar perfil" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const LEVEL: Record<string, string> = { nuevo: "Empezando", principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" };
const PHASE_LABEL: Record<Phase, string> = { base: "Base", construccion: "Construcción", especifico: "Específico", taper: "Afinado" };
const PAGE_SIZE = 25;

export default function PerfilPage({ searchParams }: PageProps<"/perfil">) {
  return (
    <>
      <PageHeader
        title="Tu perfil"
        subtitle="Tus marcas, tu progreso y tu preparación en un solo sitio."
        action={
          <form action={logout}>
            <button className="btn btn-ghost">Cerrar sesión</button>
          </form>
        }
      />
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/perfil">["searchParams"] }) {
  const sp = await searchParams;
  const { db, stats, matches, today } = await getAnalysis();
  const requested = typeof sp.tab === "string" ? sp.tab : "resumen";
  // sin perfil solo tiene sentido el formulario
  const tab: Tab = !db.profile || !stats ? "editar" : (TABS.find((t) => t.id === requested)?.id ?? "resumen");

  return (
    <div className="space-y-4">
      {db.profile && stats && <ProfileHeader db={db} stats={stats} />}
      <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Secciones del perfil">
        <div className="flex w-max gap-1 rounded-xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "resumen" ? "/perfil" : `/perfil?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${t.id === tab ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {tab === "resumen" && <Resumen db={db} stats={stats!} matches={matches} today={today} />}
      {tab === "running" && <Running db={db} stats={stats!} today={today} />}
      {tab === "fuerza" && <Fuerza db={db} today={today} />}
      {tab === "actividades" && <Actividades db={db} sport={typeof sp.deporte === "string" ? sp.deporte : "todos"} page={Number(sp.pagina) || 1} />}
      {tab === "logros" && <Logros list={achievements(db.activities, matches)} />}
      {tab === "editar" && <Editar db={db} today={today} />}
    </div>
  );
}

// ---------------- Cabecera ----------------

function ProfileHeader({ db, stats }: { db: Db; stats: Stats }) {
  const p = db.profile!;
  const T = stats.totals;
  const initials = p.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 md:p-5">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-accent-ink" aria-hidden>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{p.name}</p>
        <p className="text-xs text-ink-2">
          {LEVEL[p.level]} · {p.age} años · VDOT {stats.vdot.vdot.toFixed(1)}
          {db.goal && ` · Objetivo: ${db.goal.name}`}
        </p>
      </div>
      <dl className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:gap-6">
        <div>
          <dt className="text-[11px] text-muted">Km totales</dt>
          <dd className="font-bold tabular">{fmtNum(T.allKm)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Carreras</dt>
          <dd className="font-bold tabular">{T.allRuns}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Horas</dt>
          <dd className="font-bold tabular">{fmtNum(T.allHours)}</dd>
        </div>
      </dl>
    </section>
  );
}

// ---------------- Resumen ----------------

function Resumen({ db, stats, matches, today }: { db: Db; stats: Stats; matches?: Map<string, SessionMatch>; today: string }) {
  const recent = [...db.activities].sort((a, b) => b.startLocal.localeCompare(a.startLocal)).slice(0, 5);
  const logros = achievements(db.activities, matches);
  const unlocked = logros.filter((a) => a.unlocked).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
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
                  <span className="block text-2xl" aria-hidden>
                    {a.icon}
                  </span>
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
        <Link href="/plan" className="text-xs font-semibold text-accent">
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
      <div className="grid gap-4 lg:grid-cols-3">
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm tabular">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">Métrica</th>
              {rows.map((r) => (
                <th key={r.label} className="pb-2 text-right font-medium">
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
                  {rows.map((r) => {
                    const v = m.get(r);
                    return (
                      <td key={r.label} className="py-1.5 text-right">
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
      <div className="grid gap-4 lg:grid-cols-3">
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
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list
              .filter((a) => a.group === g)
              .map((a) => (
                <li key={a.id} className={`flex gap-3 rounded-xl border p-3 ${a.unlocked ? "border-accent bg-surface-2" : "border-line"}`}>
                  <span className={`text-2xl ${a.unlocked ? "" : "opacity-30 grayscale"}`} aria-hidden>
                    {a.icon}
                  </span>
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

// ---------------- Editar ----------------

function Editar({ db, today }: { db: Db; today: string }) {
  const { profile } = db;
  const avg = profileAverages(db.activities, today);
  const outdated = profile && avg && (Math.abs(avg.weeklyKm - profile.weeklyKm) >= 3 || Math.abs(avg.longestRunKm - profile.longestRunKm) >= 2);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProfileForm key={`${profile?.weeklyKm}-${profile?.longestRunKm}`} profile={profile} />
      </div>
      {profile && (
        <div className="space-y-4">
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
