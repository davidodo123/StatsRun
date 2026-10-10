"use client";
// Gráficas en SVG propio (antes Recharts, que pesaba ~400 KB en el móvil). Reglas: un solo eje Y por gráfica,
// marcas finas, rejilla tenue, tooltip en todas (al pasar el dedo o el ratón), color por identidad de serie.
import { useEffect, useRef, useState, type ReactNode } from "react";

const S1 = "var(--series-1)";
const S2 = "var(--series-2)";

interface Row {
  color?: string;
  label: string;
  value: string;
}

function TipBox({ title, rows }: { title: ReactNode; rows: Row[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-ink-2">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          <span>{r.label}</span>
          <span className="ml-auto pl-3 font-semibold text-ink tabular">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ items, line }: { items: { label: string; color: string }[]; line?: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={line ? "h-0.5 w-3.5" : "h-2 w-2 rounded-full"} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

const fmtPace = (s?: number) => (s && isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "–");
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
const dec = (v: number, d: number) => v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const kShort = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k` : String(Math.round(v * 100) / 100));

/** Marcas «redondas» del eje (1, 2, 5 × 10ⁿ). */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) [min, max] = [min - 1, max + 1];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const step = (r >= 7.5 ? 10 : r >= 3.5 ? 5 : r >= 1.5 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Series {
  kind: "bar" | "line";
  name: string;
  values: (number | null | undefined)[];
  color: string | ((i: number) => string);
  dots?: boolean;
}

const PAD = { top: 8, right: 8, bottom: 22, left: 40 };

/** Gráfica cartesiana: barras agrupadas y/o líneas sobre las mismas categorías. */
function Chart({
  height,
  labels,
  series,
  xFmt,
  yFmt = kShort,
  tip,
  zeroBased = true,
  invert,
  band,
  zeroLine,
  rounded = true,
  gap = 0.2,
}: {
  height: number;
  labels: string[];
  series: Series[];
  xFmt: (v: string) => string;
  yFmt?: (v: number) => string;
  tip: (i: number) => ReactNode;
  zeroBased?: boolean;
  invert?: boolean;
  band?: [number, number]; // franja sombreada en el eje Y
  zeroLine?: boolean;
  rounded?: boolean;
  gap?: number; // hueco entre categorías (fracción)
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number>();
  const n = labels.length;
  const nums = series.flatMap((s) => s.values.filter((v): v is number => typeof v === "number" && isFinite(v)));
  let lo = nums.length ? Math.min(...nums) : 0;
  let hi = nums.length ? Math.max(...nums) : 1;
  if (zeroBased || series.some((s) => s.kind === "bar")) [lo, hi] = [Math.min(0, lo), Math.max(0, hi)];
  else {
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.1;
    [lo, hi] = [lo - pad, hi + pad];
  }
  const ticks = niceTicks(lo, hi);
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const bw = plotW / Math.max(1, n);
  const cx = (i: number) => PAD.left + bw * (i + 0.5);
  const y = (v: number) => {
    const t = (v - y0) / (y1 - y0 || 1);
    return PAD.top + (invert ? t : 1 - t) * plotH;
  };
  const bars = series.filter((s) => s.kind === "bar");
  const group = bw * (1 - gap);
  const barW = bars.length ? Math.max(1, (group - (bars.length - 1) * 2) / bars.length) : 0;
  const base = y(Math.max(y0, Math.min(0, y1)));
  // etiquetas del eje X sin solaparse: una de cada `step`, y la última siempre
  const step = Math.max(1, Math.ceil(52 / bw));
  const shown = labels.map((_, i) => i % step === 0);
  if (n > 1) shown[n - 1] = true;
  for (let i = n - 2; i >= 0 && n - 1 - i < step; i--) shown[i] = false;

  const pick = (clientX: number, el: SVGSVGElement) => {
    const x = clientX - el.getBoundingClientRect().left - PAD.left;
    const i = Math.floor(x / bw);
    setHover(i >= 0 && i < n ? i : undefined);
  };

  return (
    <div ref={ref} className="relative select-none" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block touch-pan-y"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHover(undefined)}
        >
          {band && (
            <rect
              x={PAD.left}
              width={plotW}
              y={Math.min(y(Math.max(y0, band[0])), y(Math.min(y1, band[1])))}
              height={Math.abs(y(Math.max(y0, band[0])) - y(Math.min(y1, band[1])))}
              fill="var(--surface-2)"
              fillOpacity={0.6}
            />
          )}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
              <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--muted)">
                {yFmt(t)}
              </text>
            </g>
          ))}
          {zeroLine && <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--axis)" />}
          <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--axis)" />
          {hover !== undefined &&
            (bars.length ? (
              <rect x={PAD.left + bw * hover} y={PAD.top} width={bw} height={plotH} fill="var(--surface-2)" />
            ) : (
              <line x1={cx(hover)} x2={cx(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--axis)" />
            ))}
          {bars.map((s, k) =>
            s.values.map((v, i) => {
              if (typeof v !== "number" || !v) return null;
              const x = PAD.left + bw * i + (bw - group) / 2 + k * (barW + 2);
              const top = Math.min(base, y(v));
              const h = Math.max(1, Math.abs(y(v) - base));
              const r = rounded && v > 0 ? Math.min(4, barW / 2, h) : 0;
              const fill = typeof s.color === "function" ? s.color(i) : s.color;
              return r ? (
                <path key={`${k}-${i}`} d={`M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${top + h}Z`} fill={fill} />
              ) : (
                <rect key={`${k}-${i}`} x={x} y={top} width={barW} height={h} fill={fill} />
              );
            }),
          )}
          {series
            .filter((s) => s.kind === "line")
            .map((s) => {
              const color = typeof s.color === "string" ? s.color : s.color(0);
              const pts = s.values.flatMap((v, i) => (typeof v === "number" && isFinite(v) ? [[cx(i), y(v)] as const] : []));
              return (
                <g key={s.name}>
                  <polyline points={pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {s.dots && pts.map(([a, b], i) => <circle key={i} cx={a} cy={b} r={3} fill={color} />)}
                  {hover !== undefined && typeof s.values[hover] === "number" && <circle cx={cx(hover)} cy={y(s.values[hover]!)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={1.5} />}
                </g>
              );
            })}
          {labels.map((l, i) =>
            shown[i] ? (
              <text key={i} x={cx(i)} y={height - 6} textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)" dx={i === 0 && n > 1 ? -bw / 2 + 2 : i === n - 1 && n > 1 ? bw / 2 - 2 : 0}>
                {xFmt(l)}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {hover !== undefined && width > 0 && (
        <div className="pointer-events-none absolute top-1 z-10 w-max max-w-[14rem]" style={{ left: Math.max(0, Math.min(width - 180, cx(hover) + (cx(hover) > width / 2 ? -190 : 12))) }}>
          {tip(hover)}
        </div>
      )}
    </div>
  );
}

// ---------- Volumen semanal ----------
export function WeeklyKmChart({ data, height = 220 }: { data: { week: string; km: number; planned?: number }[]; height?: number }) {
  const hasPlan = data.some((d) => d.planned);
  const series: Series[] = [
    ...(hasPlan ? [{ kind: "bar" as const, name: "Planificado", values: data.map((d) => d.planned), color: "var(--axis)" }] : []),
    { kind: "bar", name: "Real", values: data.map((d) => d.km), color: S1 },
  ];
  return (
    <>
      <Chart
        height={hasPlan ? height - 22 : height}
        labels={data.map((d) => d.week)}
        series={series}
        xFmt={dayLabel}
        tip={(i) => <TipBox title={`Semana del ${dayLabel(data[i].week)}`} rows={series.map((s) => ({ color: String(s.color), label: s.name, value: `${(s.values[i] ?? 0).toFixed(1)} km` }))} />}
      />
      {hasPlan && <Legend items={series.map((s) => ({ label: s.name, color: String(s.color) }))} />}
    </>
  );
}

// ---------- Forma / fatiga ----------
export function FitnessChart({ data, height = 240 }: { data: { date: string; ctl: number; atl: number }[]; height?: number }) {
  const series: Series[] = [
    { kind: "line", name: "Forma (CTL 42 d)", values: data.map((d) => d.ctl), color: S1 },
    { kind: "line", name: "Fatiga (ATL 7 d)", values: data.map((d) => d.atl), color: S2 },
  ];
  return (
    <>
      <Chart
        height={height - 22}
        labels={data.map((d) => d.date)}
        series={series}
        xFmt={dayLabel}
        tip={(i) => <TipBox title={dayLabel(data[i].date)} rows={series.map((s) => ({ color: String(s.color), label: s.name, value: (s.values[i] ?? 0).toFixed(0) }))} />}
      />
      <Legend line items={series.map((s) => ({ label: s.name, color: String(s.color) }))} />
    </>
  );
}

export function FormChart({ data, height = 160 }: { data: { date: string; tsb: number }[]; height?: number }) {
  return (
    <Chart
      height={height}
      labels={data.map((d) => d.date)}
      series={[{ kind: "bar", name: "Frescura", values: data.map((d) => d.tsb), color: (i) => (data[i].tsb >= 0 ? S1 : "var(--div-neg)") }]}
      xFmt={dayLabel}
      band={[-30, -10]}
      zeroLine
      rounded={false}
      gap={0.1}
      tip={(i) => <TipBox title={dayLabel(data[i].date)} rows={[{ label: "Frescura (TSB)", value: data[i].tsb.toFixed(0) }]} />}
    />
  );
}

// ---------- Tendencia de una métrica semanal ----------
export function TrendLine({
  data,
  dataKey,
  name,
  color = "s1",
  format,
  invert,
  height = 200,
  xKey = "week",
  xFormat = "day",
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  name: string;
  color?: "s1" | "s2" | "s3";
  format?: "pace" | "int" | "dec2" | "dec1";
  invert?: boolean;
  height?: number;
  xKey?: string;
  xFormat?: "day" | "month";
}) {
  const f = (v: number) => (format === "pace" ? fmtPace(v) : format === "dec2" ? dec(v, 2) : format === "dec1" ? dec(v, 1) : Math.round(v).toString());
  const stroke = { s1: S1, s2: S2, s3: "var(--series-3)" }[color];
  const xf = xFormat === "month" ? monthLabel : dayLabel;
  const values = data.map((d) => (typeof d[dataKey] === "number" ? (d[dataKey] as number) : null));
  return (
    <Chart
      height={height}
      labels={data.map((d) => String(d[xKey]))}
      series={[{ kind: "line", name, values, color: stroke, dots: true }]}
      xFmt={xf}
      yFmt={f}
      zeroBased={false}
      invert={invert}
      tip={(i) => (values[i] == null ? null : <TipBox title={xf(String(data[i][xKey]))} rows={[{ color: stroke, label: name, value: f(values[i]!) + (format === "pace" ? " /km" : "") }]} />)}
    />
  );
}

// ---------- Barras simples (una serie) ----------
export function SimpleBars({
  data,
  xKey,
  yKey,
  name,
  unit,
  height = 200,
  xFormat,
  horizontal,
  ordinal,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  name: string;
  unit: string;
  height?: number;
  xFormat?: "month" | "day" | "none";
  horizontal?: boolean;
  ordinal?: boolean; // zonas: rampa ordinal azul
}) {
  const xf = xFormat === "month" ? monthLabel : xFormat === "day" ? dayLabel : (v: string) => v;
  const ramp = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];
  const color = (i: number) => (ordinal ? ramp[Math.min(i, ramp.length - 1)] : S1);
  const values = data.map((d) => Number(d[yKey]) || 0);
  const fmt = (v: number) => `${v.toFixed(unit === "km" ? 1 : 0)} ${unit}`.trim();
  if (horizontal) {
    const max = Math.max(...values, 0) || 1;
    return (
      <ul className="flex flex-col justify-center gap-2" style={{ minHeight: height }}>
        {data.map((d, i) => (
          <li key={i} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-xs" title={`${xf(String(d[xKey]))}: ${fmt(values[i])}`}>
            <span className="truncate text-right text-muted">{xf(String(d[xKey]))}</span>
            <span className="h-4 overflow-hidden rounded-r bg-surface-2">
              <span className="block h-full rounded-r" style={{ width: `${(values[i] / max) * 100}%`, background: color(i) }} />
            </span>
            <span className="tabular w-14 text-ink-2">{fmt(values[i])}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Chart
      height={height}
      labels={data.map((d) => String(d[xKey]))}
      series={[{ kind: "bar", name, values, color }]}
      xFmt={xf}
      tip={(i) => <TipBox title={xf(String(data[i][xKey]))} rows={[{ label: name, value: fmt(values[i]) }]} />}
    />
  );
}
