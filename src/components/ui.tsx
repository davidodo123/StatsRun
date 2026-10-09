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
    <div className="rounded-2xl border border-line bg-surface p-4" title={hint}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-2">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-2">{sub}</p>}
      {status && (
        <div className="mt-2">
          <Status tone={status.tone}>{status.label}</Status>
        </div>
      )}
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
