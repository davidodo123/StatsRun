import { translator, type Locale } from "@/lib/i18n";
import type { Muscle } from "@/lib/strength/labels";
import { BACK, BODY_H, BODY_W, FRONT, MIRROR, type BodyShape } from "@/lib/strength/bodyShapes";

// Mapa del cuerpo (delante y detrás): cada músculo se pinta según las series que ha recibido.
function Figure({ shapes, label, sets, full }: { shapes: BodyShape[]; label: string; sets: Partial<Record<Muscle, number>>; full: number }) {
  return (
    <figure className="flex-1 text-center">
      <svg viewBox={`0 0 ${BODY_W} ${BODY_H}`} className="mx-auto h-56 w-auto" role="img" aria-label={`Músculos trabajados, vista de ${label.toLowerCase()}`}>
        {[undefined, MIRROR].map((t) => (
          <g key={t ?? "izq"} transform={t}>
            {shapes.map((s, i) => {
              const n = s.m ? (sets[s.m] ?? 0) : 0;
              return (
                <path key={i} d={s.d} fill={n > 0 ? "var(--accent)" : "var(--muted)"} fillOpacity={n > 0 ? 0.3 + 0.7 * Math.min(1, n / full) : 0.22}>
                  {s.m && n > 0 && <title>{`${n.toLocaleString("es-ES")} series`}</title>}
                </path>
              );
            })}
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** Delante y detrás; color pleno a partir de `full` series. */
export function MuscleMap({ sets, full = 10, locale = "es" }: { sets: Partial<Record<Muscle, number>>; full?: number; locale?: Locale }) {
  const t = translator(locale);
  return (
    <div className="flex gap-2">
      <Figure shapes={FRONT} label={t("mm.delante")} sets={sets} full={full} />
      <Figure shapes={BACK} label={t("mm.detras")} sets={sets} full={full} />
    </div>
  );
}
