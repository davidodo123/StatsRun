import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

/** «Hecho» en una sesión: chip con borde y texto lima y un check (el verde quedaba apagado junto al lima de la app). */
export function DoneChip({ children }: { children: ReactNode }) {
  return (
    <span className="done-chip">
      <Icon name="check" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** Enlace secundario en chip con flecha («Ver plan ›»). Sin href es solo el aspecto, para ir dentro de otro enlace. */
export function ChipLink({ href, children, className = "" }: { href?: string; children: ReactNode; className?: string }) {
  const inner = (
    <>
      {children}
      <Icon name="chevron" className="h-3.5 w-3.5" />
    </>
  );
  return href ? (
    <Link href={href} className={`chip-link ${className}`}>
      {inner}
    </Link>
  ) : (
    <span className={`chip-link ${className}`}>{inner}</span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl leading-none tracking-[0.03em] uppercase md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ title, subtitle, children, className = "", action }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 md:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-xs font-bold tracking-widest text-ink-2 uppercase">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export type Tone = "good" | "warn" | "bad" | "neutral";

const TONE_DOT: Record<Tone, string> = {
  good: "bg-good",
  warn: "bg-warning",
  bad: "bg-critical",
  neutral: "bg-muted",
};
const TONE_ICON: Record<Tone, string> = { good: "✓", warn: "!", bad: "✕", neutral: "–" };

/** Estado: siempre icono + texto, nunca solo color. */
export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
      <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold text-black ${TONE_DOT[tone]}`} aria-hidden>
        {TONE_ICON[tone]}
      </span>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  unit,
  sub,
  status,
  hint,
  accent,
  progress,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  status?: { tone: Tone; label: string };
  hint?: string;
  accent?: boolean; // el dato principal de la pantalla, en naranja
  progress?: number; // 0-1: barra bajo la cifra (p. ej. km hechos de los de la semana)
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5" title={hint}>
      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className={`mt-1 font-display text-3xl leading-none tabular ${accent ? "text-accent" : ""}`}>
        {value}
        {unit && <span className="ml-1 font-sans text-sm font-medium text-ink-2">{unit}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
      )}
      {sub && <p className="mt-0.5 text-xs text-ink-2">{sub}</p>}
      {status && (
        <div className="mt-1">
          <Status tone={status.tone}>{status.label}</Status>
        </div>
      )}
    </div>
  );
}

/** Tarjeta que se pliega: el título siempre a la vista, el contenido al tocarlo. */
export function FoldCard({ title, subtitle, children, open, className = "" }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; open?: boolean; className?: string }) {
  return (
    <details open={open} className={`group/fold rounded-2xl border border-line bg-surface ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 md:px-5">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>}
        </span>
        <span className="text-muted transition group-open/fold:rotate-90" aria-hidden>
          ›
        </span>
      </summary>
      <div className="px-4 pb-4 md:px-5 md:pb-5">{children}</div>
    </details>
  );
}

/** Menú «⋯» para las acciones secundarias de una cabecera (sin JS: un desplegable). */
export function MoreMenu({ children, label = "Más opciones" }: { children: ReactNode; label?: string }) {
  return (
    <details className="relative">
      <summary className="btn btn-ghost list-none px-3" aria-label={label} title={label}>
        ⋯
      </summary>
      <div className="absolute right-0 z-30 mt-2 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-xl [&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:text-sm [&_button:hover]:bg-surface-2">
        {children}
      </div>
    </details>
  );
}

/** Varios datos en un solo bloque dividido por líneas (menos alto que una caja por dato). Con un número impar
 *  en el móvil, el último ocupa toda la fila. */
export function StatGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line [&>*]:rounded-none [&>*]:border-0 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function Empty({ title, children, href, cta }: { title: string; children?: ReactNode; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-2">{children}</div>}
      {href && cta && (
        <Link href={href} className="btn mt-4">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

/** Mientras carga: ocupa al menos toda la pantalla, como una página de verdad, para que al llegar el contenido
 *  la página no encoja ni salte (si se deslizaba mientras cargaba, se iba arriba). */
export function Loading() {
  return (
    <div className="min-h-[calc(100dvh-6rem)] space-y-4" aria-busy aria-label="Cargando">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      <div className="h-48 animate-pulse rounded-2xl bg-surface" />
      <div className="h-48 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const border = { good: "border-good", warn: "border-warning", bad: "border-critical", neutral: "border-line" }[tone];
  return (
    <div className={`flex gap-2 rounded-xl border-l-4 ${border} bg-surface p-3 text-sm text-ink-2`}>
      <Status tone={tone}>{""}</Status>
      <div>{children}</div>
    </div>
  );
}
