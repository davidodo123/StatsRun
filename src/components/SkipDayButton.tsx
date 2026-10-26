"use client";

import { skipSession } from "@/app/actions";

/** «No puedo ese día»: pide confirmación antes de mover o quitar las sesiones (se pulsa sin querer con facilidad). */
export function SkipDayButton({ date, confirmText, label, title, className = "" }: { date: string; confirmText: string; label: string; title?: string; className?: string }) {
  return (
    <form
      action={skipSession}
      className={className}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="date" value={date} />
      <button className="text-xs text-ink-2 underline hover:text-critical" title={title}>
        {label}
      </button>
    </form>
  );
}
