import Link from "next/link";
import type { ReactNode } from "react";
import { RouteMap } from "@/components/RouteMap";
import { shortDate } from "@/lib/dates";
import { fmtDuration, fmtKm, fmtPace } from "@/lib/format";
import type { Activity } from "@/lib/types";
import type { ActivityTag } from "@/lib/engine/tags";
import { Icon, type IconName } from "./icons";
import { activityPhotoUrl } from "@/lib/photos";

export const SPORT_LABEL: Record<Activity["sport"], string> = { run: "Correr", ride: "Bici", swim: "Natación", walk: "Caminar", strength: "Fuerza", other: "Otros" };
const SPORT_ICON: Record<Activity["sport"], IconName> = { run: "run", ride: "bike", swim: "swim", walk: "walk", strength: "dumbbell", other: "bolt" };

/** «con Ana y Leo» a partir de los ids de `with` (los que no se conocen cuentan como «otra persona»). */
export function withText(ids: string[] | undefined, names: Map<string, string>): string | undefined {
  if (!ids?.length) return undefined;
  const list = ids.map((id) => names.get(id) ?? "otra persona");
  return `con ${list.length > 1 ? `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}` : list[0]}`;
}

/** Etiquetas de la sesión (récord, más larga…). Los récords destacan con el color de acento. */
export function TagChips({ tags }: { tags: ActivityTag[] }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.label}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.kind === "record" ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2"}`}
        >
          <Icon name={t.icon} className="h-3 w-3" />
          {t.label}
        </span>
      ))}
    </span>
  );
}

/** Fila de actividad: miniatura (foto, recorrido o icono), nombre, datos y con quién. En el feed de amigos, con foto, como publicación. */
export function ActivityItem({
  a,
  href,
  names,
  owner,
  ownerId,
  action,
  tags,
}: {
  a: Activity;
  /** Página de detalle de la actividad. */
  href: string;
  names: Map<string, string>;
  /** Nombre del dueño (en el feed de amigos). */
  owner?: string;
  /** Id del dueño: para su foto. */
  ownerId?: string;
  action?: ReactNode;
  tags?: ActivityTag[];
}) {
  const together = withText(a.with, names);
  const photo = ownerId ? activityPhotoUrl(ownerId, a) : undefined;
  const stats = (
    <span className="block text-xs text-muted tabular">
      {shortDate(a.date)} · {SPORT_LABEL[a.sport]}
      {a.distanceM > 0 && ` · ${fmtKm(a.distanceM / 1000, 2)} km`} · {fmtDuration(a.movingSec)}
      {a.sport === "run" && a.distanceM > 0 && ` · ${fmtPace(a.movingSec / (a.distanceM / 1000))}/km`}
      {a.avgHr && ` · ${Math.round(a.avgHr)} ppm`}
    </span>
  );
  // feed de amigos con foto: quién, qué hizo, el tiempo y la foto grande
  if (photo && owner)
    return (
      <li className="py-3">
        <div className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-accent">{owner}</span>
            <Link href={href} className="block truncate font-semibold hover:text-accent">
              {a.name}
            </Link>
            {stats}
          </span>
          {action}
        </div>
        <Link href={href} className="mt-2 block" tabIndex={-1} aria-hidden>
          {/* foto del entreno (servida por /api/foto): sin optimizar */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
        </Link>
        {together && <span className="mt-1.5 flex items-center gap-1 text-xs text-ink-2"><Icon name="users" className="h-3.5 w-3.5" /> {together}</span>}
        {tags && tags.length > 0 && <TagChips tags={tags} />}
      </li>
    );
  return (
    <li className="flex items-center gap-3 py-2">
      <Link href={href} className="w-16 shrink-0" aria-hidden tabIndex={-1}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" className="h-12 w-16 rounded-md object-cover" />
        ) : a.route ? (
          <RouteMap route={a.route} width={64} height={48} tiles={false} label={`Recorrido de ${a.name}`} />
        ) : (
          <span className="grid h-12 w-16 place-items-center rounded-md bg-surface-2 text-accent">
            <Icon name={SPORT_ICON[a.sport]} className="h-6 w-6" />
          </span>
        )}
      </Link>
      <span className="min-w-0 flex-1">
        {owner && <span className="block text-[11px] font-semibold text-accent">{owner}</span>}
        <Link href={href} className="block truncate text-sm font-medium hover:text-accent">
          {a.name}
        </Link>
        {stats}
        {together && <span className="flex items-center gap-1 text-xs text-ink-2"><Icon name="users" className="h-3.5 w-3.5" /> {together}</span>}
        {tags && tags.length > 0 && <TagChips tags={tags} />}
      </span>
      {action}
    </li>
  );
}
