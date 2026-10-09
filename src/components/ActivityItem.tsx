import Link from "next/link";
import type { ReactNode } from "react";
import { RouteMap } from "@/components/RouteMap";
import { shortDate } from "@/lib/dates";
import { fmtDuration, fmtKm, fmtPace } from "@/lib/format";
import type { Activity } from "@/lib/types";

export const SPORT_LABEL: Record<Activity["sport"], string> = { run: "Correr", ride: "Bici", swim: "Natación", walk: "Caminar", strength: "Fuerza", other: "Otros" };
const SPORT_ICON: Record<Activity["sport"], string> = { run: "🏃", ride: "🚴", swim: "🏊", walk: "🚶", strength: "🏋️", other: "⚡" };

/** «con Ana y Leo» a partir de los ids de `with` (los que no se conocen cuentan como «otra persona»). */
export function withText(ids: string[] | undefined, names: Map<string, string>): string | undefined {
  if (!ids?.length) return undefined;
  const list = ids.map((id) => names.get(id) ?? "otra persona");
  return `con ${list.length > 1 ? `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}` : list[0]}`;
}

/** Fila de actividad: miniatura del recorrido (o icono), nombre, datos y con quién. */
export function ActivityItem({
  a,
  href,
  names,
  owner,
  action,
}: {
  a: Activity;
  /** Página de detalle de la actividad. */
  href: string;
  names: Map<string, string>;
  /** Nombre del dueño (en el feed de amigos). */
  owner?: string;
  action?: ReactNode;
}) {
  const together = withText(a.with, names);
  return (
    <li className="flex items-center gap-3 py-2">
      <Link href={href} className="w-16 shrink-0" aria-hidden tabIndex={-1}>
        {a.route ? (
          <RouteMap route={a.route} width={64} height={48} tiles={false} label={`Recorrido de ${a.name}`} />
        ) : (
          <span className="grid h-12 w-16 place-items-center rounded-md bg-surface-2 text-xl">{SPORT_ICON[a.sport]}</span>
        )}
      </Link>
      <span className="min-w-0 flex-1">
        {owner && <span className="block text-[11px] font-semibold text-accent">{owner}</span>}
        <Link href={href} className="block truncate text-sm font-medium hover:text-accent">
          {a.name}
        </Link>
        <span className="block text-xs text-muted tabular">
          {shortDate(a.date)} · {SPORT_LABEL[a.sport]}
          {a.distanceM > 0 && ` · ${fmtKm(a.distanceM / 1000, 2)} km`} · {fmtDuration(a.movingSec)}
          {a.sport === "run" && a.distanceM > 0 && ` · ${fmtPace(a.movingSec / (a.distanceM / 1000))}/km`}
          {a.avgHr && ` · ${Math.round(a.avgHr)} ppm`}
        </span>
        {together && <span className="block text-xs text-ink-2">👥 {together}</span>}
      </span>
      {action}
    </li>
  );
}
