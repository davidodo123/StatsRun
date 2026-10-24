// Imagen para compartir un entreno (historia de Instagram / WhatsApp): datos y dibujos en SVG.
import type { Activity, Db } from "./types";
import type { Muscle } from "./strength/labels";
import { BACK, BODY_H, BODY_W, FRONT, MIRROR, type BodyShape } from "./strength/bodyShapes";
import { findExercise } from "./strength/catalog";
import { muscleSets, workoutReps, workoutSets, workoutVolume, setLoad, emomTitle } from "./strength/workouts";
import { decodePolyline, project } from "./route";
import { fmtDuration, fmtKm, fmtNum, fmtPace } from "./format";

export const ACCENT = "#d4ff3a"; // lima del estilo Volt
// músculos sin trabajar: gris oscuro sobre el fondo de la historia; gris claro en el sticker (va encima de una foto)
const IDLE = "#3a3a38";
const IDLE_STICKER = "#d9d7d0";

/** «historia»: imagen 1080 × 1920 con fondo; «sticker»: sin fondo, para pegarla encima de una foto propia. */
export type ShareFormat = "historia" | "sticker";

// mezcla de dos colores #rrggbb (sin transparencia: así las mitades que se solapan no se notan)
const mix = (a: string, b: string, t: number) =>
  `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * t + parseInt(b.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, "0")).join("")}`;
const kg = (n: number) => `${fmtNum(n, Number.isInteger(n) ? 0 : 1)} kg`;

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Cuerpo de delante y de detrás con los músculos del entreno en naranja (más intenso con más series). */
function bodySvg(sets: Partial<Record<Muscle, number>>, idle = IDLE): string {
  const max = Math.max(1, ...Object.values(sets).map((n) => n ?? 0));
  const fig = (shapes: BodyShape[], dx: number) => {
    const paths = shapes
      .map((s) => {
        const n = s.m ? (sets[s.m] ?? 0) : 0;
        return `<path d="${s.d}" fill="${n > 0 ? mix(ACCENT, idle, 0.45 + 0.55 * (n / max)) : idle}"/>`;
      })
      .join("");
    return `<g transform="translate(${dx} 0)"><g>${paths}</g><g transform="${MIRROR}">${paths}</g></g>`;
  };
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BODY_W * 2 + 20} ${BODY_H}">${fig(FRONT, 0)}${fig(BACK, BODY_W + 20)}</svg>`);
}

/** Línea del recorrido encajada en w × h, con salida (blanca) y meta (naranja). Con `outline`, un borde blanco (sobre una foto). */
function routeSvg(route: string, w: number, h: number, outline = false): string | undefined {
  const pts = decodePolyline(route);
  if (pts.length < 2) return;
  const px = pts.map((p) => project(p, 16));
  const xs = px.map((p) => p[0]);
  const ys = px.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 30;
  const k = Math.min((w - 2 * pad) / Math.max(1, maxX - minX), (h - 2 * pad) / Math.max(1, maxY - minY));
  const ox = (w - (maxX - minX) * k) / 2;
  const oy = (h - (maxY - minY) * k) / 2;
  const xy = px.map(([x, y]) => [ox + (x - minX) * k, oy + (y - minY) * k]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const [sx, sy] = xy[0];
  const [ex, ey] = xy.at(-1)!;
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
      (outline ? `<path d="${d}" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>` : "") +
      `<path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="${sx}" cy="${sy}" r="14" fill="#fff"/><circle cx="${ex}" cy="${ey}" r="14" fill="${ACCENT}" stroke="#fff" stroke-width="5"/></svg>`,
  );
}

export interface ShareCard {
  title: string;
  date: string; // AAAA-MM-DD
  kind: "fuerza" | "carrera" | "otro";
  stats: { label: string; value: string }[];
  lines: string[]; // ejercicios (fuerza)
  subtitle?: string;
  image?: string; // data URI del cuerpo o del recorrido
}

/** Lo que sale en la imagen de un entreno. */
export function shareCard(db: Pick<Db, "customExercises" | "activities">, a: Activity, format: ShareFormat = "historia"): ShareCard {
  const sticker = format === "sticker";
  const base = { title: a.name, date: a.date };
  if (a.workout) {
    const w = a.workout;
    const sets = muscleSets([{ ...a, date: "0000-00-00" }], "0000-00-00", (id) => findExercise(db, id));
    const volume = workoutVolume(w);
    return {
      ...base,
      kind: "fuerza",
      subtitle: w.emom ? `${emomTitle(w.emom)} · ${w.emom.done}/${w.emom.rounds} rondas` : undefined,
      image: bodySvg(sets, sticker ? IDLE_STICKER : IDLE),
      stats: [
        { label: "Tiempo", value: fmtDuration(a.movingSec) },
        { label: "Series", value: String(workoutSets(w)) },
        { label: "Repeticiones", value: fmtNum(workoutReps(w)) },
        ...(volume ? [{ label: "Volumen", value: kg(volume) }] : []),
      ],
      lines: w.exercises.slice(0, 6).map((e) => {
        const working = e.sets.filter((s) => s.type !== "calentamiento");
        const top = Math.max(0, ...working.map((s) => setLoad(e, s)));
        const reps = [...new Set(working.map((s) => s.reps).filter(Boolean))];
        return `${e.name} · ${working.length} × ${reps.length === 1 ? reps[0] : reps.length ? `${Math.min(...(reps as number[]))}-${Math.max(...(reps as number[]))}` : "–"}${top ? ` · ${kg(top)}` : ""}`;
      }),
    };
  }
  const km = a.distanceM / 1000;
  const pace = a.sport === "run" && km > 0 ? a.movingSec / km : undefined;
  return {
    ...base,
    kind: a.sport === "run" ? "carrera" : "otro",
    image: a.route ? routeSvg(a.route, 960, sticker ? 760 : 900, sticker) : undefined,
    lines: [],
    stats: [
      ...(km > 0 ? [{ label: "Distancia", value: `${fmtKm(km, 2)} km` }] : []),
      ...(pace ? [{ label: "Ritmo", value: `${fmtPace(pace)} /km` }] : []),
      { label: "Tiempo", value: fmtDuration(a.movingSec) },
      ...(a.elevationGainM > 0 ? [{ label: "Desnivel", value: `${fmtNum(a.elevationGainM)} m` }] : a.avgHr ? [{ label: "FC media", value: `${Math.round(a.avgHr)} ppm` }] : []),
    ],
  };
}

export interface ShareVideo {
  title: string;
  date: string;
  points: [number, number][]; // recorrido normalizado a 0-1 (mismo aspecto que el real), como mucho 400 puntos
  stats: { label: string; value: string }[];
}

/** Lo que necesita el vídeo del recorrido (se dibuja en el móvil); sin recorrido, nada. */
export function shareVideo(db: Pick<Db, "customExercises" | "activities">, a: Activity): ShareVideo | undefined {
  if (!a.route || a.workout) return;
  const px = decodePolyline(a.route).map((p) => project(p, 16));
  if (px.length < 2) return;
  const xs = px.map((p) => p[0]);
  const ys = px.map((p) => p[1]);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const size = Math.max(1, Math.max(...xs) - minX, Math.max(...ys) - minY);
  const step = Math.max(1, Math.ceil(px.length / 400));
  const pts = px.filter((_, i) => i % step === 0 || i === px.length - 1).map(([x, y]) => [+((x - minX) / size).toFixed(4), +((y - minY) / size).toFixed(4)] as [number, number]);
  const c = shareCard(db, a);
  return { title: c.title, date: c.date, points: pts, stats: c.stats.slice(0, 3) };
}
