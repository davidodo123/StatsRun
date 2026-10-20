import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
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
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
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

export function Stat({ label, value, unit, sub, status, hint }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; status?: { tone: Tone; label: string }; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5" title={hint}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold tracking-tight tabular">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-2">{unit}</span>}
      </p>
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

export function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
      ))}
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
