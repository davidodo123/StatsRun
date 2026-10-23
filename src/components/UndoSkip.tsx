import { undoSkip } from "@/app/actions";
import { WEEKDAYS, addDays, shortDate, weekday } from "@/lib/dates";
import type { Db } from "@/lib/types";

const day = (d: string) => `${WEEKDAYS[weekday(d)].slice(0, 3).toLowerCase()} ${shortDate(d)}`;

/** Aviso con «Deshacer» tras marcar un día sin poder entrenar (por si se pulsó sin querer). Dura hasta mañana. */
export function UndoSkip({ db, today, className = "mb-4" }: { db: Db; today: string; className?: string }) {
  const last = db.lastSkip;
  if (!last?.dates.length || last.at.slice(0, 10) < addDays(today, -1)) return null;
  // si el plan se rehízo después, ya no se puede volver atrás
  if (last.plan && last.plan.createdAt !== db.plan?.createdAt) return null;
  const first = last.dates[0];
  const end = last.dates.at(-1)!;
  const text = last.move
    ? `Cambiaste «${last.move.title}» del ${day(last.move.from)} al ${day(last.move.to)}.`
    : `Marcaste ${first === end ? `el ${day(first)}` : `del ${day(first)} al ${day(end)}`} como ${first === end ? "día" : "días"} sin poder entrenar y el plan se reorganizó.`;
  return (
    <form action={undoSkip} className={`${className} flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-l-4 border-warning bg-surface p-3 text-sm text-ink-2`}>
      <span className="min-w-0 flex-1">{text}</span>
      <button className="btn">Deshacer</button>
    </form>
  );
}
