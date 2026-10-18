// Desacople aeróbico (Pa:FC, Friel / TrainingPeaks): cuánto cae la eficiencia (velocidad / pulso)
// de la 1.ª a la 2.ª mitad de un rodaje largo y estable. < 5 % = buena base aeróbica.

export interface Streams {
  time: number[]; // segundos desde el inicio
  heartrate: number[];
  velocity: number[]; // m/s
  moving?: boolean[];
}

/** Mínimo de minutos en movimiento para que el dato tenga sentido. */
export const DECOUPLING_MIN_MIN = 60;
const WARMUP_SEC = 10 * 60;
// por debajo de esto es caminar o estar parado: falsea la eficiencia
const MIN_SPEED = 1.5;

/** Desacople en % (positivo = el pulso sube o el ritmo cae al final), o undefined si no hay datos suficientes. */
export function aerobicDecoupling({ time, heartrate, velocity, moving }: Streams): number | undefined {
  const pts: { dt: number; hr: number; v: number }[] = [];
  let movingSec = 0;
  for (let i = 1; i < time.length; i++) {
    const dt = time[i] - time[i - 1];
    // huecos largos (pausa del reloj) no cuentan
    if (dt <= 0 || dt > 30 || moving?.[i] === false) continue;
    movingSec += dt;
    if (movingSec <= WARMUP_SEC || !(heartrate[i] > 0) || !(velocity[i] >= MIN_SPEED)) continue;
    pts.push({ dt, hr: heartrate[i], v: velocity[i] });
  }
  if (movingSec < DECOUPLING_MIN_MIN * 60) return;
  const total = pts.reduce((s, p) => s + p.dt, 0);
  if (total < (DECOUPLING_MIN_MIN * 60 - WARMUP_SEC) * 0.8) return;
  const half = (from: number, to: number) => {
    let t = 0, sv = 0, shr = 0, sdt = 0;
    for (const p of pts) {
      t += p.dt;
      if (t <= from || t > to) continue;
      sv += p.v * p.dt;
      shr += p.hr * p.dt;
      sdt += p.dt;
    }
    return sv / sdt / (shr / sdt);
  };
  const ef1 = half(0, total / 2);
  const ef2 = half(total / 2, total);
  return +(((ef1 - ef2) / ef1) * 100).toFixed(1);
}

export function decouplingLabel(pct: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (pct < 5) return { label: "Buena base aeróbica", tone: "good" };
  if (pct < 10) return { label: "Base aeróbica mejorable", tone: "warn" };
  return { label: "Te cuesta mantener el ritmo al final", tone: "bad" };
}
