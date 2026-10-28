import type { Metadata } from "next";
import { planText } from "@/lib/i18n/planText";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getAnalysis, viewTodayMadrid } from "@/lib/analysis";
import { revokeHealthKey, syncProfileAverages } from "@/app/actions";
import { HealthKey } from "@/components/HealthKey";
import { HealthConnectCard } from "@/components/HealthConnectCard";
import { healthSummary, monthlyHealth, recoverySignals, todayMadrid } from "@/lib/health";
import { ProfileForm } from "@/components/ProfileForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { SessionCard } from "@/components/SessionCard";
import { UndoSkip } from "@/components/UndoSkip";
import { SimpleBars, TrendLine } from "@/components/charts";
import { Card, ChipLink, Empty, Loading, Pill, Stat } from "@/components/ui";
import { bmi, bmiLabel, hrMaxOf, hrRestOf, hrZones } from "@/lib/engine/physiology";
import { achievements, bestTimes, periodAverages, profileAverages, strengthSummary, type Achievement, type PeriodAvg } from "@/lib/engine/profile";
import type { SessionMatch } from "@/lib/engine/planner";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "@/lib/format";
import { diffDays, mondayOf } from "@/lib/dates";
import { focusOf, type Activity, type Db, type Focus } from "@/lib/types";
import { workoutVolume } from "@/lib/strength/workouts";
import type { Stats } from "@/lib/engine/stats";
import { ActivityItem } from "@/components/ActivityItem";
import { tagsForDb } from "@/lib/engine/tags";
import { viewFriends, viewUser } from "@/lib/authView";
import { AvatarPicker } from "@/components/AvatarPicker";
import { ProfileCalendar, type CalendarDay } from "@/components/ProfileCalendar";
import { requireViewerId } from "@/lib/session";
import { Icon } from "@/components/icons";
import { AiMemory } from "@/components/AiMemory";
import { TuLinks } from "@/components/Nav";
import { LanguageSelect } from "@/components/LanguageSelect";
import { getT } from "@/lib/i18n/server";
import { dayMonth, intlLocale, translator, type Key, type Locale, type T } from "@/lib/i18n";
import { viewIsAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Perfil" };

// Logros y Editar (botones de la cabecera) no van en la fila de pestañas
const TABS = [
  { id: "resumen", label: "perfil.resumen" },
  { id: "running", label: "perfil.running" },
  { id: "fuerza", label: "perfil.fuerza" },
  { id: "actividades", label: "perfil.actividades", short: "perfil.entrenos" },
  { id: "salud", label: "perfil.salud" },
  { id: "logros", label: "perfil.logros", hidden: true },
  { id: "editar", label: "perfil.editar", hidden: true },
] as const satisfies readonly { id: string; label: Key; short?: Key; hidden?: true }[];
type Tab = (typeof TABS)[number]["id"];

const LEVEL: Record<string, Key> = { nuevo: "perfil.nivel.nuevo", principiante: "perfil.nivel.principiante", intermedio: "perfil.nivel.intermedio", avanzado: "perfil.nivel.avanzado" };
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
  const [{ db, stats, matches, today }, me, { locale, t: tr }] = await Promise.all([getAnalysis(), requireViewerId().then(viewUser), getT()]);
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
        <ProfileHeader db={db} stats={stats} tab={tab} picture={me?.picture} tr={tr}>
          {/* las pestañas, dentro de la misma tarjeta: todas a la vista también en el móvil */}
          <nav aria-label={tr("perfil.secciones")} className="mt-4 border-t border-line pt-3">
            {/* sin cortar los nombres: en otros idiomas son más largos y, si no caben, la fila se desliza */}
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
              {tabs
                .filter((t) => !("hidden" in t))
                .map((t) => (
                  <Link
                    key={t.id}
                    href={t.id === first ? "/perfil" : `/perfil?tab=${t.id}`}
                    aria-current={t.id === tab ? "page" : undefined}
                    className={`flex-auto shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-center text-[13px] font-medium md:flex-none md:px-3 md:text-sm ${t.id === tab ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}
                  >
                    {"short" in t ? (
                      <>
                        <span className="sm:hidden">{tr(t.short)}</span>
                        <span className="hidden sm:inline">{tr(t.label)}</span>
                      </>
                    ) : (
                      tr(t.label)
                    )}
                  </Link>
                ))}
            </div>
          </nav>
        </ProfileHeader>
      )}
      {/* en el móvil, «Tú» guarda lo que no cabe en la barra de abajo */}
      {db.profile && stats && tab === first && <TuLinks focus={focus} admin={await viewIsAdmin(me?.id ?? "")} locale={locale} />}

      {tab === "resumen" && <Resumen db={db} stats={stats!} matches={matches} today={today} locale={locale} />}
      {tab === "running" && <Running db={db} stats={stats!} today={today} locale={locale} />}
      {tab === "fuerza" && <Fuerza db={db} today={today} locale={locale} />}
      {tab === "actividades" && <Actividades db={db} sport={typeof sp.deporte === "string" ? sp.deporte : "todos"} page={Number(sp.pagina) || 1} locale={locale} />}
      {tab === "logros" && <Logros list={achievements(db.activities, matches)} locale={locale} />}
      {tab === "salud" && <Salud db={db} locale={locale} />}
      {tab === "editar" && <Editar db={db} today={today} initialFocus={foco} locale={locale} name={me?.name} />}
    </div>
  );
}

// ---------------- Cabecera ----------------

function ProfileHeader({ db, stats, tab, picture, tr, children }: { db: Db; stats: Stats; tab: Tab; picture?: string; tr: T; children: ReactNode }) {
  const p = db.profile!;
  const T = stats.totals;
  const strengthOnly = focusOf(p) === "fuerza";
  const lifts = db.activities.filter((a) => a.workout);
  const cells = strengthOnly
    ? [
        [tr("perfil.entrenos"), fmtNum(lifts.length)],
        [tr("perfil.toneladas"), fmtNum(lifts.reduce((t, a) => t + workoutVolume(a.workout!), 0) / 1000, 1)],
        [tr("perfil.horas"), fmtNum(lifts.reduce((t, a) => t + a.movingSec, 0) / 3600)],
      ]
    : [
        [tr("perfil.kmTotales"), fmtKm(T.allKm, 2)],
        [tr("perfil.carreras"), fmtNum(T.allRuns)],
        [tr("perfil.horas"), fmtNum(T.allHours)],
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
        <AvatarPicker picture={picture} initials={initials} custom={Boolean(picture?.startsWith("/api/avatar/"))} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{p.name}</p>
          <p className="text-xs text-ink-2">
            {strengthOnly ? tr("perfil.fuerza") : `${LEVEL[p.level] ? tr(LEVEL[p.level]) : p.level} · `}
            {strengthOnly ? ` · ${tr("perfil.anos", { edad: p.age })}` : `${tr("perfil.anos", { edad: p.age })} · VDOT ${stats.vdot.vdot.toFixed(1)}`}
            {db.goal && ` · ${tr("perfil.objetivo", { carrera: db.goal.name })}`}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:order-last sm:self-center">
          <Link href="/perfil?tab=logros" aria-label={tr("perfil.logros")} aria-current={tab === "logros" ? "page" : undefined} className={btn(tab === "logros")}>
            <Icon name="trophy" className="h-[18px] w-[18px]" />
          </Link>
          <Link href="/perfil?tab=editar" aria-label={tr("perfil.editar")} aria-current={tab === "editar" ? "page" : undefined} className={btn(tab === "editar")}>
            <Icon name="edit" className="h-[18px] w-[18px]" />
          </Link>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:gap-6">
          {cells.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-muted">{label}</dt>
              <dd className="font-display text-2xl leading-none tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {children}
    </section>
  );
}

// ---------------- Resumen ----------------

/** Descripción de un logro en el idioma. */
function logroDetail(a: Achievement, t: T): string {
  const i = a.id.indexOf("-");
  const [kind, n] = [a.id.slice(0, i), a.id.slice(i + 1)];
  if (kind === "dist") return t("lg.d.dist", { km: Number(n) < 21 ? n : Number(n).toFixed(1) });
  if (kind === "pace" || kind === "strength") return t(`lg.d.${kind}`);
  if (a.id === "plan-perfect-week") return t("lg.d.plan-perfect-week");
  if (kind === "total" || kind === "week" || kind === "streak" || kind === "plan") return t(`lg.d.${kind}` as Key, { n });
  return t(`lg.d.${a.id}` as Key);
}

/** Nombre de un logro en el idioma, a partir de su id («streak-7», «plan-25»…). */
function logroTitle(a: Achievement, t: T): string {
  const [kind, n] = [a.id.slice(0, a.id.indexOf("-")), a.id.slice(a.id.indexOf("-") + 1)];
  if (kind === "total" || kind === "week" || kind === "streak" || kind === "plan") return n === "perfect-week" ? t("lg.plan-perfect-week") : t(`lg.${kind}` as Key, { n });
  if (kind === "pace") {
    const [d, sec] = n.split("-");
    return t("lg.pace", { d, m: Number(sec) / 60 });
  }
  if (kind === "strength") return n === "1" ? t("lg.strength1") : t("lg.strength", { n });
  return t(`lg.${a.id}` as Key);
}

function Resumen({ db, stats, matches, today, locale }: { db: Db; stats: Stats; matches?: Map<string, SessionMatch>; today: string; locale: Locale }) {
  const t = translator(locale);
  const recent = [...db.activities].sort((a, b) => b.startLocal.localeCompare(a.startLocal)).slice(0, 5);
  const logros = achievements(db.activities, matches);
  const unlocked = logros.filter((a) => a.unlocked).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Preparacion db={db} matches={matches} today={today} locale={locale} />
        <ProfileCalendar days={calendarDays(db, matches, today, locale)} today={today} locale={locale} />
        <Card
          title={t("pr.recientes")}
          action={<ChipLink href="/perfil?tab=actividades">{t("pr.verTodas")}</ChipLink>}
        >
          {recent.length ? <ActivityList acts={recent} locale={locale} /> : <p className="text-sm text-ink-2">{t("pr.sinSesiones")}</p>}
        </Card>
      </div>
      <div className="space-y-4">
        <BestTimesCard acts={db.activities} locale={locale} />
        <Card
          title={t("perfil.logros")}
          subtitle={t("pr.conseguidos", { n: unlocked.length, total: logros.length })}
          action={<ChipLink href="/perfil?tab=logros">{t("pr.verTodos")}</ChipLink>}
        >
          {unlocked.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {unlocked.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-xl bg-surface-2 p-2 text-center" title={logroDetail(a, t)}>
                  <Icon name={a.icon} className="mx-auto mb-1 block h-7 w-7 text-accent" />
                  <span className="block text-[11px] font-medium leading-tight">{logroTitle(a, t)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">{t("pr.vitrina")}</p>
          )}
        </Card>
        <Card title={t("pr.forma")}>
          <ul className="divide-y divide-line text-sm">
            <Row label="VDOT" value={stats.vdot.vdot.toFixed(1)} />
            <Row label={t("st.media6")} value={t("pr.kmSem", { n: fmtKm(stats.totals.avgWeeklyKm6) })} />
            <Row label={t("st.racha")} value={t("st.diasN", { n: stats.totals.streakDays })} />
            <Row label={t("pr.constancia12")} value={`${Math.round(stats.totals.consistency)} %`} />
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Lo de cada día para el calendario: entrenos hechos y sesiones del plan (por hacer o que no se hicieron). */
function calendarDays(db: Db, matches: Map<string, SessionMatch> | undefined, today: string, locale: Locale): Record<string, CalendarDay> {
  const days: Record<string, CalendarDay> = {};
  const at = (d: string) => (days[d] ??= { acts: [], plan: [] });
  for (const a of db.activities) at(a.date).acts.push({ id: a.id, name: a.name, sport: a.sport, km: Math.round(a.distanceM / 10) / 100, min: Math.round(a.movingSec / 60) });
  for (const s of db.plan?.weeks.flatMap((w) => w.sessions) ?? []) {
    const status = matches?.get(s.id)?.status;
    // las hechas ya salen como entreno; las pasadas sin hacer, como «no hecho»
    if (status === "done" || status === "partial") continue;
    at(s.date).plan.push({ id: s.id, title: planText(s.title, locale), km: s.distanceKm, min: s.durationMin, strength: s.type === "strength", pending: s.date >= today });
  }
  return days;
}

function Preparacion({ db, matches, today, locale }: { db: Db; matches?: Map<string, SessionMatch>; today: string; locale: Locale }) {
  const t = translator(locale);
  const plan = db.plan;
  if (!plan)
    return (
      <Card title={t("pr.prep")}>
        <Empty title={t("inicio.sinPlan")} href="/carreras" cta={t("inicio.elegirCarrera")}>
          {t("pr.sinPlanTexto")}
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
      title={t("pr.prep")}
      subtitle={`${plan.goal.name} · ${dayMonth(plan.goal.date, locale)}${plan.goal.targetTimeSec ? ` · ${t("car.objetivo", { t: fmtDuration(plan.goal.targetTimeSec) })}` : ""}`}
      action={<ChipLink href="/plan/actual">{t("inicio.verPlan")}</ChipLink>}
    >
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-[11px] text-muted">{t("pr.faltan")}</p>
          <p className="font-bold tabular">{daysLeft >= 0 ? t("st.diasN", { n: daysLeft }) : t("pr.hecha")}</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-[11px] text-muted">{t("am.semana")}</p>
          <p className="font-bold tabular">{week ? t("pr.semanaDe", { n: idx + 1, total: plan.weeks.length }) : "–"}</p>
          {week && (
            <p className="text-[11px] text-ink-2">
              {t(`plan.fase.${week.phase}`)}
              {week.recovery ? ` · ${t("plan.descarga")}` : ""}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-surface-2 p-2">
          <p className="text-[11px] text-muted">{t("pr.cumplidas")}</p>
          <p className="font-bold tabular">{past.length ? `${done}/${past.length}` : "–"}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("pr.avance")}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
      </div>
      {week && <p className="mt-2 text-xs text-ink-2">{planText(week.focus, locale)}</p>}
      {next.length > 0 && (
        <div className="mt-3 space-y-2">
          <UndoSkip db={db} today={today} className="" locale={locale} />
          {next.map((s) => (
            <SessionCard key={s.id} s={s} match={matches?.get(s.id)} compact today={today} locale={locale} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------- Running ----------------

function Running({ db, stats, today, locale }: { db: Db; stats: Stats; today: string; locale: Locale }) {
  const t = translator(locale);
  const T = stats.totals;
  const runsList = db.activities.filter((a) => a.sport === "run").sort((a, b) => b.startLocal.localeCompare(a.startLocal));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("st.kmAno")} value={fmtNum(T.yearKm)} unit="km" sub={t("st.carreras", { n: T.yearRuns })} />
        <Stat label={t("st.kmMes")} value={fmtKm(T.monthKm)} unit="km" />
        <Stat label={t("st.media6")} value={fmtKm(T.avgWeeklyKm6)} unit={t("st.kmSem")} />
        <Stat label={t("pt.desnivelTotal")} value={fmtNum(T.elevation)} unit="m" />
      </div>
      <ImprovementTable rows={periodAverages(db.activities, today)} t={t} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BestTimesCard acts={db.activities} locale={locale} />
        <Card title={t("pt.ultimasCarreras")} className="lg:col-span-2">
          {runsList.length ? <ActivityList acts={runsList.slice(0, 10)} locale={locale} /> : <p className="text-sm text-ink-2">{t("pt.sinCarreras")}</p>}
          {runsList.length > 10 && (
            <ChipLink href="/perfil?tab=actividades&deporte=run" className="mt-3">
              {t("pt.verCarreras", { n: runsList.length })}
            </ChipLink>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Tabla de mejora: medias de 3 bloques de 4 semanas y cambio del último respecto al anterior. */
function ImprovementTable({ rows, t }: { rows: PeriodAvg[]; t: T }) {
  const [now, prev] = rows;
  type Metric = { label: Key; get: (r: PeriodAvg) => number | undefined; fmt: (v: number) => string; better: "up" | "down" };
  const METRICS: Metric[] = [
    { label: "pt.m.km", get: (r) => r.kmPerWeek, fmt: (v) => fmtKm(v), better: "up" },
    { label: "pt.m.carreras", get: (r) => r.runsPerWeek, fmt: (v) => fmtKm(v), better: "up" },
    { label: "pt.m.ritmo", get: (r) => r.avgPace, fmt: fmtPace, better: "down" },
    { label: "pt.m.fc", get: (r) => r.avgHr, fmt: (v) => String(Math.round(v)), better: "down" },
    { label: "pt.m.ef", get: (r) => r.ef, fmt: (v) => v.toFixed(2), better: "up" },
    { label: "pt.m.cadencia", get: (r) => r.cadence, fmt: (v) => String(Math.round(v)), better: "up" },
    { label: "pt.m.tirada", get: (r) => r.longestKm || undefined, fmt: (v) => `${fmtKm(v)} km`, better: "up" },
    { label: "pt.m.fuerza", get: (r) => r.strengthPerWeek, fmt: (v) => fmtKm(v), better: "up" },
  ];
  return (
    <Card title={t("pt.mejora")} subtitle={t("pt.mejoraSub")}>
      <div>
        <table className="w-full text-sm tabular">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">{t("pt.metrica")}</th>
              {rows.map((r, i) => (
                <th key={r.label} className={`pb-2 pl-2 text-right font-medium ${i === 2 ? "hidden sm:table-cell" : ""}`}>
                  {t(`pt.b.${r.label}` as Key)}
                </th>
              ))}
              <th className="pb-2 text-right font-medium">{t("pt.cambio")}</th>
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
                  <td className="py-1.5">{t(m.label)}</td>
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
      <p className="mt-2 text-xs text-muted">{t("pt.mejoraNota")}</p>
    </Card>
  );
}

function BestTimesCard({ acts, locale = "es" }: { acts: Activity[]; locale?: Locale }) {
  const t = translator(locale);
  const list = bestTimes(acts);
  return (
    <Card title={t("pr.mejores")} subtitle={t("pr.mejoresSub")}>
      {list.length ? (
        <ul className="divide-y divide-line text-sm">
          {list.map((b) => (
            <li key={b.label} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block font-medium">{t(`pr.d.${b.label}` as Key)}</span>
                <span className="block truncate text-xs text-muted">
                  {b.activity.name} · {dayMonth(b.activity.date, locale)}
                  {!b.exact && t("pr.estimado", { km: fmtKm(b.activity.distanceM / 1000) })}
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
        <p className="text-sm text-ink-2">{t("pr.corre5")}</p>
      )}
    </Card>
  );
}

// ---------------- Fuerza ----------------

function Fuerza({ db, today, locale }: { db: Db; today: string; locale: Locale }) {
  const t = translator(locale);
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
        <Stat label={t("pt.sesionesTotales")} value={s.total} sub={t("pt.hTotal", { h: fmtNum(s.totalMin / 60, 1) })} />
        <Stat label={t("pt.ult4")} value={s.last28} sub={t("pt.min", { n: s.min28 })} />
        <Stat label={t("pt.mediaSemanal")} value={fmtKm(s.perWeek28)} sub={target ? t("pt.objetivo", { n: target }) : t("pt.recomendado")} />
        <Stat label={t("pt.ultimaSesion")} value={s.last ? dayMonth(s.last.date, locale) : "–"} sub={s.last ? t("pt.haceDias", { n: diffDays(today, s.last.date) }) : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={t("pt.porSemana")} subtitle={t("pt.ult12")} className="lg:col-span-2">
          <SimpleBars data={s.weeks.map((w) => ({ week: w.week, n: w.count }))} xKey="week" yKey="n" name={t("pt.sesiones")} unit="" xFormat="day" height={200} locale={locale} />
        </Card>
        <Card title={t("pt.proximas")}>
          {upcoming?.length ? (
            <div className="space-y-2">
              {upcoming.map((x) => (
                <SessionCard key={x.id} s={x} compact locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-2">{db.plan ? t("pt.sinProximas") : t("pt.sinPlan")}</p>
          )}
          <p className="mt-3 text-xs text-muted">{t("pt.fuerzaNota")}</p>
          <Link href="/fuerza" className="btn btn-ghost mt-3 w-full">
            {t("pt.ejMaterial")} <Icon name="chevron" />
          </Link>
        </Card>
      </div>
      <Card title={t("pt.historialFuerza")}>
        {list.length ? <ActivityList acts={list.slice(0, 20)} locale={locale} /> : <p className="text-sm text-ink-2">{t("pt.sinFuerza")}</p>}
      </Card>
    </div>
  );
}

// ---------------- Actividades ----------------

const SPORT_FILTERS: { id: string; label: Key }[] = [
  { id: "todos", label: "pt.f.todos" },
  { id: "run", label: "sport.run" },
  { id: "strength", label: "sport.strength" },
  { id: "otros", label: "pt.f.otros" },
];

function Actividades({ db, sport, page, locale }: { db: Db; sport: string; page: number; locale: Locale }) {
  const t = translator(locale);
  const filtered = db.activities
    .filter((a) => (sport === "run" ? a.sport === "run" : sport === "strength" ? a.sport === "strength" : sport === "otros" ? a.sport !== "run" && a.sport !== "strength" : true))
    .sort((a, b) => b.startLocal.localeCompare(a.startLocal));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const href = (s: string, p = 1) => `/perfil?tab=actividades${s !== "todos" ? `&deporte=${s}` : ""}${p > 1 ? `&pagina=${p}` : ""}`;
  const km = filtered.reduce((s, a) => s + a.distanceM, 0) / 1000;
  const sec = filtered.reduce((s, a) => s + a.movingSec, 0);
  return (
    <Card title={t("pt.todas")} subtitle={t("pt.todasSub", { n: filtered.length, km: fmtNum(km), h: fmtNum(sec / 3600) })}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SPORT_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            aria-current={f.id === sport ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${f.id === sport ? "border-accent bg-surface-2 text-ink" : "border-line text-ink-2 hover:border-accent"}`}
          >
            {t(f.label)}
          </Link>
        ))}
      </div>
      {filtered.length ? <ActivityList acts={filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} locale={locale} /> : <p className="text-sm text-ink-2">{t("pt.sinFiltro")}</p>}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          {current > 1 ? (
            <Link href={href(sport, current - 1)} className="font-semibold text-accent">
              {t("pt.recientes")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            {t("pt.pagina", { n: current, total: pages })}
          </span>
          {current < pages ? (
            <ChipLink href={href(sport, current + 1)}>{t("pt.antiguas")}</ChipLink>
          ) : (
            <span />
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------- Logros ----------------

function Logros({ list, locale }: { list: Achievement[]; locale: Locale }) {
  const t = translator(locale);
  const groups = [...new Set(list.map((a) => a.group))];
  const unlocked = list.filter((a) => a.unlocked).length;
  return (
    <div className="space-y-4">
      <Card title={t("pt.vitrina")} subtitle={t("pr.conseguidos", { n: unlocked, total: list.length })}>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={unlocked} aria-valuemin={0} aria-valuemax={list.length} aria-label={t("pt.logrosAria")}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${(unlocked / Math.max(1, list.length)) * 100}%` }} />
        </div>
      </Card>
      {groups.map((g) => (
        <Card key={g} title={t(`lg.g.${g}` as Key)}>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list
              .filter((a) => a.group === g)
              .map((a) => (
                <li key={a.id} className={`flex gap-3 rounded-xl border p-3 ${a.unlocked ? "border-accent bg-surface-2" : "border-line"}`}>
                  <Icon name={a.icon} className={`h-7 w-7 ${a.unlocked ? "text-accent" : "text-muted opacity-40"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {logroTitle(a, t)}
                      {a.unlocked && <Pill className="bg-accent text-accent-ink">✓</Pill>}
                    </span>
                    <span className="block text-xs text-ink-2">{logroDetail(a, t)}</span>
                    {a.unlocked ? (
                      a.date && <span className="mt-1 block text-[11px] text-muted">{t("pt.conseguido", { fecha: dayMonth(a.date, locale) })}</span>
                    ) : (
                      a.progress > 0 && (
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-label={t("pt.progreso", { n: Math.round(a.progress * 100) })}>
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

async function Salud({ db, locale }: { db: Db; locale: Locale }) {
  const t = translator(locale);
  const intl = intlLocale(locale);
  const today = await viewTodayMadrid();
  const h = healthSummary(db.health, today);
  const endpoint = `${(process.env.APP_URL ?? "https://run-in-out.vercel.app").replace(/\/$/, "")}/api/salud`;
  // cuándo llegó el último envío (cada envío reescribe los 7 días que manda): así se ve si fallan las automatizaciones
  const sentAt = (db.health ?? []).reduce((m, d) => (d.updatedAt > m ? d.updatedAt : m), "");
  const sentDay = sentAt ? todayMadrid(new Date(sentAt)) : undefined;
  const sentAgo = sentDay ? diffDays(today, sentDay) : undefined;
  const sentHour = sentAt ? new Date(sentAt).toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : undefined;
  const rec = recoverySignals(db.health, today);
  const n1 = (v?: number) => (v === undefined ? "–" : v.toLocaleString(intl, { maximumFractionDigits: 1 }));
  return (
    <div className="space-y-4">
      {h ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t("sal.pasosHoy")} value={h.today?.steps !== undefined ? fmtNum(h.today.steps) : "–"} sub={h.avgSteps7 !== undefined ? t("sal.media7", { v: fmtNum(h.avgSteps7) }) : undefined} />
            <Stat
              label={t("sal.actHoy")}
              value={h.today?.activeKcal !== undefined ? fmtNum(h.today.activeKcal) : "–"}
              unit="kcal"
              sub={h.avgActiveKcal7 !== undefined ? t("sal.media7kcal", { v: fmtNum(h.avgActiveKcal7) }) : undefined}
            />
            <Stat
              label={t("sal.totHoy")}
              value={h.today?.activeKcal !== undefined && h.today.restingKcal !== undefined ? fmtNum(h.today.activeKcal + h.today.restingKcal) : "–"}
              unit="kcal"
              sub={t("sal.actReposo")}
            />
            <Stat
              label={t("sal.ultimo")}
              value={sentAgo === undefined ? "–" : sentAgo === 0 ? t("sal.hoy") : sentAgo === 1 ? t("sal.ayer") : dayMonth(sentDay!, locale)}
              sub={sentHour && t("sal.aLas", { h: sentHour })}
              status={sentAgo !== undefined && sentAgo >= 2 ? { tone: "bad", label: t("sal.revisa", { n: sentAgo }) } : undefined}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={t("sal.pasos")} subtitle={t("sal.ult30")}>
              <SimpleBars data={h.last30} xKey="date" yKey="steps" name={t("sal.pasos")} unit="" xFormat="day" locale={locale} />
            </Card>
            <Card title={t("sal.calAct")} subtitle={t("sal.ult30")}>
              <SimpleBars data={h.last30} xKey="date" yKey="kcal" name={t("sal.calAct")} unit="kcal" xFormat="day" locale={locale} />
            </Card>
          </div>
          <HealthMonths db={db} today={today} t={t} locale={locale} />
          {h.hasRecovery && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat
                  label={t("sal.sueno3")}
                  value={n1(rec.sleepAvg3)}
                  unit="h"
                  status={rec.sleepAvg3 === undefined ? undefined : rec.shortSleep ? { tone: "warn", label: t("sal.poco") } : { tone: "good", label: t("sal.bien") }}
                />
                <Stat
                  label={t("sal.pulso3")}
                  value={n1(rec.restingHrAvg3)}
                  unit="ppm"
                  sub={rec.restingHrBase !== undefined ? t("sal.normalTi", { v: n1(rec.restingHrBase) }) : t("sal.faltan2")}
                  status={rec.restingHrBase === undefined ? undefined : rec.highRestingHr ? { tone: "warn", label: t("sal.alto") } : { tone: "good", label: t("sal.normal") }}
                />
                <Stat
                  label={t("sal.vfc7")}
                  value={n1(rec.hrvAvg7)}
                  unit="ms"
                  sub={rec.hrvLow !== undefined ? t("sal.rango", { v: n1(rec.hrvLow) }) : t("sal.faltan2")}
                  status={rec.hrvLow === undefined ? undefined : rec.lowHrv ? { tone: "warn", label: t("sal.baja") } : { tone: "good", label: t("sal.normal") }}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title={t("sal.sueno")} subtitle={t("sal.suenoSub")}>
                  <TrendLine data={h.last30} dataKey="sleep" name={t("sal.suenoH")} xKey="date" format="dec1" height={160} locale={locale} />
                </Card>
                <Card title={t("sal.pulso")} subtitle={t("sal.pulsoSub")}>
                  <TrendLine data={h.last30} dataKey="rhr" name={t("sal.pulso")} xKey="date" color="s2" format="int" height={160} locale={locale} />
                </Card>
                <Card title={t("sal.vfc")} subtitle={t("sal.vfcSub")}>
                  <TrendLine data={h.last30} dataKey="hrv" name={t("sal.vfc")} xKey="date" color="s3" format="int" height={160} locale={locale} />
                </Card>
              </div>
              <p className="text-xs text-muted">
                {t("sal.iaNota")}
              </p>
            </>
          )}
        </>
      ) : (
        <Empty title={t("sal.sinDatos")}>
          <span className="not-android">{t("sal.sinDatosIos")}</span>
          <span className="only-android">{t("sal.sinDatosAndroid")}</span>
        </Empty>
      )}

      <HealthConnectCard lastSync={db.healthConnectAt} locale={locale} />
      <div className="not-android">
      <Card title={t("sal.iphone")} subtitle={t("sal.iphoneSub")}>
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-semibold">{t("sal.paso1")}</p>
            <HealthKey hasKey={!!db.healthTokenHash} endpoint={endpoint} locale={locale} />
            {db.healthTokenHash && (
              <form action={revokeHealthKey} className="mt-2">
                <button className="text-xs text-muted underline hover:text-critical">{t("sal.desactivar")}</button>
              </form>
            )}
          </div>
          <div>
            <p className="mb-2 font-semibold">{t("sal.paso2")}</p>
            <ol className="space-y-5">
              <ShortcutStep n={1} title={t("sal.s1")} t={t}>
                <a href={SHORTCUT_URL} target="_blank" rel="noreferrer" className="btn my-1 inline-flex">
                  {t("sal.instalar")}
                </a>
                <br />
                {t("sal.s1t")}
              </ShortcutStep>
              <ShortcutStep n={2} title={t("sal.s2")} t={t}>
                {t("sal.s2t")}
              </ShortcutStep>
              <ShortcutStep n={3} title={t("sal.s3")} t={t}>
                {t("sal.s3t")}
              </ShortcutStep>
            </ol>
          </div>
          <div>
            <p className="mb-1 font-semibold">{t("sal.paso3")}</p>
            <ol className="space-y-5">
              <ShortcutStep n={4} img="7-automatizacion" w={600} h={362} title={t("sal.s4")} t={t}>
                {t("sal.s4t")}
              </ShortcutStep>
              <ShortcutStep n={5} title={t("sal.s5")} t={t}>
                {t("sal.s5t")}
              </ShortcutStep>
            </ol>
          </div>
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer font-semibold">¿Prefieres crearlo a mano?</summary>
            <p className="my-3 text-ink-2">
              Abre la <strong className="text-ink">app Atajos</strong> → pestaña Atajos → <em>+</em>. Cada acción se añade desde la barra <em>Buscar acciones</em> de abajo y
              se coloca al final: el orden importa.
            </p>
            <ol className="space-y-5">
              <ShortcutStep t={t} n={1} title="Pasos de los últimos 7 días">
                Busca <em>muestras</em> y añade <strong className="text-ink">Buscar muestras de salud</strong> (puede llamarse «Buscar muestras médicas»). Tipo{" "}
                <em>Pasos</em>, filtro <em>Fecha de inicio · está en los últimos 7 días</em>, <strong className="text-ink">Agrupar por: Día</strong> y unidad <em>contar</em>.
                Así cada envío lleva la semana entera: si un día el atajo no se ejecuta, el siguiente lo recupera.
              </ShortcutStep>
              <ShortcutStep t={t} n={2} title="Sus fechas y sus valores">
                Añade <strong className="text-ink">Obtener detalles de muestras de salud</strong> → <em>Fecha de inicio</em> y luego <strong className="text-ink">Definir variable</strong>{" "}
                <code>FechasPasos</code>. Otra vez <strong className="text-ink">Obtener detalles de muestras de salud</strong> (de las mismas muestras: toca el valor y elige el
                resultado del paso 1) → <em>Valor</em> y <strong className="text-ink">Definir variable</strong> <code>Pasos</code>.
              </ShortcutStep>
              <ShortcutStep t={t} n={3} title="Lo mismo con las calorías">
                Repite los pasos 1 y 2 con el tipo <em>Energía en actividad</em> (unidad <em>kcal</em>) y las variables <code>FechasKcal</code> y <code>Activas</code>.
              </ShortcutStep>
              <ShortcutStep t={t} n={4} img="4-buscar-url" w={600} h={831} title="La acción que envía">
                Busca <em>contenido</em> y elige <strong className="text-ink">Obtener contenido de URL</strong> (icono verde con flecha). No sirven «URL» ni «Abrir URL».
              </ShortcutStep>
              <ShortcutStep t={t} n={5} title="Configura el envío">
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    URL: <code className="break-all">{endpoint}</code>
                  </li>
                  <li>
                    Método: <em>POST</em>.
                  </li>
                  <li>
                    Cabeceras → Añadir nueva cabecera: <code>Authorization</code> y como valor tu clave (<code>rio_…</code>).
                  </li>
                  <li>
                    Cuerpo de la solicitud: <em>JSON</em>, cuatro campos de tipo <strong className="text-ink">Texto</strong>, con la clave escrita exactamente así:{" "}
                    <code>fechasPasos</code>, <code>pasos</code>, <code>fechasKcal</code> y <code>kcalActivas</code>. En cada uno, <em>Seleccionar variable</em> y elige la suya
                    (FechasPasos, Pasos y FechasKcal salen encima del teclado; en <code>kcalActivas</code>, «Seleccionar variable» y toca la acción «Obtener Valor» de las
                    calorías).
                  </li>
                </ul>
              </ShortcutStep>
              <ShortcutStep t={t} n={6} img="6-resultado" w={600} h={393} title="Pruébalo">
                Añade <strong className="text-ink">Mostrar resultado</strong> y pulsa <Icon name="play" className="h-3 w-3 align-[-1px]" />. La primera vez pide permiso para leer Salud: <em>Permitir</em>. Tiene que salir{" "}
                <code>&quot;ok&quot; : true</code> y «7 días guardados (del … al …)». Si da un error con una fecha o con las listas, mándame la captura. Si salen 0 pasos de
                día, revisa Ajustes → Salud → Acceso a datos → Atajos.
              </ShortcutStep>
            </ol>
          </details>
          <div>
            <p className="mb-1 font-semibold">4. Opcional: recuperación (con Apple Watch)</p>
            <p className="mb-3 text-ink-2">
              Con VFC, pulso en reposo y sueño la IA sabe si estás recuperado sin que se lo digas. Añade estas acciones <strong className="text-ink">antes</strong> de
              «Obtener contenido de URL», igual que las de pasos.
            </p>
            <ol className="space-y-4">
              <ShortcutStep t={t} n={6} title="VFC → «VFC»">
                <strong className="text-ink">Buscar muestras de salud</strong>, tipo <em>Variabilidad de la frecuencia cardiaca</em>, filtro <em>Fecha de inicio · es hoy</em>.
                Luego <strong className="text-ink">Calcular estadísticas</strong> con <em>Media</em> y <strong className="text-ink">Definir variable</strong> <code>VFC</code>.
              </ShortcutStep>
              <ShortcutStep t={t} n={7} title="Pulso en reposo → «PulsoReposo»">
                Igual, con el tipo <em>Frecuencia cardiaca en reposo</em>, <em>Media</em> y la variable <code>PulsoReposo</code>.
              </ShortcutStep>
              <ShortcutStep t={t} n={8} title="Sueño → «Sueno»">
                <strong className="text-ink">Buscar muestras de salud</strong>, tipo <em>Análisis del sueño</em>, filtro <em>Fecha de inicio · está en los últimos 1 días</em> y{" "}
                <em>Valor · no es · En la cama</em> (si no aparece ese filtro, déjalo sin él). Luego <strong className="text-ink">Obtener detalles de muestras de salud</strong> →{" "}
                <em>Duración</em>, <strong className="text-ink">Calcular estadísticas</strong> con <em>Suma</em> y la variable <code>Sueno</code>. Vale en horas, minutos o
                segundos: la app lo entiende.
              </ShortcutStep>
              <ShortcutStep t={t} n={9} title="Añádelos al envío">
                En el cuerpo JSON de «Obtener contenido de URL», tres campos más de tipo <em>Número</em>: <code>vfc</code>, <code>pulsoReposo</code> y <code>sueno</code>, con sus
                variables. Al ejecutarlo, la respuesta debe seguir diciendo <code>&quot;ok&quot; : true</code>. Si un día no hay dato (sin reloj puesto), no pasa nada.
              </ShortcutStep>
            </ol>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}

// atajo compartido por David (sin clave): cada uno pega la suya al instalarlo
const SHORTCUT_URL = "https://www.icloud.com/shortcuts/2e5697f64f774ff8b679520f08cc319c";

// «octubre» / «October»… en el idioma
const monthNameIn = (ym: string, locale: Locale) => new Date(`${ym.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(intlLocale(locale), { month: "long", timeZone: "UTC" });

/** Pasos y calorías por meses: el mes en curso frente al anterior, la evolución y la tabla. */
function HealthMonths({ db, today, t, locale }: { db: Db; today: string; t: T; locale: Locale }) {
  const monthName = (ym: string) => monthNameIn(ym, locale);
  const months = monthlyHealth(db.health);
  if (!months.length) return null;
  const cur = months.find((m) => m.month === today.slice(0, 7)) ?? months[months.length - 1];
  const prev = months[months.indexOf(cur) - 1];
  const pct = (a?: number, b?: number) => (a !== undefined && b ? Math.round(((a - b) / b) * 100) : undefined);
  const delta = pct(cur.avgSteps, prev?.avgSteps);
  return (
    <Card title={t("sal.mes", { mes: monthName(cur.month) })} subtitle={prev ? t("sal.comparado", { mes: monthName(prev.month) }) : t("sal.primerMes")}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t("sal.mediaDiaria")}
          value={cur.avgSteps !== undefined ? fmtNum(cur.avgSteps) : "–"}
          unit={t("sal.pasosU")}
          sub={delta !== undefined ? t("sal.vsMes", { d: `${delta > 0 ? "+" : ""}${delta}`, mes: monthName(prev!.month) }) : t("sal.diasDatos", { n: cur.days })}
        />
        <Stat label={t("sal.pasosMes")} value={fmtNum(cur.steps)} sub={t("sal.diasDatos", { n: cur.days })} />
        <Stat label={t("sal.dias10k")} value={cur.days10k} sub={prev ? t("sal.enMes", { n: prev.days10k, mes: monthName(prev.month) }) : undefined} />
        <Stat label={t("sal.mejorDia")} value={cur.bestDay ? fmtNum(cur.bestDay.steps) : "–"} unit={cur.bestDay ? t("sal.pasosU") : undefined} sub={cur.bestDay ? dayMonth(cur.bestDay.date, locale) : undefined} />
      </div>
      {months.length > 1 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted">{t("sal.mediaMes")}</p>
          <SimpleBars data={months.map((m) => ({ month: `${m.month}-01`, steps: m.avgSteps ?? 0 }))} xKey="month" yKey="steps" name={t("sal.mediaPasos")} unit="" xFormat="month" height={180} locale={locale} />
        </div>
      )}
      <table className="mt-4 w-full text-sm tabular">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-2 font-medium">{t("sal.mesCol")}</th>
            <th className="pb-2 text-right font-medium">{t("sal.mediaDia")}</th>
            <th className="pb-2 text-right font-medium">10.000+</th>
            <th className="hidden pb-2 text-right font-medium sm:table-cell">{t("sal.total")}</th>
            <th className="pb-2 text-right font-medium">{t("sal.kcalDia")}</th>
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
          {t("sal.anteriores")}
        </p>
      )}
    </Card>
  );
}

/** Paso de la guía del atajo con su captura del iPhone (public/atajo, la clave personal va tapada). */
function ShortcutStep({ n, title, img, w = 600, h = 600, children, t }: { n: number; title: string; img?: string; w?: number; h?: number; children: ReactNode; t: T }) {
  return (
    <li className={`grid grid-cols-1 gap-3 ${img ? "sm:grid-cols-[1fr_220px]" : ""}`}>
      <div className="text-ink-2">
        <p className="mb-1 font-semibold text-ink">
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-accent-ink">{n}</span>
          {title}
        </p>
        {children}
      </div>
      {img && <Image src={`/atajo/${img}.webp`} width={w} height={h} alt={t("sal.captura", { n, titulo: title })} unoptimized className="h-auto w-full max-w-[260px] rounded-xl border border-line sm:max-w-none" />}
    </li>
  );
}

// ---------------- Editar ----------------

function Editar({ db, today, initialFocus, locale, name }: { db: Db; today: string; initialFocus?: Focus; locale: Locale; name?: string }) {
  const { profile } = db;
  const t = translator(locale);
  // la primera vez (cuenta recién creada): por pasos
  if (!profile)
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <h2 className="font-display text-4xl leading-none tracking-[0.03em] uppercase">{t("prf.bienvenida")}</h2>
          <p className="mt-2 text-sm text-ink-2">{t("prf.bienvenidaSub")}</p>
        </div>
        <ProfileForm initialFocus={initialFocus} locale={locale} defaultName={name} steps language={<LanguageSelect locale={locale} />} />
      </div>
    );
  const avg = profileAverages(db.activities, today);
  const outdated = profile && avg && (Math.abs(avg.weeklyKm - profile.weeklyKm) >= 3 || Math.abs(avg.longestRunKm - profile.longestRunKm) >= 2);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <LanguageSelect locale={locale} />
        <ProfileForm key={`${profile?.weeklyKm}-${profile?.longestRunKm}-${profile?.focus}`} profile={profile} initialFocus={initialFocus} locale={locale} />
      </div>
      {profile && (
        <div className="space-y-4">
          <Card title={t("mem.titulo")} subtitle={t("ed.memSub")}>
            <AiMemory list={db.aiPreferences ?? []} locale={locale} />
          </Card>
          {avg && (
            <Card title={t("ed.promedios")} subtitle={t("ed.promediosSub")}>
              <ul className="divide-y divide-line text-sm">
                <Row label={t("ed.kmSem")} value={`${avg.weeklyKm} km`} note={t("ed.enPerfil", { v: profile.weeklyKm })} />
                <Row label={t("ed.tirada")} value={`${fmtKm(avg.longestRunKm)} km`} note={t("ed.enPerfil", { v: profile.longestRunKm })} />
                <Row label={t("ed.diasCorriendo")} value={fmtKm(avg.runDaysPerWeek)} />
                <Row label={t("ed.fuerzaSem")} value={fmtKm(avg.strengthPerWeek)} />
              </ul>
              {outdated ? (
                <form action={syncProfileAverages} className="mt-3">
                  <button className="btn w-full">{t("ed.actualizar")}</button>
                </form>
              ) : (
                <p className="mt-3 text-xs text-good-ink">{t("ed.alDia")}</p>
              )}
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("ed.imc")} value={bmi(profile.weightKg, profile.heightCm).toFixed(1)} sub={t(`imc.${bmiLabel(bmi(profile.weightKg, profile.heightCm))}` as Key)} />
            <Stat label={t("calc.fcMax")} value={hrMaxOf(profile)} unit="ppm" sub={profile.hrMax ? t("ed.medida") : t("ed.estimada")} />
          </div>
          <Card title={t("ed.borrarCuenta")} subtitle={<Link href="/privacidad" className="underline">{t("ed.politica")}</Link>}>
            <DeleteAccountForm locale={locale} />
          </Card>
          <Card title={t("ed.zonas")} subtitle={t("ed.zonasSub", { n: hrRestOf(profile) })}>
            <table className="w-full text-sm tabular">
              <tbody className="divide-y divide-line">
                {hrZones(hrMaxOf(profile), hrRestOf(profile)).map((z) => (
                  <tr key={z.zone}>
                    <td className="py-2 pr-2 font-semibold">Z{z.zone}</td>
                    <td className="py-2 pr-2">
                      {t(`zone.${z.zone}` as Key)}
                      <span className="block text-xs text-muted">{t(`zone.p.${z.zone}` as Key)}</span>
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

async function ActivityList({ acts, locale = "es" }: { acts: Activity[]; locale?: Locale }) {
  // nombres para «con quién»; la lectura de usuarios se memoriza por petición
  const uid = await requireViewerId();
  const names = new Map((await viewFriends(uid)).map((f) => [f.id, f.name]));
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
          ownerId={uid}
          tags={tags.get(a.id)}
          locale={locale}
          action={
            <Link href={`/registrar?editar=${encodeURIComponent(a.id)}`} className="shrink-0 text-xs font-semibold text-accent">
              {translator(locale)("ex.editar")}
            </Link>
          }
        />
      ))}
    </ul>
  );
}
