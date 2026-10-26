import { undoSkip } from "@/app/actions";
import { addDays } from "@/lib/dates";
import type { Db } from "@/lib/types";
import { DEFAULT_LOCALE, shortWeekdayDate, translator, type Locale } from "@/lib/i18n";

/** Aviso con «Deshacer» tras marcar un día sin poder entrenar (por si se pulsó sin querer). Dura hasta mañana. */
export function UndoSkip({ db, today, className = "mb-4", locale = DEFAULT_LOCALE }: { db: Db; today: string; className?: string; locale?: Locale }) {
  const t = translator(locale);
  const day = (d: string) => shortWeekdayDate(d, locale);
  const last = db.lastSkip;
  if (!last?.dates.length || last.at.slice(0, 10) < addDays(today, -1)) return null;
  // si el plan se rehízo después, ya no se puede volver atrás
  if (last.plan && last.plan.createdAt !== db.plan?.createdAt) return null;
  const first = last.dates[0];
  const end = last.dates.at(-1)!;
  const text = last.move
    ? t("plan.undoMove", { titulo: last.move.title, de: day(last.move.from), a: day(last.move.to) })
    : first === end
      ? t("plan.undoUno", { dia: day(first) })
      : t("plan.undoVarios", { de: day(first), a: day(end) });
  return (
    <form action={undoSkip} className={`${className} flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-l-4 border-warning bg-surface p-3 text-sm text-ink-2`}>
      <span className="min-w-0 flex-1">{text}</span>
      <button className="btn">{t("plan.deshacer")}</button>
    </form>
  );
}
