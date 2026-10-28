"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { translator, type Locale } from "@/lib/i18n";
import { CONSENT_KEY } from "./analyticsConsent";

const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
type Choice = "si" | "no" | undefined;

function readChoice(): Choice {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "si" || v === "no" ? v : undefined;
  } catch {
    return "no";
  }
}

function setChoice(yes: boolean, uid?: string) {
  try {
    localStorage.setItem(CONSENT_KEY, yes ? "si" : "no");
    if (yes) {
      // hasta ahora todo iba en memoria: desde aquí ya se guarda el id del navegador
      posthog.set_config({ persistence: "localStorage+cookie" });
      posthog.opt_in_capturing();
      if (uid) posthog.identify(uid);
    } else {
      posthog.opt_out_capturing();
      posthog.reset();
    }
  } catch {}
}

/** Pregunta una vez si se pueden mandar métricas de uso y une los datos al usuario (por su id, sin nombre ni correo). */
export function Analytics({ uid, locale = "es" }: { uid: string; locale?: Locale }) {
  const t = translator(locale);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const c = readChoice();
    if (c === "si") {
      try {
        posthog.identify(uid);
      } catch {}
      // eslint-disable-next-line react-hooks/set-state-in-effect -- la elección vive en el navegador
    } else if (c === undefined) setAsk(true);
  }, [uid]);
  if (!ask) return null;
  const decide = (yes: boolean) => {
    setChoice(yes, uid);
    setAsk(false);
  };
  return (
    <div
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-line bg-surface p-4 shadow-xl md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
      role="dialog"
      aria-label={t("an.aria")}
    >
      <p className="font-semibold">{t("an.titulo")}</p>
      <p className="mt-1 text-sm text-ink-2">
        {t("an.texto")}{" "}
        <Link href="/privacidad" className="text-accent">
          {t("an.mas")}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn flex-1" onClick={() => decide(true)}>
          {t("an.si")}
        </button>
        <button type="button" className="btn btn-ghost flex-1" onClick={() => decide(false)}>
          {t("an.no")}
        </button>
      </div>
    </div>
  );
}

/** En /privacidad: cambiar la elección. */
export function AnalyticsToggle({ locale = "es" }: { locale?: Locale }) {
  const t = translator(locale);
  const [choice, setState] = useState<Choice>();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la elección vive en el navegador
    if (enabled) setState(readChoice() ?? "no");
  }, []);
  if (!enabled || !choice) return null;
  const toggle = () => {
    const yes = choice !== "si";
    setChoice(yes);
    setState(yes ? "si" : "no");
  };
  return (
    <p className="flex flex-wrap items-center gap-3">
      <span>{t("an.estado", { estado: choice === "si" ? t("an.activadas") : t("an.desactivadas") })}</span>
      <button type="button" className="btn btn-ghost px-3 py-1 text-sm" onClick={toggle}>
        {choice === "si" ? t("an.desactivar") : t("an.activar")}
      </button>
    </p>
  );
}

/** Al cerrar sesión: que el siguiente que use el navegador no herede el usuario. */
export function resetAnalytics() {
  try {
    if (enabled) posthog.reset();
  } catch {}
}
