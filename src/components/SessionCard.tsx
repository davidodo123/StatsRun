import Link from "next/link";
import type { PlannedSession, SessionType } from "@/lib/types";
import type { SessionMatch } from "@/lib/engine/planner";
import { fmtPaceRange } from "@/lib/format";
import { WEEKDAYS, shortDate, weekday } from "@/lib/dates";
import { Status } from "./ui";
import { skipSession } from "@/app/actions";

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

const KIND_STYLE: Record<Kind, { bar: string; label: string }> = {
  suave: { bar: "bg-s3", label: "Suave" },
  larga: { bar: "bg-s1", label: "Larga" },
  calidad: { bar: "bg-s2", label: "Calidad" },
  fuerza: { bar: "bg-muted", label: "Fuerza" },
  carrera: { bar: "bg-accent", label: "Carrera" },
};

const STATUS: Record<SessionMatch["status"], { tone: "good" | "warn" | "bad" | "neutral"; label: string } | undefined> = {
  done: { tone: "good", label: "Hecho" },
  partial: { tone: "warn", label: "Parcial" },
  missed: { tone: "bad", label: "No realizado" },
  today: { tone: "neutral", label: "Hoy" },
  upcoming: undefined,
};

export function SessionCard({
  s,
  match,
  compact,
  showDate = true,
  readOnly,
}: {
  s: PlannedSession;
  match?: SessionMatch;
  compact?: boolean;
  showDate?: boolean;
  readOnly?: boolean; // plan de un amigo: sin botones de registrar ni reprogramar
}) {
  const linked = match?.activities.find((a) => a.sessionId === s.id);
  const canLog = !readOnly && match !== undefined && match.status !== "upcoming";
  const kind = KIND_STYLE[SESSION_KIND[s.type]];
  const st = match ? STATUS[match.status] : undefined;
  return (
    <article className="relative flex gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3 pl-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${kind.bar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {showDate && (
            <span>
              {WEEKDAYS[weekday(s.date)]} {shortDate(s.date)}
            </span>
          )}
          <span>· {kind.label}</span>
          {s.zone && <span>· {s.zone}</span>}
          {s.aiAdjusted && <span className="text-accent">· ✦ Ajustada por IA</span>}
        </div>
        <h3 className="mt-0.5 font-semibold leading-snug">{s.title}</h3>
        <p className="text-xs text-ink-2 tabular">
          {s.distanceKm > 0 && `${s.distanceKm.toLocaleString("es-ES")} km · `}~{s.durationMin} min
          {s.pace && s.type !== "strength" && ` · ${fmtPaceRange(s.pace)}`}
        </p>
        {!compact && (
          <>
            <p className="mt-2 text-sm text-ink-2">{s.description}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {s.steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {!readOnly && match?.status === "upcoming" && s.type !== "race" && !compact && (
          <form action={skipSession} className="mt-2">
            <input type="hidden" name="date" value={s.date} />
            <button className="text-xs text-ink-2 underline hover:text-critical">No puedo ese día</button>
          </form>
        )}
        {(st || canLog || (match && match.activities.length > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {canLog &&
              (linked ? (
                <Link href={`/registrar?editar=${encodeURIComponent(linked.id)}`} className="text-xs font-semibold text-accent">
                  Editar registro
                </Link>
              ) : (
                match.status !== "done" && (
                  <Link href={`/registrar?sesion=${encodeURIComponent(s.id)}`} className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-ink">
                    ✓ Registrar
                  </Link>
                )
              ))}
            {st && <Status tone={st.tone}>{st.label}</Status>}
            {!readOnly && s.type !== "race" && match && (match.status === "missed" || match.status === "today") && (
              <form action={skipSession}>
                <input type="hidden" name="date" value={s.date} />
                <button className="text-xs text-ink-2 underline hover:text-critical" title="La IA reorganiza los próximos días">
                  {match.status === "missed" ? "No pude → reajustar" : "Hoy no puedo"}
                </button>
              </form>
            )}
            {match && match.activities.length > 0 && s.type !== "strength" && (
              <span className="text-xs text-ink-2 tabular">
                Real: {match.doneKm.toFixed(1)} km ({Math.round(match.compliance * 100)} %)
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
