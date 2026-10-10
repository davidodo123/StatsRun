// Fuerza: material, músculos y categorías de los ejercicios (compartido entre servidor y cliente).

export const EQUIPMENT = [
  { id: "corporal", label: "Peso corporal", icon: "🤸" },
  { id: "mancuernas", label: "Mancuernas", icon: "🏋️" },
  { id: "barra", label: "Barra y discos", icon: "🏋️‍♂️" },
  { id: "barraZ", label: "Barra Z", icon: "〰️" },
  { id: "kettlebell", label: "Kettlebell", icon: "🔔" },
  { id: "bandas", label: "Bandas elásticas", icon: "🎗️" },
  { id: "banco", label: "Banco", icon: "🛋️" },
  { id: "dominadas", label: "Barra de dominadas", icon: "🪜" },
  { id: "cajon", label: "Cajón o escalón", icon: "📦" },
  { id: "jaula", label: "Jaula o soportes", icon: "🗄️" },
  { id: "maquinas", label: "Máquinas", icon: "⚙️" },
  { id: "poleas", label: "Poleas", icon: "🔗" },
  { id: "balon", label: "Balón medicinal", icon: "🏐" },
  { id: "fitball", label: "Fitball", icon: "⚪" },
  { id: "rodillo", label: "Rodillo de espuma", icon: "🧻" },
  { id: "otro", label: "Otro (TRX, anillas, paralelas, trineo…)", icon: "➕" },
] as const;
export type Equipment = (typeof EQUIPMENT)[number]["id"];
export const EQUIPMENT_LABEL = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.label])) as Record<Equipment, string>;

export const MUSCLES = [
  { id: "pecho", label: "Pecho" },
  { id: "espalda", label: "Espalda media" },
  { id: "dorsal", label: "Dorsal" },
  { id: "trapecio", label: "Trapecio" },
  { id: "hombros", label: "Hombros" },
  { id: "biceps", label: "Bíceps" },
  { id: "triceps", label: "Tríceps" },
  { id: "antebrazos", label: "Antebrazos" },
  { id: "abdomen", label: "Abdomen" },
  { id: "lumbar", label: "Zona lumbar" },
  { id: "gluteos", label: "Glúteos" },
  { id: "cuadriceps", label: "Cuádriceps" },
  { id: "isquios", label: "Isquiotibiales" },
  { id: "aductores", label: "Aductores" },
  { id: "abductores", label: "Abductores" },
  { id: "gemelos", label: "Gemelos y sóleo" },
  { id: "cuello", label: "Cuello" },
] as const;
export type Muscle = (typeof MUSCLES)[number]["id"];
export const MUSCLE_LABEL = Object.fromEntries(MUSCLES.map((m) => [m.id, m.label])) as Record<Muscle, string>;

export const CATEGORIES = [
  { id: "fuerza", label: "Fuerza" },
  { id: "pliometria", label: "Pliometría" },
  { id: "estiramiento", label: "Estiramiento y movilidad" },
  { id: "cardio", label: "Cardio" },
  { id: "powerlifting", label: "Powerlifting" },
  { id: "halterofilia", label: "Halterofilia" },
  { id: "strongman", label: "Strongman" },
] as const;
export type ExerciseCategory = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<ExerciseCategory, string>;

export type ExerciseLevel = "principiante" | "intermedio" | "avanzado";

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  cat: ExerciseCategory;
  /** Todo el material que hace falta (el peso corporal siempre está disponible). */
  eq: Equipment[];
  level: ExerciseLevel;
  mech?: "compuesto" | "aislamiento";
  muscles: Muscle[];
  secondary: Muscle[];
  steps: string[];
  /** Nº de fotos en free-exercise-db (0 = sin foto). */
  img: number;
  /** Ejercicio del que se toman las fotos si no tiene propias (uno parecido). */
  imgId?: string;
  custom?: boolean;
}

/** Lo justo para listar y filtrar en el navegador. */
export type ExerciseSummary = Pick<Exercise, "id" | "name" | "cat" | "eq" | "muscles" | "img" | "imgId" | "custom">;

// fotos de free-exercise-db (dominio público), fijadas al commit con el que se generó el catálogo
const IMG_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises";
export const exerciseImage = (id: string, n = 0) => `${IMG_BASE}/${id}/${n}.jpg`;

/** ¿Se puede hacer con este material? */
export const canDo = (eq: readonly Equipment[], available: readonly Equipment[]) => eq.every((e) => e === "corporal" || available.includes(e));

/** Lugares de ejemplo para empezar. */
export const PLACE_PRESETS: { name: string; equipment: Equipment[] }[] = [
  { name: "Gimnasio", equipment: EQUIPMENT.map((e) => e.id).filter((e) => e !== "otro") },
  { name: "Casa", equipment: ["corporal", "mancuernas", "bandas"] },
  { name: "Sin material", equipment: ["corporal"] },
];
