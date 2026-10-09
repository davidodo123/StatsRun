"use client";

import { useActionState } from "react";
import { adaptPlanWithAI, type FormState } from "@/app/actions";

export function AiCoachButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(() => adaptPlanWithAI(), {});
  return (
    <form action={action} className="space-y-2">
      <button className="btn" disabled={pending}>
        {pending ? "La IA está revisando…" : "✦ Ajustar con IA ahora"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
