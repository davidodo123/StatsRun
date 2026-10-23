// Health Connect (solo en la app de Android): pasos, calorías activas, pulso en reposo, VFC y sueño de los
// últimos días, en el mismo formato que manda el atajo del iPhone ({ dias: [{ fecha, pasos, … }] }).
import type { HealthDataType, HealthSample } from "@capgo/capacitor-health";

const HC_READ: HealthDataType[] = ["steps", "calories", "restingHeartRate", "heartRateVariability", "sleep"];
export const HC_ON = "rio-hc"; // en este móvil se conectó Health Connect
const HC_LAST = "rio-hc-ultima";
const EVERY = 30 * 60_000; // como mucho una sincronización cada 30 min al abrir la app

export const isAndroidApp = () => {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap.getPlatform?.() === "android");
};

// el complemento de Capacitor no se puede devolver tal cual desde una función async: JavaScript lo trataría como una
// promesa (le pide .then() y falla con «"Health.then()" is not implemented»), así que va dentro de un objeto
const plugin = async () => ({ H: (await import("@capgo/capacitor-health")).Health });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("sv-SE"); // fecha local del móvil

export async function hcAvailable(): Promise<boolean> {
  return (await (await plugin()).H.isAvailable()).available;
}

/** Abre la pantalla de permisos de Health Connect. Devuelve qué datos se pueden leer. */
export async function hcConnect(): Promise<HealthDataType[]> {
  return (await (await plugin()).H.requestAuthorization({ read: HC_READ })).readAuthorized;
}

export async function hcOpenSettings() {
  await (await plugin()).H.openHealthConnectSettings();
}

type Day = { fecha: string; pasos?: number; kcalActivas?: number; pulsoReposo?: number; vfc?: number; sueno?: number };

/** Los últimos `days` días, día a día (solo los datos con permiso). */
async function hcRead(days = 7): Promise<{ dias: Day[] }> {
  const { H } = await plugin();
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const range = { startDate: start.toISOString(), endDate: end.toISOString() };
  const ok = new Set((await H.checkAuthorization({ read: HC_READ })).readAuthorized);
  const out = new Map<string, Day>();
  const put = (fecha: string, k: keyof Omit<Day, "fecha">, v: number) => {
    if (!Number.isFinite(v) || v <= 0) return;
    const d = out.get(fecha) ?? { fecha };
    d[k] = v;
    out.set(fecha, d);
  };
  const daily = async (dataType: HealthDataType, aggregation: "sum" | "average", k: keyof Omit<Day, "fecha">, round: (v: number) => number) => {
    if (!ok.has(dataType)) return;
    for (const s of (await H.queryAggregated({ dataType, ...range, bucket: "day", aggregation })).samples) put(dayOf(s.startDate), k, round(s.value));
  };
  await daily("steps", "sum", "pasos", Math.round);
  await daily("calories", "sum", "kcalActivas", Math.round);
  await daily("restingHeartRate", "average", "pulsoReposo", Math.round);

  if (ok.has("heartRateVariability")) {
    const byDay = new Map<string, number[]>();
    for (const s of (await H.readSamples({ dataType: "heartRateVariability", ...range, limit: 1000 })).samples)
      byDay.set(dayOf(s.startDate), [...(byDay.get(dayOf(s.startDate)) ?? []), s.value]);
    for (const [d, v] of byDay) put(d, "vfc", Math.round(v.reduce((a, b) => a + b, 0) / v.length));
  }
  if (ok.has("sleep")) {
    // la noche cuenta para el día en que te despiertas; con fases, solo el tiempo dormido (sin despierto ni «en la cama»)
    const asleep = (s: HealthSample) =>
      s.stages?.length ? s.stages.filter((x) => x.stage !== "awake" && x.stage !== "inBed").reduce((t, x) => t + x.durationMinutes, 0) : s.value;
    const sleepRange = { startDate: new Date(start.getTime() - 864e5).toISOString(), endDate: range.endDate };
    const byDay = new Map<string, number>();
    for (const s of (await H.readSamples({ dataType: "sleep", ...sleepRange, limit: 100 })).samples) byDay.set(dayOf(s.endDate), (byDay.get(dayOf(s.endDate)) ?? 0) + asleep(s));
    for (const [d, min] of byDay) if (d >= dayOf(range.startDate)) put(d, "sueno", Math.round((min / 60) * 100) / 100);
  }
  return { dias: [...out.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)) };
}

/** Al abrir la app (o volver a ella): si está conectado y hace rato de la última vez, manda los últimos 7 días. */
export async function hcAutoSync(send: (body: unknown) => Promise<unknown>, force = false) {
  try {
    if (localStorage.getItem(HC_ON) !== "1") return;
    if (!force && Date.now() - Number(localStorage.getItem(HC_LAST) ?? 0) < EVERY) return;
    const body = await hcRead(7);
    if (!body.dias.length) return;
    await send(body);
    localStorage.setItem(HC_LAST, String(Date.now()));
  } catch {
    // sin permiso o sin Health Connect: ya se verá en Perfil → Salud
  }
}
