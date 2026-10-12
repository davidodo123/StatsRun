"use client";

import { useEffect, useState, useTransition } from "react";
import { saveHealthFromApp } from "@/app/actions";
import { HC_ON, hcAutoSync, hcAvailable, hcConnect, hcOpenSettings, isAndroidApp } from "./healthConnect";
import { Card } from "./ui";

/** Perfil → Salud en la app de Android: conectar Health Connect (sin atajos ni claves). */
export function HealthConnectCard({ lastSync }: { lastSync?: string }) {
  const [android, setAndroid] = useState(false);
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();
  useEffect(() => {
    // solo se sabe en el navegador (y no cambia): se lee una vez al montar
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAndroid(isAndroidApp());
    setOn(localStorage.getItem(HC_ON) === "1");
  }, []);
  if (!android) return null;

  const syncNow = () =>
    start(async () => {
      setMsg(undefined);
      let res: { ok?: boolean; message?: string; error?: string } | undefined;
      await hcAutoSync(async (body) => (res = await saveHealthFromApp(body)), true);
      setMsg(res ? (res.error ?? res.message) : "No hay datos de los últimos 7 días en Health Connect.");
    });

  const connect = () =>
    start(async () => {
      setMsg(undefined);
      try {
        if (!(await hcAvailable())) return setMsg("Este móvil no tiene Health Connect: instálalo desde Google Play («Health Connect de Android») y vuelve aquí.");
        const granted = await hcConnect();
        if (!granted.length) return setMsg("Sin permiso no se puede leer nada. Puedes darlo cuando quieras.");
        localStorage.setItem(HC_ON, "1");
        setOn(true);
      } catch {
        return setMsg("No se pudo abrir Health Connect.");
      }
      syncNow();
    });

  return (
    <Card title="Health Connect" subtitle="Pasos, calorías, sueño y pulso de tu móvil o tu reloj, sin atajos ni claves">
      <div className="space-y-3 text-sm">
        {on ? (
          <>
            <p className="text-ink-2">
              Conectado. Los últimos 7 días se mandan solos cada vez que abres la app.
              {lastSync && ` Última vez: ${new Date(lastSync).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={syncNow} disabled={pending}>
                {pending ? "Leyendo…" : "Sincronizar ahora"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => hcOpenSettings()}>
                Permisos
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-ink-2">Dale permiso una vez y tus datos de salud llegarán solos. Funciona con lo que guarde Health Connect: el móvil, Samsung Health, Fitbit, Garmin…</p>
            <button type="button" className="btn" onClick={connect} disabled={pending}>
              {pending ? "Conectando…" : "Conectar con Health Connect"}
            </button>
          </>
        )}
        {msg && <p className="font-medium">{msg}</p>}
      </div>
    </Card>
  );
}
