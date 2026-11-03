"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addInstantSession } from "@/app/progress-actions";
import type { FormState } from "@/app/actions";
import type { InstantMode } from "@/lib/engine/planner";
import { fmtKm } from "@/lib/format";
import { translator, type Key, type Locale } from "@/lib/i18n";
import { Icon } from "./icons";

export interface InstantCard {
  title: string;
  description: string;
  steps: string[];
  km: number;
  min: number;
  level: "facil" | "moderada" | "dificil";
}

const MODES: { mode: InstantMode; icon: "droplet" | "timer" | "mountain" | "bolt" }[] = [
  { mode: "facil", icon: "droplet" },
  { mode: "constante", icon: "timer" },
  { mode: "dificil", icon: "mountain" },
  { mode: "variedad", icon: "bolt" },
];

/** Entrenos al momento: eliges cómo te apetece y salen 3-4 sesiones para hoy; una se puede poner en el plan. */
export function InstantWorkoutsPicker({ cards, canAdd, locale }: { cards: Record<InstantMode, InstantCard[]>; canAdd: boolean; locale: Locale }) {
  const t = translator(locale);
  const [mode, setMode] = useState<InstantMode>("constante");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            role="tab"
            aria-selected={m.mode === mode}
            onClick={() => setMode(m.mode)}
            className="flex flex-col items-center gap-1.5 text-xs font-semibold"
          >
            <span className={`grid h-14 w-14 place-items-center rounded-full ${m.mode === mode ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2"}`}>
              <Icon name={m.icon} className="h-6 w-6" />
            </span>
            <span className={m.mode === mode ? "text-ink" : "text-ink-2"}>{t(`im.m.${m.mode}` as Key)}</span>
          </button>
        ))}
      </div>
      <p className="rounded-xl bg-surface px-3 py-2 text-sm text-ink-2">{t(`im.d.${mode}` as Key)}</p>
      <ul className="space-y-3">
        {cards[mode].map((c, i) => (
          <WorkoutCard key={`${mode}-${i}`} c={c} mode={mode} i={i} canAdd={canAdd} locale={locale} />
        ))}
      </ul>
    </div>
  );
}

function WorkoutCard({ c, mode, i, canAdd, locale }: { c: InstantCard; mode: InstantMode; i: number; canAdd: boolean; locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(addInstantSession, {});
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-6 text-xs text-muted">
        <span>
          {t("im.tiempo")}
          <strong className="block font-display text-xl text-ink tabular">{c.min}′</strong>
        </span>
        <span>
          {t("im.distancia")}
          <strong className="block font-display text-xl text-ink tabular">{fmtKm(c.km, 1, locale)} km</strong>
        </span>
        <span>
          {t("im.dificultad")}
          <strong className={`block font-display text-xl ${c.level === "dificil" ? "text-accent" : "text-ink"}`}>{t(`im.l.${c.level}` as Key)}</strong>
        </span>
      </div>
      <h3 className="mt-3 text-lg font-bold text-ink">{c.title}</h3>
      <p className="mt-1 text-sm text-ink-2">{c.description}</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
        {c.steps.map((s, k) => (
          <li key={k}>{s}</li>
        ))}
      </ul>
      {state.ok ? (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-good-ink">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="checkCircle" className="h-4 w-4" />
            {t("im.puesto")}
          </span>
          <Link href="/" className="text-accent underline">
            {t("im.verHoy")}
          </Link>
        </p>
      ) : canAdd ? (
        <form action={action} className="mt-3">
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="i" value={i} />
          <button className="btn w-full" disabled={pending}>
            {t("im.ponerHoy")}
          </button>
          {state.error && <p className="mt-1 text-sm text-critical">✕ {state.error}</p>}
        </form>
      ) : null}
    </li>
  );
}
