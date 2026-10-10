/* eslint-disable @next/next/no-img-element -- fotos de un CDN externo, ya ligeras: sin optimizador */
import { exerciseImage, type Exercise } from "@/lib/strength/labels";

type Media = Pick<Exercise, "id" | "name" | "img" | "imgId" | "cat">;

// icono dibujado para los ejercicios sin foto (en el estilo de los iconos del menú)
const CAT_ICON: Record<Exercise["cat"], string> = {
  fuerza: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  powerlifting: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  halterofilia: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  strongman: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  pliometria: "M13 3L5 13h6l-1 8 8-10h-6l1-8z",
  estiramiento: "M12 5a2 2 0 100-4 2 2 0 000 4zM5 9l7 2 7-2M12 11v5m0 0l-4 6m4-6l4 6",
  cardio: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
};

function Placeholder({ cat, className }: { cat: Exercise["cat"]; className: string }) {
  return (
    <span className={`grid shrink-0 place-items-center bg-surface-2 text-accent ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={CAT_ICON[cat]} />
      </svg>
    </span>
  );
}

/** Miniatura del ejercicio (o un icono si no tiene foto). */
export function ExerciseThumb({ x, className = "h-12 w-12" }: { x: Media; className?: string }) {
  const rounded = className.includes("rounded-") ? "" : "rounded-lg";
  if (!x.img) return <Placeholder cat={x.cat} className={`${rounded} ${className}`} />;
  return <img src={exerciseImage(x.imgId ?? x.id)} alt="" loading="lazy" decoding="async" className={`shrink-0 bg-white object-cover ${rounded} ${className}`} />;
}

/** Foto grande: alterna la posición inicial y la final. */
export function ExerciseAnimation({ x }: { x: Media }) {
  if (!x.img) return <Placeholder cat={x.cat} className="aspect-[4/3] w-full rounded-xl" />;
  const id = x.imgId ?? x.id;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
      {x.img > 1 && <img src={exerciseImage(id, 1)} alt="" className="absolute inset-0 h-full w-full object-contain" />}
      <img src={exerciseImage(id, 0)} alt={x.name} className={`absolute inset-0 h-full w-full object-contain ${x.img > 1 ? "exercise-frame" : ""}`} />
      {x.imgId && <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">Foto de un ejercicio parecido</span>}
    </div>
  );
}
