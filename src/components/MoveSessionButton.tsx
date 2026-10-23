"use client";

import { useActionState, useRef, useState } from "react";
import { moveSessionDay, type FormState } from "@/app/actions";
import { WEEKDAYS, addDays, shortDate, weekday } from "@/lib/dates";

/** «Cambiar de día»: hoy no puedo la tirada, pero mañana sí. Elige un día de la próxima semana (si hay otra sesión, se cambian). */
export function MoveSessionButton({ sessionId, date, today, days: maxDays, className = "" }: { sessionId: string; date: string; today: string; days: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(moveSessionDay, {});
  // el día elegido va en un campo oculto: el valor del botón pulsado no siempre llega con el formulario
  const form = useRef<HTMLFormElement>(null);
  const to = useRef<HTMLInputElement>(null);
  const choose = (d: string) => {
    if (!form.current || !to.current) return;
    to.current.value = d;
    form.current.requestSubmit();
  };
  const days = Array.from({ length: maxDays + 1 }, (_, i) => addDays(today, i)).filter((d) => d !== date);
  const label = (d: string) => (d === today ? "Hoy" : d === addDays(today, 1) ? "Mañana" : `${WEEKDAYS[weekday(d)].slice(0, 3)} ${shortDate(d)}`);

  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs text-ink-2 underline hover:text-ink">
        {open ? "Cerrar" : "Cambiar de día"}
      </button>
      {open && (
        <form ref={form} action={action} className="mt-2 space-y-2">
          <input type="hidden" name="session" value={sessionId} />
          <input ref={to} type="hidden" name="to" />
          <p className="text-xs text-muted">¿Qué día la haces? Si ese día hay otra sesión, se cambian.</p>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <button key={d} type="button" onClick={() => choose(d)} disabled={pending} data-day={d} className="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent disabled:opacity-50">
                {label(d)}
              </button>
            ))}
          </div>
        </form>
      )}
      {state.error && <p className="mt-1 text-xs font-medium text-critical">{state.error}</p>}
      {state.message && <p className="mt-1 text-xs font-medium text-good-ink">{state.message}</p>}
    </div>
  );
}
