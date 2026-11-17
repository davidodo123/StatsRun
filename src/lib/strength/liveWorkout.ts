// El entreno en curso se guarda en el navegador (lo escribe WorkoutLogger): si se cierra la app o se bloquea el móvil, sigue donde estaba.
// Una clave por cuenta: en un móvil compartido, la siguiente cuenta no ve (ni continúa) el entreno de la anterior.
const LEGACY_KEY = "rio-entreno"; // la de antes, sin dueño
export const liveWorkoutKey = (owner: string) => `${LEGACY_KEY}:${owner}`;
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

/** El de la clave antigua no se sabe de quién es: se borra. */
export function dropLegacyLiveWorkout() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function readLiveWorkout(owner: string): LiveWorkoutInfo | undefined {
  try {
    const raw = localStorage.getItem(liveWorkoutKey(owner));
    const w = raw ? (JSON.parse(raw) as LiveWorkoutInfo) : undefined;
    return w?.exercises && Date.now() - w.startedAt < LIVE_WORKOUT_MAX_MS ? w : undefined;
  } catch {
    return undefined;
  }
}
