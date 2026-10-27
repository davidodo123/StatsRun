"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveRecordedRun } from "@/app/actions";
import { acceptPoint, trackStats, type GpsPoint } from "@/lib/gpsTrack";
import { project } from "@/lib/route";
import { fmtDuration, fmtKm, fmtPace } from "@/lib/format";
import { Icon } from "./icons";
import { canRecordInBackground, openLocationSettings, showRunData, watchGps, type GpsError } from "./gpsSource";

type Sport = "run" | "walk" | "ride";
interface Rec {
  startedAt: number; // epoch ms
  sport: Sport;
  points: GpsPoint[];
  pausedMs: number;
  pausedAt?: number;
  resume?: boolean; // el próximo punto abre tramo nuevo (tras una pausa)
}

// la grabación en curso se guarda en el navegador: si se cierra la app, se sigue o se guarda lo grabado
const STORAGE = "rio-gps";
const load = (): Rec | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Rec) : undefined;
  } catch {
    return undefined;
  }
};
const store = (r: Rec | undefined) => {
  try {
    if (r) localStorage.setItem(STORAGE, JSON.stringify(r));
    else localStorage.removeItem(STORAGE);
  } catch {}
};
const localIso = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const SPORT_ICON = { run: "run", walk: "walk", ride: "bike" } as const;
const SPORT_TITLE = { run: "Corriendo", walk: "Caminando", ride: "En bici" } as const;
// al volver a la app con una grabación en marcha: si el último punto es de hace menos de esto, sigue grabando
const RESUME_MS = 15 * 60_000;
const SPORTS: [Sport, string][] = [
  ["run", "Correr"],
  ["walk", "Caminar"],
  ["ride", "Bici"],
];

/** Dibujo del recorrido sin mapa debajo (cabe en cualquier pantalla y no gasta datos). */
function Trace({ points }: { points: GpsPoint[] }) {
  if (points.length < 2) return null;
  const px = points.map((p) => project([p.lat, p.lon], 17));
  const xs = px.map((p) => p[0]);
  const ys = px.map((p) => p[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const w = Math.max(1, Math.max(...xs) - x0);
  const h = Math.max(1, Math.max(...ys) - y0);
  const k = Math.min(280 / w, 160 / h);
  const pts = px.map(([x, y]) => `${(10 + (x - x0) * k + (280 - w * k) / 2).toFixed(1)},${(10 + (y - y0) * k + (160 - h * k) / 2).toFixed(1)}`);
  const [ex, ey] = pts.at(-1)!.split(",");
  return (
    <svg viewBox="0 0 300 180" className="h-40 w-full" role="img" aria-label="Recorrido grabado">
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

/** Grabar una carrera con el GPS del móvil: cronómetro, distancia, ritmo y recorrido; al terminar se guarda como un entreno. */
export function RunRecorder() {
  const [rec, setRec] = useState<Rec>();
  const [ready, setReady] = useState(false);
  const [fix, setFix] = useState<{ acc: number; at: number }>();
  const [geoError, setGeoError] = useState<GpsError>();
  // app de Android con el complemento: graba con la pantalla apagada
  const [native, setNative] = useState(false);
  // la hora se pone al montar: la página se prerenderiza sin reloj
  const [now, setNow] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const saved = useRef(false);

  useEffect(() => {
    const stored = load();
    // una grabación de hace más de 12 h ya no sigue en curso
    if (stored?.points && Date.now() - stored.startedAt < 12 * 3600_000) {
      // el iPhone cierra la app si se bloquea o se cambia de app: si hace poco del último punto, sigue grabando
      // (el hueco cuenta en línea recta); si no, en pausa desde el último punto, no desde ahora
      const lastAt = stored.points.at(-1)?.t ?? stored.startedAt;
      const pausedAt = stored.pausedAt ?? (Date.now() - lastAt < RESUME_MS ? undefined : lastAt);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
      setRec({ ...stored, pausedAt });
    }
    setNative(canRecordInBackground());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !saved.current) store(rec);
  }, [rec, ready]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const recording = Boolean(rec && !rec.pausedAt);
  // en la app de Android, mientras graba, el GPS nativo en segundo plano (con su notificación)
  const background = recording && native;

  // el GPS se escucha siempre en esta página: antes de empezar, para saber si hay señal
  useEffect(() => {
    let watch: { stop: () => void } | undefined;
    let off = false;
    const onPoint = (p: GpsPoint) => {
      setFix({ acc: p.acc ?? 0, at: Date.now() });
      setGeoError(undefined);
      setRec((cur) => {
        if (!cur || cur.pausedAt) return cur;
        const point = cur.resume ? { ...p, b: 1 as const } : p;
        if (!acceptPoint(cur.points.at(-1), point)) return cur;
        return { ...cur, resume: false, points: [...cur.points, point] };
      });
    };
    watchGps(onPoint, setGeoError, background).then((w) => (off ? w.stop() : (watch = w)));
    return () => {
      off = true;
      watch?.stop();
    };
  }, [background]);

  // pantalla encendida mientras graba: en el iPhone (y sin el GPS nativo), con la pantalla bloqueada no llega la ubicación
  useEffect(() => {
    if (!recording || native) return;
    let lock: { release: () => Promise<void> } | undefined;
    const ask = () => {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      wl?.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    const onVisible = () => document.visibilityState === "visible" && ask();
    ask();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [recording, native]);

  const stats = useMemo(() => trackStats(rec?.points ?? []), [rec?.points]);

  // Android con la pantalla apagada: km y ritmo medio en la notificación (como mucho cada 3 s; el tiempo lo cuenta Android)
  const lastNotif = useRef(0);
  useEffect(() => {
    if (!background || !rec) return;
    const t = Date.now();
    if (t - lastNotif.current < 3000 && rec.points.length > 1) return;
    lastNotif.current = t;
    const km = stats.distanceM / 1000;
    const pace = km >= 0.05 ? `${fmtPace(stats.movingSec / km)} /km` : "–";
    showRunData(SPORT_TITLE[rec.sport], `${fmtKm(km, 2)} km · ritmo medio ${pace}`, rec.startedAt + rec.pausedMs);
  }, [background, rec, stats]);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  const signal = fix && now - fix.at < 15_000 ? fix.acc : undefined;
  const geoText =
    geoError === "permiso"
      ? native
        ? "No hay permiso de ubicación. Dale «Permitir» (y el de notificaciones, para grabar con la pantalla apagada)."
        : "No hay permiso de ubicación. En el iPhone: Ajustes → Privacidad → Localización → Safari (o la app) → «Mientras se usa». En Android: permisos de la app → Ubicación."
      : geoError
        ? "No llega la señal del GPS. Sal a cielo abierto y espera unos segundos."
        : undefined;
  const signalText = geoError ? "Sin GPS" : signal === undefined ? "Buscando señal…" : signal <= 15 ? `GPS bueno · ±${signal} m` : signal <= 35 ? `GPS regular · ±${signal} m` : `GPS flojo · ±${signal} m`;
  const signalTone = geoError || signal === undefined ? "bg-muted" : signal <= 15 ? "bg-good" : signal <= 35 ? "bg-warning" : "bg-critical";

  const begin = (sport: Sport) => {
    setError(undefined);
    setRec(() => ({ startedAt: Date.now(), sport, points: [], pausedMs: 0 }));
  };
  const togglePause = () =>
    setRec((cur) => cur && (cur.pausedAt ? { ...cur, pausedMs: cur.pausedMs + Date.now() - cur.pausedAt, pausedAt: undefined, resume: true } : { ...cur, pausedAt: Date.now() }));
  const discard = () => {
    if (!confirm("¿Descartar la grabación? Se perderá el recorrido.")) return;
    setFinishing(false);
    setRec(undefined);
  };
  const finish = (fd: FormData) =>
    start(async () => {
      if (!rec) return;
      // se borra antes de guardar porque la acción redirige; si falla, se vuelve a guardar
      saved.current = true;
      store(undefined);
      const res = await saveRecordedRun({
        sport: String(fd.get("sport") ?? rec.sport),
        name: String(fd.get("name") ?? ""),
        startLocal: localIso(rec.startedAt),
        points: rec.points,
        rpe: Number(fd.get("rpe")) || undefined,
        feel: String(fd.get("feel") ?? "") || undefined,
        feelings: String(fd.get("feelings") ?? ""),
      });
      if (res?.error) {
        saved.current = false;
        store(rec);
        setError(res.error);
      }
    });

  const Signal = (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
      <span className={`h-2.5 w-2.5 rounded-full ${signalTone}`} aria-hidden /> {signalText}
    </span>
  );

  // ---------- Antes de empezar ----------
  if (!rec)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
          <strong>GPS</strong>
          {Signal}
        </div>
        {geoText && (
          <p className="rounded-xl border border-critical/40 bg-critical/10 p-3 text-sm">
            {geoText}
            {geoError === "permiso" && native && (
              <button type="button" className="ml-1 font-semibold text-accent underline" onClick={() => openLocationSettings()}>
                Abrir ajustes
              </button>
            )}
          </p>
        )}
        <p className="text-sm text-ink-2">
          {native
            ? "Puedes bloquear el móvil o cambiar de app: sigue grabando (verás la notificación «Grabando carrera»). Para pausar o terminar, vuelve a la app."
            : "Deja la app abierta: la pantalla se queda encendida sola. Si la bloqueas o cambias de app, deja de grabar."}
        </p>
        {/* ninguno va marcado: el que toques empieza a grabar */}
        <p className="text-sm font-semibold">¿Qué vas a hacer? Toca para empezar</p>
        <div className="grid grid-cols-3 gap-2">
          {SPORTS.map(([s, label]) => (
            <button key={s} type="button" className="btn btn-ghost flex-col gap-1 py-4 text-base" onClick={() => begin(s)}>
              <Icon name={SPORT_ICON[s]} className="h-6 w-6" />
              {label}
            </button>
          ))}
        </div>
      </div>
    );

  // ---------- Grabando ----------
  const active = Math.max(0, Math.floor(((rec.pausedAt ?? now) - rec.startedAt - rec.pausedMs) / 1000));
  const km = stats.distanceM / 1000;
  const avgPace = km >= 0.05 ? stats.movingSec / km : undefined;
  const paused = Boolean(rec.pausedAt);
  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="text-sm text-critical" onClick={discard}>
          Descartar
        </button>
        {Signal}
        <button type="button" className="btn px-4 py-1.5" onClick={() => (setRec((cur) => cur && (cur.pausedAt ? cur : { ...cur, pausedAt: Date.now() })), setFinishing(true))}>
          Terminar
        </button>
      </div>

      <section className={`rounded-3xl border p-5 text-center ${paused ? "border-line bg-surface" : "border-accent bg-accent/10"}`}>
        <p className="text-sm font-semibold text-ink-2">{paused ? "En pausa" : "Grabando"}</p>
        <p className="tabular my-1 text-6xl font-bold tracking-tight">{fmtDuration(active)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[11px] text-muted">Distancia</p>
            <p className="tabular text-2xl font-bold">{fmtKm(km, 2)}</p>
            <p className="text-[11px] text-muted">km</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">Ritmo actual</p>
            <p className="tabular text-2xl font-bold">{stats.paceNow && !paused ? fmtPace(stats.paceNow) : "–"}</p>
            <p className="text-[11px] text-muted">/km</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">Ritmo medio</p>
            <p className="tabular text-2xl font-bold">{avgPace ? fmtPace(avgPace) : "–"}</p>
            <p className="text-[11px] text-muted">/km</p>
          </div>
        </div>
      </section>

      <button type="button" onClick={togglePause} className={`btn w-full py-3 text-base ${paused ? "" : "btn-ghost"}`} aria-pressed={paused}>
        <Icon name={paused ? "play" : "pause"} className="mr-1 h-4 w-4 align-[-2px]" />
        {paused ? "Reanudar" : "Pausa"}
      </button>
      {geoText && (
          <p className="rounded-xl border border-critical/40 bg-critical/10 p-3 text-sm">
            {geoText}
            {geoError === "permiso" && native && (
              <button type="button" className="ml-1 font-semibold text-accent underline" onClick={() => openLocationSettings()}>
                Abrir ajustes
              </button>
            )}
          </p>
        )}

      {rec.points.length > 1 && (
        <div className="rounded-2xl border border-line bg-surface p-2">
          <Trace points={rec.points} />
        </div>
      )}
      {stats.splits.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <p className="mb-1 text-xs font-semibold text-muted">Parciales</p>
          <ol className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm tabular sm:grid-cols-5">
            {stats.splits.map((s, i) => (
              <li key={i}>
                <span className="text-muted">km {i + 1}</span> {fmtPace(s)}
              </li>
            ))}
          </ol>
        </div>
      )}
      {stats.gapSec >= 60 && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-ink-2">
          {fmtDuration(stats.gapSec)} sin GPS: esos tramos van en línea recta, así que la distancia se queda corta.
          {!native && " En el iPhone no se graba con la pantalla bloqueada ni con otra app abierta: deja Zancavolt en pantalla mientras corres."}
        </p>
      )}
      <p className="text-center text-xs text-muted">
        {stats.elevationGainM > 0 && `Desnivel +${stats.elevationGainM} m · `}En movimiento {fmtDuration(stats.movingSec)} (se para solo cuando te paras)
      </p>

      {finishing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center" role="dialog" aria-modal aria-label="Guardar carrera">
          <form action={finish} className="max-h-[90dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl">
            <strong className="block text-lg">Guardar</strong>
            <p className="text-sm text-ink-2">
              {fmtKm(km, 2)} km · {fmtDuration(stats.movingSec)}
              {avgPace && ` · ${fmtPace(avgPace)} /km`}
              {stats.elevationGainM > 0 && ` · +${stats.elevationGainM} m`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="field">
                Deporte
                <select className="input" name="sport" defaultValue={rec.sport}>
                  {SPORTS.map(([s, label]) => (
                    <option key={s} value={s}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Esfuerzo (RPE)
                <select className="input" name="rpe" defaultValue="">
                  <option value="">Sin indicar</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Nombre
              <input className="input" name="name" placeholder="Rodaje suave" maxLength={80} />
            </label>
            <label className="field">
              ¿Cómo te ha ido?
              <select className="input" name="feel" defaultValue="">
                <option value="">Sin indicar</option>
                <option value="muy_facil">Muy fácil</option>
                <option value="facil">Fácil</option>
                <option value="bien">Bien</option>
                <option value="duro">Duro</option>
                <option value="muy_duro">Muy duro</option>
              </select>
            </label>
            <label className="field">
              ¿Cómo te has sentido? (opcional)
              <textarea className="input min-h-16" name="feelings" maxLength={1000} placeholder="Piernas, molestias, energía…" />
            </label>
            {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setFinishing(false)}>
                Seguir
              </button>
              <button className="btn flex-1" disabled={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
            <button type="button" className="w-full text-xs text-muted underline" onClick={discard}>
              Descartar la grabación
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
