"use client";

import { useEffect, useState } from "react";
import { CELEBRATE_COOKIE } from "@/lib/celebrateCookie";
import { translator } from "@/lib/i18n";
import { Icon } from "./icons";
import { useClientLocale } from "./useClientLocale";

const DURATION = 2600; // igual que .liquid-body en globals.css
const CHECK_EVERY = 250;

// una onda que se repite cada 600 de ancho: el SVG mide el doble de la pantalla y se desplaza la mitad, sin que se note el corte
const WAVE = "M0 24 C100 0 200 0 300 24 S500 48 600 24 S800 0 900 24 S1100 48 1200 24 V48 H0Z";
const BUBBLES = [
  { left: "12%", size: 14, delay: "0.2s" },
  { left: "28%", size: 8, delay: "0.5s" },
  { left: "47%", size: 18, delay: "0.1s" },
  { left: "63%", size: 10, delay: "0.65s" },
  { left: "78%", size: 16, delay: "0.35s" },
  { left: "90%", size: 7, delay: "0.8s" },
];

/**
 * Al registrar un entreno, el líquido lima de la app sube ondulando hasta llenar la pantalla y vuelve a bajar.
 * Las acciones dejan una cookie (lib/celebrate.ts) porque muchas cambian de pantalla justo al guardar; aquí se mira
 * cada poco para que valga igual con cambio de pantalla o sin él. No bloquea los toques.
 */
export function WorkoutCelebration() {
  const t = translator(useClientLocale());
  const [play, setPlay] = useState(0);

  useEffect(() => {
    const check = setInterval(() => {
      if (!document.cookie.split("; ").some((c) => c.startsWith(`${CELEBRATE_COOKIE}=`))) return;
      document.cookie = `${CELEBRATE_COOKIE}=; Max-Age=0; path=/`;
      setPlay((n) => n + 1);
    }, CHECK_EVERY);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!play) return;
    const end = setTimeout(() => setPlay(0), DURATION);
    return () => clearTimeout(end);
  }, [play]);

  if (!play) return null;
  return (
    <div key={play} className="liquid" role="status">
      <div className="liquid-body">
        <svg className="liquid-wave liquid-wave-back" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden>
          <path d={WAVE} />
        </svg>
        <svg className="liquid-wave" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden>
          <path d={WAVE} />
        </svg>
        {BUBBLES.map((b) => (
          <span key={b.left} className="liquid-bubble" style={{ left: b.left, width: b.size, height: b.size, animationDelay: b.delay }} aria-hidden />
        ))}
      </div>
      <div className="liquid-message">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-accent-ink text-accent">
          <Icon name="check" className="h-10 w-10" />
        </span>
        <p className="font-display text-4xl uppercase tracking-[0.03em]">{t("cel.guardado")}</p>
      </div>
    </div>
  );
}
