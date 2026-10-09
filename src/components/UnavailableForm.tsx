"use client";

import { useActionState } from "react";
import { markUnavailable, type FormState } from "@/app/actions";

export function UnavailableForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(markUnavailable, {});
  return (
    <form action={action} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          Desde
          <input className="input" type="date" name="from" min={today} defaultValue={today} required />
        </label>
        <label className="field">
          Hasta (opcional)
          <input className="input" type="date" name="to" min={today} />
        </label>
      </div>
      <button className="btn" disabled={pending}>
        {pending ? "Reorganizando…" : "No puedo entrenar esos días"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
