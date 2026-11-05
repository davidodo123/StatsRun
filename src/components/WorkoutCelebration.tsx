"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CELEBRATE_COOKIE, celebrationSport } from "@/lib/celebrateCookie";
import { translator } from "@/lib/i18n";
import type { SportKind } from "@/lib/types";
import { useClientLocale } from "./useClientLocale";

const DURATION = 3000; // igual que las animaciones .liquid en globals.css
const CHECK_EVERY = 250;

// una onda que se repite cada 400 de ancho: se desplaza justo eso, sin que se note el corte
const WAVE = "M-400 0 V-14 C-300 -34 -300 6 -200 -14 S-100 6 0 -14 S100 6 200 -14 S300 6 400 -14 S500 6 600 -14 S700 6 800 -14 V0Z";
const BUBBLES = [
  { x: 70, y: 470, r: 11, delay: "0.3s" },
  { x: 145, y: 500, r: 7, delay: "0.75s" },
  { x: 200, y: 460, r: 14, delay: "0.15s" },
  { x: 265, y: 510, r: 8, delay: "0.9s" },
  { x: 325, y: 480, r: 12, delay: "0.5s" },
];

/** Línea gruesa de punta redonda (brazos, piernas, cuadro de la bici…). */
const Limb = ({ d, w = 42 }: { d: string; w?: number }) => <path d={d} fill="none" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;

/** La figura de cada deporte, en un lienzo de 400 × 500. */
const FIGURES: Record<SportKind, ReactNode> = {
  // unas pesas en diagonal, para que quepan lo más grandes posible
  strength: (
    <g transform="rotate(-45 200 250)">
      <rect x="-5" y="185" width="60" height="130" rx="20" />
      <rect x="62" y="150" width="78" height="200" rx="22" />
      <rect x="130" y="226" width="140" height="48" />
      <rect x="260" y="150" width="78" height="200" rx="22" />
      <rect x="345" y="185" width="60" height="130" rx="20" />
    </g>
  ),
  // muñeco corriendo hacia la derecha
  run: (
    <>
      <circle cx="262" cy="68" r="50" />
      <Limb d="M232 150 L190 280" w={62} />
      <Limb d="M234 158 L305 212 L362 162" />
      <Limb d="M234 158 L150 178 L100 252" />
      <Limb d="M190 280 L286 330 L268 448 L318 462" w={48} />
      <Limb d="M190 280 L140 376 L34 368" w={48} />
    </>
  ),
  walk: (
    <>
      <circle cx="205" cy="62" r="50" />
      <Limb d="M205 150 L198 290" w={64} />
      <Limb d="M207 158 L258 228 L282 296" />
      <Limb d="M205 158 L156 226 L132 294" />
      <Limb d="M198 290 L256 378 L276 472 L320 472" w={48} />
      <Limb d="M198 290 L170 382 L104 468" w={48} />
    </>
  ),
  // ciclista: las ruedas son aros, el líquido se ve subir por ellos
  ride: (
    <>
      <circle cx="84" cy="402" r="66" fill="none" strokeWidth="24" />
      <circle cx="316" cy="402" r="66" fill="none" strokeWidth="24" />
      <Limb d="M84 402 L180 402 L282 306 L316 402 M180 402 L150 300 M282 306 L272 268" w={20} />
      <circle cx="272" cy="72" r="46" />
      <Limb d="M238 148 L150 268" w={58} />
      <Limb d="M240 152 L290 222 L276 268" w={36} />
      <Limb d="M150 268 L236 326 L186 402" w={42} />
    </>
  ),
  // nadador a crol sobre dos olas
  swim: (
    <>
      <circle cx="288" cy="232" r="48" />
      <Limb d="M60 300 L215 262" w={62} />
      <Limb d="M215 258 L236 118 L356 150" w={40} />
      <Limb d="M18 382 C70 342 110 342 160 382 S250 422 300 382 S360 352 392 372" w={32} />
      <Limb d="M18 462 C70 422 110 422 160 462 S250 502 300 462 S360 432 392 452" w={32} />
    </>
  ),
  // cualquier otro: el rayo de Zancavolt
  other: <path d="M246 6 L62 286 H176 L132 494 L340 188 H220 Z" strokeWidth="14" strokeLinejoin="round" />,
};

/**
 * Al registrar un entreno, una figura gigante del deporte hecho (pesas, muñeco corriendo, bici…) se llena de líquido lima.
 * Las acciones dejan una cookie con el deporte (lib/celebrate.ts) porque muchas cambian de pantalla justo al guardar; aquí
 * se mira cada poco para que valga igual con cambio de pantalla o sin él. No bloquea los toques.
 */
export function WorkoutCelebration() {
  const t = translator(useClientLocale());
  const [play, setPlay] = useState<{ n: number; sport: SportKind } | null>(null);

  useEffect(() => {
    const check = setInterval(() => {
      const cookie = document.cookie.split("; ").find((c) => c.startsWith(`${CELEBRATE_COOKIE}=`));
      if (!cookie) return;
      document.cookie = `${CELEBRATE_COOKIE}=; Max-Age=0; path=/`;
      setPlay((p) => ({ n: (p?.n ?? 0) + 1, sport: celebrationSport(cookie.slice(CELEBRATE_COOKIE.length + 1)) }));
    }, CHECK_EVERY);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!play) return;
    const end = setTimeout(() => setPlay(null), DURATION);
    return () => clearTimeout(end);
  }, [play]);

  if (!play) return null;
  const figure = FIGURES[play.sport];
  return (
    <div key={play.n} className="liquid" role="status" data-sport={play.sport}>
      <svg className="liquid-figure" viewBox="0 0 400 500" aria-hidden>
        <defs>
          <mask id="liquid-mask" maskUnits="userSpaceOnUse" x="-40" y="-40" width="480" height="580">
            <g fill="#fff" stroke="#fff">
              {figure}
            </g>
          </mask>
        </defs>
        {/* la figura vacía, y encima el líquido recortado con su forma */}
        <g className="liquid-empty">{figure}</g>
        <g mask="url(#liquid-mask)">
          <g className="liquid-level">
            <path className="liquid-wave liquid-wave-back" d={WAVE} />
            <path className="liquid-wave" d={WAVE} />
            <rect x="-40" y="-1" width="480" height="600" />
            {BUBBLES.map((b) => (
              <circle key={b.x} className="liquid-bubble" cx={b.x} cy={b.y} r={b.r} style={{ animationDelay: b.delay }} />
            ))}
          </g>
        </g>
      </svg>
      <p className="liquid-message font-display text-4xl uppercase tracking-[0.03em]">{t("cel.guardado")}</p>
    </div>
  );
}
