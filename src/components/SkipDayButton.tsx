"use client";

import { skipSession } from "@/app/actions";

/** «No puedo ese día»: pide confirmación antes de mover o quitar las sesiones (se pulsa sin querer con facilidad). */
export function SkipDayButton({ date, dayLabel, label, title, className = "" }: { date: string; dayLabel: string; label: string; title?: string; className?: string }) {
  return (
    <form
      action={skipSession}
      className={className}
      onSubmit={(e) => {
        if (!confirm(`¿Marcar el ${dayLabel} como día sin poder entrenar?\n\nLas sesiones de ese día se moverán a otro día libre de la semana o se quitarán. Lo puedes deshacer después.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="date" value={date} />
      <button className="text-xs text-ink-2 underline hover:text-critical" title={title}>
        {label}
      </button>
    </form>
  );
}
