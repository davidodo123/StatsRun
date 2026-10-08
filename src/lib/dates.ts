// Utilidades de fecha sobre strings "YYYY-MM-DD", operando en UTC para evitar saltos de horario.

const DAY_MS = 86_400_000;

export function toDate(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  return fmt(new Date(toDate(d).getTime() + n * DAY_MS));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY_MS);
}

/** 0 = lunes ... 6 = domingo */
export function weekday(d: string): number {
  return (toDate(d).getUTCDay() + 6) % 7;
}

export function mondayOf(d: string): string {
  return addDays(d, -weekday(d));
}

export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const WEEKDAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function shortDate(d: string): string {
  const dt = toDate(d);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}
