// Modelo de datos de la app. Todas las fechas de calendario son "YYYY-MM-DD" (hora local del atleta).
import type { Equipment, ExerciseCategory, Muscle } from "./strength/labels";

export type Sex = "male" | "female";
export type Level = "nuevo" | "principiante" | "intermedio" | "avanzado";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  hrMax?: number; // si no se indica, se estima (Tanaka)
  hrRest?: number;
  level: Level;
  yearsRunning: number;
  weeklyKm: number; // volumen actual medio
  longestRunKm: number; // tirada más larga en las últimas 4-6 semanas
  recentRace?: { distanceKm: number; timeSec: number };
  daysPerWeek: number; // 2-7 (= nº de availableDays si se indican)
  availableDays?: number[]; // días de la semana en que puede entrenar (0 = lunes ... 6 = domingo)
  longRunDay: number; // 0 = lunes ... 6 = domingo
  strengthPerWeek: number; // 0-4
  injuries?: string;
}

export interface Goal {
  raceId?: string;
  name: string;
  distanceKm: number;
  date: string;
  targetTimeSec?: number; // vacío = "terminar"
  elevationGainM?: number;
  temperatureC?: number;
  course?: RaceCourse; // recorrido oficial subido (KMZ/KML/GPX)
}

/**
 * Otra carrera de la temporada, antes de la principal. B = se compite a tope (mini afinamiento y días suaves después);
 * C = se corre como un entreno de calidad.
 */
export interface TuneUpRace {
  id: string;
  name: string;
  distanceKm: number;
  date: string;
  priority: "B" | "C";
  targetTimeSec?: number;
}

/** Totales de un día enviados desde la app Salud del iPhone. */
export interface DailyHealth {
  date: string;
  steps?: number;
  activeKcal?: number; // energía activa
  restingKcal?: number; // energía en reposo (metabolismo basal)
  updatedAt: string;
}

export interface CourseMarker {
  kind: "salida" | "meta" | "agua" | "km";
  lat: number;
  lon: number;
  name?: string;
}

/** Recorrido de una carrera: trazado, distancia y desnivel calculados del archivo. */
export interface RaceCourse {
  route: string; // encoded polyline (lib/route.ts)
  distanceKm: number;
  elevationGainM?: number;
  elevationLossM?: number;
  markers: CourseMarker[];
  fileName: string;
  name?: string;
}

export type Feel = "muy_facil" | "facil" | "bien" | "duro" | "muy_duro";

export type SportKind = "run" | "ride" | "swim" | "walk" | "strength" | "other";

export interface Activity {
  id: string;
  source: "strava" | "demo" | "manual";
  name: string;
  sport: SportKind;
  sportRaw: string;
  date: string; // YYYY-MM-DD local
  startLocal: string; // ISO local
  distanceM: number;
  movingSec: number;
  elapsedSec: number;
  elevationGainM: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number; // pasos por minuto (carrera)
  steps?: number; // pasos totales
  maxAltitudeM?: number; // altitud máxima
  kilojoules?: number;
  sufferScore?: number;
  prCount?: number;
  rpe?: number; // esfuerzo percibido 1-10
  feel?: Feel; // cómo se le ha hecho respecto a lo esperado
  feelings?: string; // sensaciones en sus palabras: la IA las lee para reajustar la rutina
  notes?: string;
  sessionId?: string; // sesión del plan a la que corresponde
  route?: string; // recorrido GPS como encoded polyline (lib/route.ts)
  with?: string[]; // ids de los amigos con los que se hizo la sesión
  sharedFrom?: string; // "<idUsuario>:<idActividad>" si se copió de la sesión de un amigo
  workout?: Workout; // entreno de fuerza registrado en vivo: ejercicios y series
}

export type SessionType =
  | "easy"
  | "recovery"
  | "long"
  | "tempo"
  | "intervals"
  | "repetitions"
  | "marathon_pace"
  | "race_pace"
  | "hills"
  | "fartlek"
  | "strides"
  | "run_walk"
  | "strength"
  | "race";

export interface PaceRange {
  fast: number; // seg/km
  slow: number; // seg/km
}

export interface PlannedSession {
  id: string;
  date: string;
  type: SessionType;
  title: string;
  description: string;
  steps: string[];
  distanceKm: number; // 0 en fuerza
  durationMin: number;
  pace?: PaceRange;
  zone?: string;
  aiAdjusted?: boolean; // contenido reescrito por el entrenador IA
  strengthKind?: "pierna" | "posterior" | "superior" | "completo"; // fuerza: qué trabaja
  routineId?: string; // fuerza: rutina del usuario que toca ese día
}

export type Phase = "base" | "construccion" | "especifico" | "taper";

export interface PlanWeek {
  index: number;
  start: string; // lunes
  phase: Phase;
  recovery: boolean;
  targetKm: number;
  sessions: PlannedSession[];
  focus: string;
}

export interface Plan {
  createdAt: string;
  goal: Goal;
  startVdot: number;
  targetVdot: number;
  realisticVdot: number;
  warnings: string[];
  notes: string[];
  weeks: PlanWeek[];
}

export interface StravaAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seg
  athleteId: number;
  athleteName: string;
  scope: string;
}

export interface Db {
  profile?: Profile;
  goal?: Goal;
  races?: TuneUpRace[]; // carreras secundarias de la temporada (la principal es goal)
  health?: DailyHealth[]; // pasos y calorías de cada día (Salud del iPhone, por Atajos)
  healthTokenHash?: string; // sha256 de la clave personal con la que el atajo envía los datos
  plan?: Plan;
  pastPlans?: ArchivedPlan[]; // planes terminados o sustituidos, del más reciente al más antiguo
  measurements?: BodyMeasurement[]; // medidas corporales, por fecha (una por día)
  activities: Activity[];
  strava?: StravaAuth;
  lastSync?: string;  dismissedShared?: string[]; // sesiones compartidas por amigos que no se quieren añadir ("<idUsuario>:<idActividad>")
  routesSynced?: boolean; // ya se trajeron de Strava los recorridos de lo sincronizado antes de guardar mapas
  coach?: CoachState;
  unavailableDates?: string[]; // fechas concretas sin poder entrenar (futuras: no planificar; pasadas: "no pude")
  places?: GymPlace[]; // dónde entrena fuerza y con qué material
  activePlaceId?: string;
  customExercises?: CustomExercise[]; // ejercicios creados por el usuario (además del catálogo)
  routines?: Routine[]; // rutinas de fuerza
  strengthCoach?: StrengthCoachState; // lo que el atleta le contó a la IA de fuerza y su última respuesta
}

export type SetType = "normal" | "calentamiento" | "descendente" | "fallo";

/** Serie de una rutina: lo que toca (kg y repeticiones orientativos). */
export interface RoutineSet {
  type?: SetType; // sin tipo = normal
  kg?: number;
  reps?: number;
}

export interface RoutineExercise {
  exerciseId: string;
  sets: RoutineSet[];
  bw?: boolean; // con peso corporal: los kg de cada serie son lastre añadido
  restSec?: number; // descanso entre series
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  notes?: string;
  source?: "ia"; // creada por el entrenador IA de fuerza (se sustituye al volver a pedirla)
  kind?: "pierna" | "posterior" | "superior" | "completo"; // hueco del plan para el que está hecha
  phases?: Phase[]; // fases del plan en que se usa (sin fases = cualquiera)
  createdAt: string;
  updatedAt: string;
}

/** Serie hecha en un entreno. */
export interface WorkoutSet extends RoutineSet {
  rir?: number; // repeticiones en reserva
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string; // nombre al hacerlo (por si luego se borra un ejercicio propio)
  sets: WorkoutSet[];
  bw?: boolean; // con peso corporal: carga = bodyKg + kg de la serie (lastre)
  bodyKg?: number; // peso del perfil el día del entreno
  notes?: string;
}

export interface Workout {
  routineId?: string;
  exercises: WorkoutExercise[];
}

/** Medidas corporales de un día (todas opcionales). */
export interface BodyMeasurement {
  date: string;
  weightKg?: number;
  fatPct?: number;
  waistCm?: number;
  hipCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
}

/** Un sitio donde se entrena fuerza y el material que hay. */
export interface GymPlace {
  id: string;
  name: string;
  equipment: Equipment[];
  notes?: string; // p. ej. «mancuernas de 2 a 20 kg, kettlebell de 16»
}

/** Ejercicio creado por el usuario. */
export interface CustomExercise {
  id: string; // "c_…"
  name: string;
  cat: ExerciseCategory;
  eq: Equipment[];
  muscles: Muscle[];
  secondary: Muscle[];
  steps: string[];
  createdAt: string;
}

export interface StrengthCoachState {
  material: string; // en sus palabras: «kettlebell de 16, mancuernas de 15-18 kg…»
  ability: string; // lo que puede hacer o su rutina normal
  updatedAt: string;
  model?: string;
  summary?: string;
  error?: string;
}

/** Plan que ya no está en marcha: se guarda para consultarlo. */
export interface ArchivedPlan {
  id: string;
  archivedAt: string;
  plan: Plan;
  races?: TuneUpRace[]; // carreras secundarias que tenía
}

export interface CoachState {
  updatedAt: string;
  model: string;
  summary: string;
  changed: number;
  verdict?: "progresar" | "mantener" | "descargar" | "recuperar";
  error?: string;
}
