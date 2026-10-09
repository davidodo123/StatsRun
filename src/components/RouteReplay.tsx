"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { decodePolyline, project, routeView } from "../lib/route";

const TILE = 256;
const tileUrl = (z: number, x: number, y: number) => `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

const fmtTime = (sec: number) => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Repetición animada del recorrido (estilo «flyover» de Strava, en 2D): la cámara sigue al corredor con más zoom,
 * la línea se va dibujando y se cuentan los km y el tiempo. `children` es el mapa estático que se ve antes y después.
 */
export function RouteReplay({ route, distanceKm, movingSec, children }: { route: string; distanceKm: number; movingSec: number; children: ReactNode }) {
  const W = 640;
  const H = 320;
  const [playing, setPlaying] = useState(false);
  const [p, setP] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  const data = useMemo(() => {
    const pts = decodePolyline(route);
    const fit = routeView(pts, W, H, 24);
    if (!fit) return undefined;
    // con movimiento reducido no se mueve la cámara: se dibuja sobre el mapa completo
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const zoom = reduced ? fit.zoom : Math.min(17, fit.zoom + 2);
    const px = pts.map((pt) => project(pt, zoom));
    const cum = [0];
    for (let i = 1; i < px.length; i++) cum.push(cum[i - 1] + Math.hypot(px[i][0] - px[i - 1][0], px[i][1] - px[i - 1][1]));
    // origen fijo del encuadre completo (solo se usa con movimiento reducido)
    const first = fit.path[0];
    const fixed: [number, number] = [px[0][0] - first[0], px[0][1] - first[1]];
    return { px, cum, total: cum[cum.length - 1], zoom, reduced, fixed };
  }, [route]);

  // duración según la distancia: 6 s para un rodaje corto, hasta 14 s para una tirada larga
  const duration = Math.min(14_000, Math.max(6_000, distanceKm * 600));

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      // suavizado al principio y al final
      setP(k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else setTimeout(() => setPlaying(false), 1200);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, duration]);

  if (!data) return <>{children}</>;

  const play = () => {
    setP(0);
    setPlaying(true);
  };

  if (!playing)
    return (
      <div className="relative">
        {children}
        <button type="button" onClick={play} className="btn absolute bottom-3 left-3 shadow-lg">
          ▶ Reproducir recorrido
        </button>
      </div>
    );

  // posición actual a lo largo del recorrido
  const target = p * data.total;
  let i = 1;
  while (i < data.cum.length - 1 && data.cum[i] < target) i++;
  const seg = data.cum[i] - data.cum[i - 1] || 1;
  const f = Math.min(1, Math.max(0, (target - data.cum[i - 1]) / seg));
  const pos: [number, number] = [data.px[i - 1][0] + (data.px[i][0] - data.px[i - 1][0]) * f, data.px[i - 1][1] + (data.px[i][1] - data.px[i - 1][1]) * f];
  const [ox, oy] = data.reduced ? data.fixed : [pos[0] - W / 2, pos[1] - H / 2];
  const n = 2 ** data.zoom;
  const tiles: { key: string; href: string; x: number; y: number }[] = [];
  for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + W) / TILE); tx++)
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + H) / TILE); ty++)
      if (ty >= 0 && ty < n) tiles.push({ key: `${tx}-${ty}`, href: tileUrl(data.zoom, ((tx % n) + n) % n, ty), x: tx * TILE - ox, y: ty * TILE - oy });
  const toView = ([x, y]: [number, number]) => `${(x - ox).toFixed(1)},${(y - oy).toFixed(1)}`;
  const all = data.px.map(toView).join(" ");
  const done = [...data.px.slice(0, i), pos].map(toView).join(" ");
  const [mx, my] = [pos[0] - ox, pos[1] - oy];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-surface-2" role="img" aria-label="Repetición del recorrido">
        {tiles.map((t) => (
          <image key={t.key} href={t.href} x={t.x} y={t.y} width={TILE} height={TILE} preserveAspectRatio="none" />
        ))}
        <polyline points={all} fill="none" stroke="var(--accent)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.25} />
        <polyline points={done} fill="none" stroke="white" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
        <polyline points={done} fill="none" stroke="var(--accent)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={mx} cy={my} r={14} fill="var(--accent)" opacity={0.25} />
        <circle cx={mx} cy={my} r={7} fill="var(--accent)" stroke="white" strokeWidth={3} />
        <text x={W - 6} y={H - 6} textAnchor="end" fontSize={10} fill="#333" stroke="white" strokeWidth={3} paintOrder="stroke">
          © OpenStreetMap · © CARTO
        </text>
      </svg>
      <div className="absolute left-3 top-3 rounded-xl bg-surface/90 px-3 py-2 text-sm font-semibold tabular shadow" aria-live="off">
        {(p * distanceKm).toFixed(2)} km · {fmtTime(p * movingSec)}
      </div>
      <button type="button" onClick={() => setPlaying(false)} className="btn btn-ghost absolute bottom-3 left-3 bg-surface/90">
        ⏹ Parar
      </button>
    </div>
  );
}
