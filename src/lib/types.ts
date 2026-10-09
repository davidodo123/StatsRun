// Modelo de datos de la app. Todas las fechas de calendario son "YYYY-MM-DD" (hora local del atleta).

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
  strengthPerWeek: number; // 0-2
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
  plan?: Plan;
  activities: Activity[];
  strava?: StravaAuth;
  lastSync?: string;
  coach?: CoachState;
  unavailableDates?: string[]; // fechas concretas sin poder entrenar (futuras: no planificar; pasadas: "no pude")
}

export interface CoachState {
  updatedAt: string;
  model: string;
  summary: string;
  changed: number;
  verdict?: "progresar" | "mantener" | "descargar" | "recuperar";
  error?: string;
}
