import { decodePolyline, routeView } from "../lib/route";
import type { CourseMarker } from "../lib/types";
import { ICON_PATHS, type IconName } from "./icons";

// Teselas de OpenStreetMap: uso ligero permitido con atribución (https://operations.osmfoundation.org/policies/tiles/).
export const tileUrl = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

const MARKER: Record<CourseMarker["kind"], { icon?: IconName; label: string; fill: string }> = {
  salida: { icon: "play", label: "Salida", fill: "#16a34a" },
  meta: { icon: "flag", label: "Meta", fill: "#111111" },
  agua: { icon: "droplet", label: "Avituallamiento", fill: "#2563eb" },
  km: { label: "Punto kilométrico", fill: "#6b7280" },
};

/**
 * Mapa del recorrido: teselas de fondo + línea del recorrido, inicio (verde) y fin (cuadro).
 * Con `markers` dibuja los puntos del circuito (salida, meta, avituallamientos). Sin teselas sirve de miniatura.
 */
export function RouteMap({
  route,
  width = 640,
  height = 320,
  tiles = true,
  className = "",
  label = "Mapa del recorrido",
  markers = [],
}: {
  route: string;
  width?: number;
  height?: number;
  tiles?: boolean;
  className?: string;
  label?: string;
  markers?: CourseMarker[];
}) {
  const v = routeView(decodePolyline(route), width, height, tiles ? 24 : 4);
  if (!v) return null;
  const pts = v.path.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [sx, sy] = v.path[0];
  const [ex, ey] = v.path[v.path.length - 1];
  const stroke = tiles ? 4 : Math.max(1.5, width / 40);
  // con salida y meta marcadas en el archivo, no hacen falta los puntos genéricos de inicio y fin
  const hasEnds = markers.some((m) => m.kind === "salida" || m.kind === "meta");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`block h-auto w-full ${tiles ? "rounded-xl" : "rounded-md"} bg-surface-2 ${className}`} role="img" aria-label={label}>
      {tiles &&
        v.tiles.map((t) => <image key={`${t.x}-${t.y}`} href={tileUrl(t.z, t.x, t.y)} x={t.left} y={t.top} width={256} height={256} preserveAspectRatio="none" />)}
      {tiles && <polyline points={pts} fill="none" stroke="white" strokeWidth={stroke + 3} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />}
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
      {tiles && (
        <>
          {!hasEnds && (
            <>
              <circle cx={sx} cy={sy} r={6} fill="var(--good, #22c55e)" stroke="white" strokeWidth={2} />
              <rect x={ex - 5} y={ey - 5} width={10} height={10} fill="var(--ink, #111)" stroke="white" strokeWidth={2} />
            </>
          )}
          {markers.map((m, i) => {
            const [x, y] = v.toCanvas([m.lat, m.lon]);
            const s = MARKER[m.kind];
            return (
              <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
                <title>{m.name || s.label}</title>
                <circle r={11} fill={s.fill} stroke="white" strokeWidth={2.5} />
                {s.icon ? (
                  <path d={ICON_PATHS[s.icon]} transform="translate(-6.5,-6.5) scale(0.54)" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <circle r={2.5} fill="white" />
                )}
              </g>
            );
          })}
          <text x={width - 6} y={height - 6} textAnchor="end" fontSize={10} fill="#333" stroke="white" strokeWidth={3} paintOrder="stroke">
            © OpenStreetMap
          </text>
        </>
      )}
    </svg>
  );
}