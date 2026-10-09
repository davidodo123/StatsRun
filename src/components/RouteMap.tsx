import { decodePolyline, routeView } from "../lib/route";

// Teselas de CARTO (datos de OpenStreetMap): uso libre con atribución.
const tileUrl = (z: number, x: number, y: number) => `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

/** Mapa del recorrido: teselas de fondo + línea del recorrido, inicio (verde) y fin (cuadro). Sin teselas sirve de miniatura. */
export function RouteMap({
  route,
  width = 640,
  height = 320,
  tiles = true,
  className = "",
  label = "Mapa del recorrido",
}: {
  route: string;
  width?: number;
  height?: number;
  tiles?: boolean;
  className?: string;
  label?: string;
}) {
  const v = routeView(decodePolyline(route), width, height, tiles ? 24 : 4);
  if (!v) return null;
  const pts = v.path.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [sx, sy] = v.path[0];
  const [ex, ey] = v.path[v.path.length - 1];
  const stroke = tiles ? 4 : Math.max(1.5, width / 40);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`block h-auto w-full ${tiles ? "rounded-xl" : "rounded-md"} bg-surface-2 ${className}`} role="img" aria-label={label}>
      {tiles &&
        v.tiles.map((t) => <image key={`${t.x}-${t.y}`} href={tileUrl(t.z, t.x, t.y)} x={t.left} y={t.top} width={256} height={256} preserveAspectRatio="none" />)}
      {tiles && <polyline points={pts} fill="none" stroke="white" strokeWidth={stroke + 3} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />}
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
      {tiles && (
        <>
          <circle cx={sx} cy={sy} r={6} fill="var(--good, #22c55e)" stroke="white" strokeWidth={2} />
          <rect x={ex - 5} y={ey - 5} width={10} height={10} fill="var(--ink, #111)" stroke="white" strokeWidth={2} />
          <text x={width - 6} y={height - 6} textAnchor="end" fontSize={10} fill="#333" stroke="white" strokeWidth={3} paintOrder="stroke">
            © OpenStreetMap · © CARTO
          </text>
        </>
      )}
    </svg>
  );
}
