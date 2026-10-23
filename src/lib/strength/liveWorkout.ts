// El entreno en curso se guarda en el navegador (lo escribe WorkoutLogger): si se cierra la app o se bloquea el móvil, sigue donde estaba.
export const LIVE_WORKOUT_KEY = "rio-entreno";
/** Pasado este tiempo, el entreno a medias se da por abandonado. */
export const LIVE_WORKOUT_MAX_MS = 12 * 3600_000;

/** Lo justo del entreno en curso para enseñarlo fuera de la página del entreno. */
export interface LiveWorkoutInfo {
  name: string;
  routineId?: string;
  startedAt: number;
  pausedAt?: number;
  pausedMs?: number;
  exercises: { sets: { done: boolean; type?: string }[] }[];
}

export function readLiveWorkout(): LiveWorkoutInfo | undefined {
  try {
    const raw = localStorage.getItem(LIVE_WORKOUT_KEY);
    const w = raw ? (JSON.parse(raw) as LiveWorkoutInfo) : undefined;
    return w?.exercises && Date.now() - w.startedAt < LIVE_WORKOUT_MAX_MS ? w : undefined;
  } catch {
    return undefined;
  }
}
