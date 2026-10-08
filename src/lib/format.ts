export function fmtDuration(totalSec: number): string {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** seg/km → "4:35" */
export function fmtPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return "–";
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtPaceRange(r: { fast: number; slow: number }): string {
  if (Math.abs(r.fast - r.slow) < 3) return `${fmtPace(r.fast)} /km`;
  return `${fmtPace(r.fast)}–${fmtPace(r.slow)} /km`;
}

export function fmtKm(km: number, digits = 1): string {
  return km.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "1:23:45", "45:30" o "45" (min) → segundos */
export function parseTime(input: string): number | undefined {
  const parts = input.trim().split(":").map((p) => p.trim());
  if (!parts.length || parts.some((p) => p === "" || isNaN(Number(p)))) return undefined;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0] * 60;
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return undefined;
}
