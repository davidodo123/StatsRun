import Link from "next/link";
import type { PlannedSession, SessionType } from "@/lib/types";
import type { SessionMatch } from "@/lib/engine/planner";
import { fmtPaceRange } from "@/lib/format";
import { DEFAULT_LOCALE, intlLocale, shortWeekdayDate, translator, weekdayDate, type Key, type Locale } from "@/lib/i18n";
import { Status } from "./ui";
import { SkipDayButton } from "./SkipDayButton";
import { MoveSessionButton } from "./MoveSessionButton";
import { MOVE_DAYS } from "@/lib/engine/planner";
import { addDays } from "@/lib/dates";
import { Icon } from "./icons";
import { planText } from "@/lib/i18n/planText";

type Kind = "suave" | "calidad" | "larga" | "fuerza" | "carrera";

export const SESSION_KIND: Record<SessionType, Kind> = {
  easy: "suave",
  recovery: "suave",
  run_walk: "suave",
  strides: "suave",
  long: "larga",
  tempo: "calidad",
  intervals: "calidad",
  repetitions: "calidad",
  marathon_pace: "calidad",
  race_pace: "calidad",
  hills: "calidad",
  fartlek: "calidad",
  strength: "fuerza",
  race: "carrera",
};

const KIND_STYLE: Record<Kind, { bar: string; label: Key }> = {
  suave: { bar: "bg-s3", label: "sesion.suave" },
  larga: { bar: "bg-s1", label: "sesion.larga" },
  calidad: { bar: "bg-s2", label: "sesion.calidad" },
  fuerza: { bar: "bg-muted", label: "sesion.fuerza" },
  carrera: { bar: "bg-accent", label: "sesion.carrera" },
};

const STATUS: Record<SessionMatch["status"], { tone: "good" | "warn" | "bad" | "neutral"; label: Key } | undefined> = {
  done: { tone: "good", label: "sesion.hecho" },
  partial: { tone: "warn", label: "sesion.parcial" },
  missed: { tone: "bad", label: "sesion.noRealizado" },
  today: { tone: "neutral", label: "sesion.hoy" },
  upcoming: undefined,
};

export function SessionCard({
  s,
  match,
  compact,
  showDate = true,
  readOnly,
  today,
  locale = DEFAULT_LOCALE,
}: {
  s: PlannedSession;
  match?: SessionMatch;
  compact?: boolean;
  showDate?: boolean;
  readOnly?: boolean; // plan de un amigo: sin botones de registrar ni reprogramar
  today?: string; // con él, «Cambiar de día» en las sesiones de hoy a una semana vista
  locale?: Locale;
}) {
  const t = translator(locale);
  const linked = match?.activities.find((a) => a.sessionId === s.id);
  const canLog = !readOnly && match !== undefined && match.status !== "upcoming";
  const kind = KIND_STYLE[SESSION_KIND[s.type]];
  const st = match ? STATUS[match.status] : undefined;
  const dayLabel = weekdayDate(s.date, locale);
  // las rutinas de fuerza se pueden empezar cualquier día (también las de los próximos), salvo si ya está hecha o pasó
  const canStart = !readOnly && s.type === "strength" && match?.status !== "done" && match?.status !== "missed";
  const canMove = !readOnly && today && s.type !== "race" && match && (match.status === "today" || (match.status === "upcoming" && !compact)) && s.date <= addDays(today, MOVE_DAYS);
  return (
    <article className="relative flex gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3 pl-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${kind.bar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {showDate && (
            <span>{weekdayDate(s.date, locale)}</span>
          )}
          <span>· {t(kind.label)}</span>
          {s.zone && <span>· {s.zone}</span>}
          {s.aiAdjusted && <span className="text-accent">· {t("sesion.ajustadaIA")}</span>}
          {s.movedFrom && <span>· {t("sesion.cambiada", { dia: shortWeekdayDate(s.movedFrom, locale) })}</span>}
        </div>
        <h3 className="mt-0.5 font-semibold leading-snug">{planText(s.title, locale)}</h3>
        <p className="text-xs text-ink-2 tabular">
          {s.distanceKm > 0 && `${s.distanceKm.toLocaleString(intlLocale(locale))} km · `}~{s.durationMin} min
          {s.pace && s.type !== "strength" && ` · ${fmtPaceRange(s.pace)}`}
        </p>
        {!compact && (s.description || s.steps.length > 0) && (
          <details className="group/steps mt-1.5" open={match?.status === "today"}>
            <summary className="cursor-pointer list-none text-xs font-semibold text-accent">
              <span className="group-open/steps:hidden">
                {t("sesion.verPasos")}
                {s.steps.length ? ` (${s.steps.length})` : ""}
              </span>
              <span className="hidden group-open/steps:inline">{t("sesion.ocultarPasos")}</span>
            </summary>
            {s.description && <p className="mt-2 text-sm text-ink-2">{planText(s.description, locale)}</p>}
            <ul className="mt-2 space-y-1 text-sm">
              {s.steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted">{i + 1}.</span>
                  <span>{planText(step, locale)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {((!readOnly && match?.status === "upcoming" && s.type !== "race" && !compact) || canMove) && (
          <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1">
            {!readOnly && match?.status === "upcoming" && s.type !== "race" && !compact && <SkipDayButton date={s.date} confirmText={t("sesion.confirmarNoPuedo", { dia: dayLabel })} label={t("sesion.noPuedoEseDia")} />}
            {canMove && <MoveSessionButton sessionId={s.id} date={s.date} today={today} days={MOVE_DAYS} locale={locale} />}
          </div>
        )}
        {(st || canLog || canStart || (match && match.activities.length > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {canStart && (
              <Link href={`/fuerza/entreno?sesion=${encodeURIComponent(s.id)}`} className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-ink">
                <Icon name="play" className="mr-1 h-3 w-3 align-[-1px]" />
                {t(s.routineId ? "sesion.empezarRutina" : "sesion.empezarEntreno")}
              </Link>
            )}
            {canLog &&
              (linked ? (
                <Link href={`/registrar?editar=${encodeURIComponent(linked.id)}`} className="text-xs font-semibold text-accent">
                  {t("sesion.editarRegistro")}
                </Link>
              ) : (
                match.status !== "done" && (
                  <Link
                    href={s.type === "strength" ? `/fuerza/entreno?sesion=${encodeURIComponent(s.id)}&fecha=${s.date}` : `/registrar?sesion=${encodeURIComponent(s.id)}`}
                    className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-ink"
                  >
                    {t("sesion.registrar")}
                  </Link>
                )
              ))}
            {st && <Status tone={st.tone}>{t(st.label)}</Status>}
            {/* solo hoy: un día que ya pasó no se puede mover */}
            {!readOnly && s.type !== "race" && match?.status === "today" && (
              <SkipDayButton date={s.date} confirmText={t("sesion.confirmarNoPuedo", { dia: dayLabel })} label={t("sesion.hoyNoPuedo")} title={t("sesion.iaReorganiza")} />
            )}
            {match && match.activities.length > 0 && s.type !== "strength" && (
              <span className="text-xs text-ink-2 tabular">
                {t("sesion.real", { km: match.doneKm.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1, minimumFractionDigits: 1 }), pct: Math.round(match.compliance * 100) })}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
