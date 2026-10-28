// De dónde salen los puntos del GPS al grabar una carrera:
// - en la app de Android (con el complemento de ubicación en segundo plano): el GPS nativo, que sigue con la pantalla
//   apagada gracias a un servicio en primer plano con la notificación «Grabando carrera»;
// - en el resto (iPhone, navegador, o un APK antiguo sin el complemento): la ubicación del navegador, que solo llega con
//   la app abierta y la pantalla encendida.
import type { GpsPoint } from "@/lib/gpsTrack";
import { isAndroidApp } from "./healthConnect";

export type GpsError = "permiso" | "señal";
type Watch = { stop: () => void };

let orphanChecked = false;

const capacitor = () => (window as { Capacitor?: { isPluginAvailable?: (name: string) => boolean } }).Capacitor;

/** ¿Se puede grabar con la pantalla apagada? Solo en la app de Android con el complemento (APK nuevo). */
export const canRecordInBackground = () => isAndroidApp() && Boolean(capacitor()?.isPluginAvailable?.("BackgroundGeolocation"));

function point(lat: number, lon: number, acc: number, alt: number | null | undefined, t: number): GpsPoint {
  const p: GpsPoint = { t: t || Date.now(), lat, lon, acc: Math.round(acc) };
  if (alt !== null && alt !== undefined && Number.isFinite(alt)) p.alt = Math.round(alt * 10) / 10;
  return p;
}

/**
 * Empieza a escuchar el GPS. Con `background` (y solo si se puede), en segundo plano con notificación.
 * Devuelve cómo pararlo.
 */
export async function watchGps(
  onPoint: (p: GpsPoint) => void,
  onError: (e: GpsError) => void,
  background: boolean,
  notice = { title: "Grabando carrera", text: "Zancavolt sigue grabando con la pantalla apagada. Vuelve a la app para pausar o terminar." },
): Promise<Watch> {
  if (background && canRecordInBackground()) {
    const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
    let stopped = false;
    // sin permiso, el error llega aquí (y no en el callback)
    const started = BackgroundGeolocation.start(
      {
        backgroundTitle: notice.title,
        backgroundMessage: notice.text,
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
      },
      (loc, err) => {
        if (stopped) return;
        if (err) return onError(err.code === "NOT_AUTHORIZED" ? "permiso" : "señal");
        if (loc) onPoint(point(loc.latitude, loc.longitude, loc.accuracy, loc.altitude, loc.time ?? Date.now()));
      },
    );
    await started.catch((e: { code?: string }) => onError(e?.code === "NOT_AUTHORIZED" ? "permiso" : "señal"));
    return {
      stop: () => {
        stopped = true;
        BackgroundGeolocation.stop()
          .catch(() => {})
          .then(() => runNotification()?.then((p) => p.clear()))
          .catch(() => {});
      },
    };
  }

  // al abrir la página (una vez): si quedó un servicio en segundo plano suelto (se recargó a mitad de grabar), se para
  if (canRecordInBackground() && !orphanChecked) {
    orphanChecked = true;
    import("@capgo/background-geolocation").then(({ BackgroundGeolocation }) => BackgroundGeolocation.stop()).catch(() => {});
  }

  if (!("geolocation" in navigator)) {
    onError("señal");
    return { stop: () => {} };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onPoint(point(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.altitude, pos.timestamp)),
    (e) => onError(e.code === e.PERMISSION_DENIED ? "permiso" : "señal"),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  );
  return { stop: () => navigator.geolocation.clearWatch(id) };
}

// complemento propio del APK (RunNotificationPlugin.java): pone los datos en la notificación «Grabando carrera»
type RunNotification = { update: (o: { title: string; text: string; chronoBase?: number }) => Promise<void>; clear: () => Promise<void> };
let runNotif: Promise<RunNotification> | undefined;
const runNotification = () =>
  capacitor()?.isPluginAvailable?.("RunNotification") ? (runNotif ??= import("@capacitor/core").then(({ registerPlugin }) => registerPlugin<RunNotification>("RunNotification"))) : undefined;

/**
 * Tiempo, km y ritmo medio en la notificación y en la pantalla de bloqueo (Android, mientras graba en segundo plano).
 * `chronoBase`: la hora a la que el cronómetro marcaría 0 (el inicio más las pausas); el reloj lo lleva Android.
 */
export function showRunData(title: string, text: string, chronoBase: number) {
  runNotification()
    ?.then((p) => p.update({ title, text, chronoBase }))
    .catch(() => {});
}

/** Si al usuario se le negó el permiso en Android, abre los ajustes de la app. */
export async function openLocationSettings() {
  if (!canRecordInBackground()) return;
  const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
  await BackgroundGeolocation.openSettings();
}
