"use client";

import { useRef } from "react";
import { setRoutinePlanSlot } from "@/app/strength-actions";

const LABEL: Record<string, string> = {
  pierna: "Día de pierna",
  posterior: "Día de posterior (isquios y glúteo)",
  superior: "Día de tren superior",
  completo: "Día de cuerpo entero",
  pecho: "Día de pecho",
  espalda: "Día de espalda",
  hombro: "Día de hombro",
};

/** En qué día del plan va esta rutina: lo decide el plan, uno concreto o ninguno. Se guarda al elegir. */
export function RoutinePlanSlot({ id, slot, kinds, uses }: { id: string; slot?: string; kinds: string[]; uses: number }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setRoutinePlanSlot} className="mt-4 rounded-xl border border-line bg-surface p-3">
      <input type="hidden" name="id" value={id} />
      <label className="field">
        En tu plan
        <select className="input" name="slot" defaultValue={slot ?? ""} onChange={() => form.current?.requestSubmit()}>
          <option value="">Que la coloque el plan</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {LABEL[k] ?? k}
            </option>
          ))}
          <option value="no">No usarla en el plan</option>
        </select>
      </label>
      <p className="mt-2 text-xs text-muted">
        {slot === "no" ? "El plan no la usa." : uses ? `La tienes en ${uses} ${uses === 1 ? "sesión" : "sesiones"} de las próximas semanas.` : "Ahora no está en ninguna sesión del plan."}
      </p>
    </form>
  );
}
