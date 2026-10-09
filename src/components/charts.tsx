"use client";
// Gráficas (Recharts). Reglas: un solo eje Y por gráfica, marcas finas, rejilla tenue,
// tooltip en todas, color por identidad de serie (slots fijos).
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

const S1 = "var(--series-1)";
const S2 = "var(--series-2)";
const GRID = "var(--grid)";
const AXIS = "var(--muted)";

const axisProps = {
  stroke: AXIS,
  tick: { fill: "var(--muted)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--axis)" },
} as const;

function TipBox({ title, rows }: { title: ReactNode; rows: { color?: string; label: string; value: string }[] }) {
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

const fmtPace = (s?: number) => (s && isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "–");
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

// ---------- Volumen semanal ----------
export function WeeklyKmChart({ data, height = 220 }: { data: { week: string; km: number; planned?: number }[]; height?: number }) {
  const hasPlan = data.some((d) => d.planned);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tickFormatter={dayLabel} {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} unit="" width={44} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox
                title={`Semana del ${dayLabel(String(label))}`}
                rows={payload.map((p) => ({ color: String(p.color), label: String(p.name), value: `${Number(p.value).toFixed(1)} km` }))}
              />
            ) : null
          }
        />
        {hasPlan && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />}
        {hasPlan && <Bar isAnimationActive={false} dataKey="planned" name="Planificado" fill="var(--axis)" radius={[4, 4, 0, 0]} />}
        <Bar isAnimationActive={false} dataKey="km" name="Real" fill={S1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- Forma / fatiga ----------
export function FitnessChart({ data, height = 240 }: { data: { date: string; ctl: number; atl: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={44} />
        <Tooltip
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox title={dayLabel(String(label))} rows={payload.map((p) => ({ color: String(p.color), label: String(p.name), value: Number(p.value).toFixed(0) }))} />
            ) : null
          }
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Line isAnimationActive={false} dataKey="ctl" name="Forma (CTL 42 d)" stroke={S1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line isAnimationActive={false} dataKey="atl" name="Fatiga (ATL 7 d)" stroke={S2} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FormChart({ data, height = 160 }: { data: { date: string; tsb: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <ReferenceArea y1={-30} y2={-10} fill="var(--surface-2)" fillOpacity={0.6} />
        <XAxis dataKey="date" tickFormatter={dayLabel} {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={44} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? <TipBox title={dayLabel(String(label))} rows={[{ label: "Frescura (TSB)", value: Number(payload[0].value).toFixed(0) }]} /> : null
          }
        />
        <Bar isAnimationActive={false} dataKey="tsb" name="Frescura">
          {data.map((d) => (
            <Cell key={d.date} fill={d.tsb >= 0 ? S1 : "var(--div-neg)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
  const f = (v: number) => (format === "pace" ? fmtPace(v) : format === "dec2" ? v.toFixed(2) : format === "dec1" ? v.toFixed(1) : Math.round(v).toString());
  const stroke = { s1: S1, s2: S2, s3: "var(--series-3)" }[color];
  const xf = xFormat === "month" ? monthLabel : dayLabel;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xf} {...axisProps} minTickGap={30} />
        <YAxis {...axisProps} width={44} reversed={invert} domain={["auto", "auto"]} tickFormatter={(v) => f(Number(v))} />
        <Tooltip
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload, label }) =>
            active && payload?.length && payload[0].value != null ? (
              <TipBox title={xf(String(label))} rows={[{ color: stroke, label: name, value: f(Number(payload[0].value)) + (format === "pace" ? " /km" : "") }]} />
            ) : null
          }
        />
        <Line isAnimationActive={false} dataKey={dataKey} name={name} stroke={stroke} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: stroke }} activeDot={{ r: 5 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
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
  const tip = (
    <Tooltip
      cursor={{ fill: "var(--surface-2)" }}
      content={({ active, payload, label }) =>
        active && payload?.length ? <TipBox title={xf(String(label))} rows={[{ label: name, value: `${Number(payload[0].value).toFixed(unit === "km" ? 1 : 0)} ${unit}` }]} /> : null
      }
    />
  );
  if (horizontal)
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" {...axisProps} />
          <YAxis type="category" dataKey={xKey} {...axisProps} width={96} tickFormatter={xf} />
          {tip}
          <Bar isAnimationActive={false} dataKey={yKey} name={name} radius={[0, 4, 4, 0]} fill={S1}>
            {ordinal && data.map((_, i) => <Cell key={i} fill={ramp[Math.min(i, ramp.length - 1)]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xf} {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        {/* miles abreviados (pasos): "10,5k" cabe en el eje estrecho */}
        <YAxis {...axisProps} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k` : String(v))} />
        {tip}
        <Bar isAnimationActive={false} dataKey={yKey} name={name} radius={[4, 4, 0, 0]} fill={S1}>
          {ordinal && data.map((_, i) => <Cell key={i} fill={ramp[Math.min(i, ramp.length - 1)]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
