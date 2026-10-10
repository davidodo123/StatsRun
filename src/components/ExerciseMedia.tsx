/* eslint-disable @next/next/no-img-element -- fotos de un CDN externo, ya ligeras: sin optimizador */
import { exerciseImage, type Exercise } from "@/lib/strength/labels";

const CAT_ICON: Record<Exercise["cat"], string> = {
  fuerza: "🏋️",
  pliometria: "⚡",
  estiramiento: "🧘",
  cardio: "❤️",
  powerlifting: "🏋️‍♂️",
  halterofilia: "🥇",
  strongman: "🪨",
};

/** Miniatura del ejercicio (o un icono si no tiene foto). */
export function ExerciseThumb({ x, className = "h-12 w-12" }: { x: Pick<Exercise, "id" | "name" | "img" | "cat">; className?: string }) {
  if (!x.img) return <span className={`grid shrink-0 place-items-center rounded-lg bg-surface-2 text-xl ${className}`} aria-hidden>{CAT_ICON[x.cat]}</span>;
  return <img src={exerciseImage(x.id)} alt="" loading="lazy" decoding="async" className={`shrink-0 rounded-lg bg-white object-cover ${className}`} />;
}

/** Foto grande: alterna la posición inicial y la final. */
export function ExerciseAnimation({ x }: { x: Pick<Exercise, "id" | "name" | "img" | "cat"> }) {
  if (!x.img) return <div className="grid aspect-[4/3] place-items-center rounded-xl bg-surface-2 text-6xl" aria-hidden>{CAT_ICON[x.cat]}</div>;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
      {x.img > 1 && <img src={exerciseImage(x.id, 1)} alt="" className="absolute inset-0 h-full w-full object-contain" />}
      <img src={exerciseImage(x.id, 0)} alt={x.name} className={`absolute inset-0 h-full w-full object-contain ${x.img > 1 ? "exercise-frame" : ""}`} />
    </div>
  );
}
