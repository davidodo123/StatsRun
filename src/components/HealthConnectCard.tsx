"use client";

import { useEffect, useState, useTransition } from "react";
import { saveHealthFromApp } from "@/app/actions";
import { HC_ON, hcAutoSync, hcAvailable, hcConnect, hcOpenSettings, isAndroidApp } from "./healthConnect";
import { Card } from "./ui";
import { intlLocale, translator, type Locale } from "@/lib/i18n";

/** Perfil → Salud en la app de Android: conectar Health Connect (sin atajos ni claves). */
export function HealthConnectCard({ lastSync, locale = "es" }: { lastSync?: string; locale?: Locale }) {
  const t = translator(locale);
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
      setMsg(res ? (res.error ?? res.message) : t("hc.sinDatos"));
    });

  const connect = () =>
    start(async () => {
      setMsg(undefined);
      try {
        if (!(await hcAvailable())) return setMsg(t("hc.noTiene"));
        const granted = await hcConnect();
        if (!granted.length) return setMsg(t("hc.sinPermiso"));
        localStorage.setItem(HC_ON, "1");
        setOn(true);
      } catch {
        return setMsg(t("hc.noAbre"));
      }
      syncNow();
    });

  return (
    <Card title="Health Connect" subtitle={t("hc.sub")}>
      <div className="space-y-3 text-sm">
        {on ? (
          <>
            <p className="text-ink-2">
              {t("hc.conectado")}
              {lastSync && t("hc.ultima", { fecha: new Date(lastSync).toLocaleString(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }) })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={syncNow} disabled={pending}>
                {pending ? t("hc.leyendo") : t("hc.sincronizar")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => hcOpenSettings()}>
                {t("hc.permisos")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-ink-2">{t("hc.intro")}</p>
            <button type="button" className="btn" onClick={connect} disabled={pending}>
              {pending ? t("hc.conectando") : t("hc.conectar")}
            </button>
          </>
        )}
        {msg && <p className="font-medium">{msg}</p>}
      </div>
    </Card>
  );
}
