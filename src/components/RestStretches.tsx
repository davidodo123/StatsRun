import Link from "next/link";
import { findExercise, exerciseName } from "@/lib/strength/catalog";
import { translator, type Key, type Locale } from "@/lib/i18n";
import { ExerciseThumb } from "./ExerciseMedia";

// Día de descanso: unos 10 minutos de estiramientos para corredores, sin material ni compañero (del catálogo, con foto)
const STRETCHES: { id: string; dose: Key }[] = [
  { id: "Worlds_Greatest_Stretch", dose: "est.5lado" },
  { id: "Kneeling_Hip_Flexor", dose: "est.30lado" },
  { id: "Calf_Stretch_Hands_Against_Wall", dose: "est.30lado" },
  { id: "Seated_Floor_Hamstring_Stretch", dose: "est.30" },
  { id: "Ankle_On_The_Knee", dose: "est.30lado" },
  { id: "All_Fours_Quad_Stretch", dose: "est.30lado" },
  { id: "Hug_Knees_To_Chest", dose: "est.30" },
];

/** Lista de estiramientos del día de descanso; cada uno lleva a su ficha (fotos y pasos). */
export function RestStretches({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const items = STRETCHES.map((s) => ({ ...s, x: findExercise({}, s.id) })).filter((s) => s.x);
  if (!items.length) return null;
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-xs font-bold tracking-widest text-ink-2 uppercase">{t("est.titulo")}</h3>
      <p className="mt-0.5 text-xs text-muted">{t("est.sub")}</p>
      <ol className="mt-3 divide-y divide-line">
        {items.map(({ id, dose, x }) => (
          <li key={id}>
            <Link href={`/fuerza/ejercicios/${id}`} className="flex items-center gap-3 py-2">
              <ExerciseThumb x={x!} className="h-11 w-11" />
              <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold">{exerciseName(x!, locale)}</span>
              <span className="shrink-0 text-xs text-ink-2 tabular">{t(dose)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
