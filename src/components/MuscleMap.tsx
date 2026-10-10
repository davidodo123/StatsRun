import type { Muscle } from "@/lib/strength/labels";

// Mapa del cuerpo esquemático (delante y detrás): cada músculo se pinta según las series que ha recibido.
type Shape = { m?: Muscle; d: string };
const e = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
const pair = (m: Muscle | undefined, cx: number, cy: number, rx: number, ry: number): Shape[] => [
  { m, d: e(50 - cx, cy, rx, ry) },
  { m, d: e(50 + cx, cy, rx, ry) },
];

// lo que no es músculo (cabeza, manos, pies) va en gris de fondo
const COMMON: Shape[] = [{ d: e(50, 13, 8, 9.5) }, ...pair(undefined, 30, 101, 3.5, 4.5), ...pair(undefined, 10, 206, 5, 3)];

const FRONT: Shape[] = [
  ...COMMON,
  { m: "cuello", d: "M45 22h10v8H45z" },
  { m: "trapecio", d: "M45 29l-8 4h26l-8-4z" },
  ...pair("hombros", 18, 39, 6.5, 6),
  { m: "pecho", d: "M37 36h12v16c-5 2-10 1-13-2-2-4-1-11 1-14zM63 36H51v16c5 2 10 1 13-2 2-4 1-11-1-14z" },
  ...pair("biceps", 23, 55, 4, 9),
  ...pair("antebrazos", 26, 79, 3.5, 12),
  { m: "abdomen", d: "M41 54h18v30c0 4-4 8-9 8s-9-4-9-8z" },
  ...pair("abductores", 15, 94, 4, 6),
  ...pair("aductores", 4, 112, 3.5, 12),
  ...pair("cuadriceps", 10, 124, 7, 21),
  ...pair("gemelos", 9, 172, 4, 18),
];

const BACK: Shape[] = [
  ...COMMON,
  { m: "cuello", d: "M45 22h10v8H45z" },
  { m: "trapecio", d: "M50 26l-13 7 13 18 13-18z" },
  ...pair("hombros", 18, 39, 6.5, 6),
  ...pair("triceps", 23, 55, 4, 9),
  ...pair("antebrazos", 26, 79, 3.5, 12),
  { m: "espalda", d: "M44 52h12v12H44z" },
  { m: "dorsal", d: "M37 38l6 10v18l-6 4c-2-8-3-20 0-32zM63 38l-6 10v18l6 4c2-8 3-20 0-32z" },
  { m: "lumbar", d: "M42 67h16v16H42z" },
  ...pair("gluteos", 8, 96, 8, 9),
  ...pair("isquios", 10, 128, 6.5, 18),
  ...pair("gemelos", 9, 168, 5.5, 14),
];

function Figure({ shapes, label, sets, full }: { shapes: Shape[]; label: string; sets: Partial<Record<Muscle, number>>; full: number }) {
  return (
    <figure className="flex-1 text-center">
      <svg viewBox="0 0 100 212" className="mx-auto h-56 w-auto" role="img" aria-label={`Músculos trabajados, vista de ${label.toLowerCase()}`}>
        {shapes.map((s, i) => {
          const n = s.m ? (sets[s.m] ?? 0) : 0;
          return (
            <path key={i} d={s.d} fill={n > 0 ? "var(--accent)" : "var(--muted)"} fillOpacity={n > 0 ? 0.3 + 0.7 * Math.min(1, n / full) : 0.22} stroke="var(--surface)" strokeWidth={0.8}>
              {s.m && n > 0 && <title>{`${n.toLocaleString("es-ES")} series`}</title>}
            </path>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** Delante y detrás; color pleno a partir de `full` series. */
export function MuscleMap({ sets, full = 10 }: { sets: Partial<Record<Muscle, number>>; full?: number }) {
  return (
    <div className="flex gap-2">
      <Figure shapes={FRONT} label="Delante" sets={sets} full={full} />
      <Figure shapes={BACK} label="Detrás" sets={sets} full={full} />
    </div>
  );
}
