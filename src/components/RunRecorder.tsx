"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveRecordedRun } from "@/app/actions";
import { acceptPoint, trackStats, type GpsPoint } from "@/lib/gpsTrack";
import { encodePolyline } from "@/lib/route";
import { RouteMap } from "./RouteMap";
import { fmtDuration, fmtKm, fmtPace } from "@/lib/format";
import { Icon } from "./icons";
import { canRecordInBackground, openLocationSettings, showRunData, watchGps, type GpsError } from "./gpsSource";
import { translator, type Locale, type T } from "@/lib/i18n";

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
// al volver a la app con una grabación en marcha: si el último punto es de hace menos de esto, sigue grabando
const RESUME_MS = 15 * 60_000;
const SPORTS: Sport[] = ["run", "walk", "ride"];

/** Mapa de OpenStreetMap con el recorrido encima; sin recorrido todavía, centrado en donde estás. */
function LiveMap({ points, here, t }: { points: GpsPoint[]; here?: [number, number]; t: T }) {
  const route = useMemo(() => {
    const ll = points.map((p): [number, number] => [p.lat, p.lon]);
    if (ll.length < 2 && here) ll.push(here);
    return ll.length ? encodePolyline(ll.length === 1 ? [ll[0], ll[0]] : ll) : "";
  }, [points, here]);
  if (!route) return null;
  return <RouteMap route={route} width={600} height={340} label={t("gps.trazado")} />;
}

/** Grabar una carrera con el GPS del móvil: cronómetro, distancia, ritmo y recorrido; al terminar se guarda como un entreno. */
export function RunRecorder({ locale = "es" }: { locale?: Locale }) {
  const t = translator(locale);
  const [rec, setRec] = useState<Rec>();
  const [ready, setReady] = useState(false);
  const [fix, setFix] = useState<{ acc: number; at: number; here: [number, number] }>();
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
      setFix({ acc: p.acc ?? 0, at: Date.now(), here: [p.lat, p.lon] });
      setGeoError(undefined);
      setRec((cur) => {
        if (!cur || cur.pausedAt) return cur;
        const point = cur.resume ? { ...p, b: 1 as const } : p;
        if (!acceptPoint(cur.points.at(-1), point)) return cur;
        return { ...cur, resume: false, points: [...cur.points, point] };
      });
    };
    watchGps(onPoint, setGeoError, background, { title: t("gps.notifTitulo"), text: t("gps.notifTexto") }).then((w) => (off ? w.stop() : (watch = w)));
    return () => {
      off = true;
      watch?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el idioma no cambia mientras se graba
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
    const at = Date.now();
    if (at - lastNotif.current < 3000 && rec.points.length > 1) return;
    lastNotif.current = at;
    const km = stats.distanceM / 1000;
    const pace = km >= 0.05 ? `${fmtPace(stats.movingSec / km)} /km` : "–";
    showRunData(t(`gps.${rec.sport}`), t("gps.notif", { km: fmtKm(km, 2, locale), ritmo: pace }), rec.startedAt + rec.pausedMs);
  }, [background, rec, stats, t, locale]);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  const signal = fix && now - fix.at < 15_000 ? fix.acc : undefined;
  const geoText =
    geoError === "permiso"
      ? native
        ? t("gps.permisoApp")
        : t("gps.permisoWeb")
      : geoError
        ? t("gps.senal")
        : undefined;
  const signalText = geoError ? t("gps.sinGps") : signal === undefined ? t("gps.buscando") : t(signal <= 15 ? "gps.bueno" : signal <= 35 ? "gps.regular" : "gps.flojo", { m: signal });
  const signalTone = geoError || signal === undefined ? "bg-muted" : signal <= 15 ? "bg-good" : signal <= 35 ? "bg-warning" : "bg-critical";

  const begin = (sport: Sport) => {
    setError(undefined);
    setRec(() => ({ startedAt: Date.now(), sport, points: [], pausedMs: 0 }));
  };
  const togglePause = () =>
    setRec((cur) => cur && (cur.pausedAt ? { ...cur, pausedMs: cur.pausedMs + Date.now() - cur.pausedAt, pausedAt: undefined, resume: true } : { ...cur, pausedAt: Date.now() }));
  const discard = () => {
    if (!confirm(t("gps.descartarConfirm"))) return;
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
                {t("gps.abrirAjustes")}
              </button>
            )}
          </p>
        )}
        <p className="text-sm text-ink-2">
          {native
            ? t("gps.app")
            : t("gps.web")}
        </p>
        {fix && <LiveMap points={[]} here={fix.here} t={t} />}
        {/* ninguno va marcado: el que toques empieza a grabar */}
        <p className="text-sm font-semibold">{t("gps.queVas")}</p>
        <div className="grid grid-cols-3 gap-2">
          {SPORTS.map((s) => (
            <button key={s} type="button" className="btn btn-ghost flex-col gap-1 py-4 text-base" onClick={() => begin(s)}>
              <Icon name={SPORT_ICON[s]} className="h-6 w-6" />
              {t(`sport.${s}`)}
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
        <button type="button" className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-ink-2 transition hover:border-critical hover:text-critical active:border-critical active:text-critical" onClick={discard}>
          {t("wl.descartar")}
        </button>
        {Signal}
        <button type="button" className="btn px-4 py-1.5" onClick={() => (setRec((cur) => cur && (cur.pausedAt ? cur : { ...cur, pausedAt: Date.now() })), setFinishing(true))}>
          {t("wl.terminar")}
        </button>
      </div>

      <section className={`rounded-3xl border p-5 text-center ${paused ? "border-line bg-surface" : "border-accent bg-accent/10"}`}>
        <p className="text-sm font-semibold text-ink-2">{paused ? t("wl.enPausa") : t("gps.grabando")}</p>
        <p className="tabular my-1 text-6xl font-bold tracking-tight">{fmtDuration(active)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[11px] text-muted">{t("act.distancia")}</p>
            <p className="tabular text-2xl font-bold">{fmtKm(km, 2, locale)}</p>
            <p className="text-[11px] text-muted">km</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">{t("gps.ritmoActual")}</p>
            <p className="tabular text-2xl font-bold">{stats.paceNow && !paused ? fmtPace(stats.paceNow) : "–"}</p>
            <p className="text-[11px] text-muted">/km</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">{t("act.ritmo")}</p>
            <p className="tabular text-2xl font-bold">{avgPace ? fmtPace(avgPace) : "–"}</p>
            <p className="text-[11px] text-muted">/km</p>
          </div>
        </div>
      </section>

      <button type="button" onClick={togglePause} className={`btn w-full py-3 text-base ${paused ? "" : "btn-ghost"}`} aria-pressed={paused}>
        <Icon name={paused ? "play" : "pause"} className="mr-1 h-4 w-4 align-[-2px]" />
        {paused ? t("wl.reanudar") : t("wl.pausa")}
      </button>
      {geoText && (
          <p className="rounded-xl border border-critical/40 bg-critical/10 p-3 text-sm">
            {geoText}
            {geoError === "permiso" && native && (
              <button type="button" className="ml-1 font-semibold text-accent underline" onClick={() => openLocationSettings()}>
                {t("gps.abrirAjustes")}
              </button>
            )}
          </p>
        )}

      {(rec.points.length > 0 || fix) && <LiveMap points={rec.points} here={fix?.here} t={t} />}
      {stats.splits.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <p className="mb-1 text-xs font-semibold text-muted">{t("gps.parciales")}</p>
          <ol className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm tabular sm:grid-cols-5">
            {stats.splits.map((s, i) => (
              <li key={i}>
                <span className="text-muted">{t("gps.km", { n: i + 1 })}</span> {fmtPace(s)}
              </li>
            ))}
          </ol>
        </div>
      )}
      {stats.gapSec >= 60 && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-ink-2">
          {t("gps.hueco", { t: fmtDuration(stats.gapSec) })}
          {!native && ` ${t("gps.huecoIphone")}`}
        </p>
      )}
      <p className="text-center text-xs text-muted">
        {stats.elevationGainM > 0 && t("gps.desnivel", { m: stats.elevationGainM })}
        {t("gps.enMovimiento", { t: fmtDuration(stats.movingSec) })}
      </p>

      {finishing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center" role="dialog" aria-modal aria-label={t("gps.guardarAria")}>
          <form action={finish} className="max-h-[90dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl">
            <strong className="block text-lg">{t("re.guardar")}</strong>
            <p className="text-sm text-ink-2">
              {fmtKm(km, 2, locale)} km · {fmtDuration(stats.movingSec)}
              {avgPace && ` · ${fmtPace(avgPace)} /km`}
              {stats.elevationGainM > 0 && ` · +${stats.elevationGainM} m`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="field">
                {t("af.deporte")}
                <select className="input" name="sport" defaultValue={rec.sport}>
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`sport.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t("gps.rpe")}
                <select className="input" name="rpe" defaultValue="">
                  <option value="">{t("wl.sinIndicar")}</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              {t("wl.nombre")}
              <input className="input" name="name" placeholder={t("gps.nombrePh")} maxLength={80} />
            </label>
            <label className="field">
              {t("gps.comoTeHaIdo")}
              <select className="input" name="feel" defaultValue="">
                <option value="">{t("wl.sinIndicar")}</option>
                {(["muy_facil", "facil", "bien", "duro", "muy_duro"] as const).map((f) => (
                  <option key={f} value={f}>
                    {t(`feel.${f}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("wl.comoTeSentiste")}
              <textarea className="input min-h-16" name="feelings" maxLength={1000} placeholder={t("gps.sentirPh")} />
            </label>
            {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setFinishing(false)}>
                {t("wl.seguir")}
              </button>
              <button className="btn flex-1" disabled={pending}>
                {pending ? t("wl.guardando") : t("re.guardar")}
              </button>
            </div>
            <button type="button" className="w-full text-xs text-muted underline" onClick={discard}>
              {t("gps.descartarGrab")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
