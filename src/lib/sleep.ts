// Calculadora de sueño por ciclos: despertarse al final de un ciclo (~90 min) cuesta menos que en mitad de uno.
// Los ciclos duran entre 70 y 120 min según la persona y la noche: 90 es la media, así que las horas son orientativas.

export const CYCLE_MIN = 90;
export const FALL_ASLEEP_MIN = 15; // lo que se suele tardar en dormirse

export interface SleepOption {
  cycles: number;
  time: string; // "HH:MM"
  sleepMin: number; // minutos dormido (sin contar lo que se tarda en dormirse)
}

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return undefined;
  return +m[1] * 60 + +m[2];
};
const toHHMM = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Al acostarse a `bed`: horas de despertarse tras 6, 5, 4 y 3 ciclos (de más a menos sueño). */
export function wakeTimes(bed: string, fallAsleep = FALL_ASLEEP_MIN): SleepOption[] {
  const b = toMin(bed);
  if (b === undefined) return [];
  return [6, 5, 4, 3].map((cycles) => ({ cycles, time: toHHMM(b + fallAsleep + cycles * CYCLE_MIN), sleepMin: cycles * CYCLE_MIN }));
}

/** Para levantarse a `wake`: horas de acostarse para dormir 6, 5, 4 y 3 ciclos. */
export function bedTimes(wake: string, fallAsleep = FALL_ASLEEP_MIN): SleepOption[] {
  const w = toMin(wake);
  if (w === undefined) return [];
  return [6, 5, 4, 3].map((cycles) => ({ cycles, time: toHHMM(w - fallAsleep - cycles * CYCLE_MIN), sleepMin: cycles * CYCLE_MIN }));
}

/** Ciclos recomendados: 5-6 (7,5-9 h). Con una sesión dura o la carrera al día siguiente, mejor 6 si se puede. */
export const recommendedCycles = (hardTomorrow: boolean) => (hardTomorrow ? [6, 5] : [5, 6]);
