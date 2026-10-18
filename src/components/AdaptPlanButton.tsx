"use client";

import { useActionState } from "react";
import { regeneratePlan, type FormState } from "@/app/actions";

export function AdaptPlanButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(() => regeneratePlan(), {});
  return (
    <form action={action} className="contents">
      <button className="btn" disabled={pending} title="Recalcula con tus últimos datos de Strava y tu perfil">
        {pending ? "Adaptando…" : "↻ Adaptar con mis datos"}
      </button>
      {(state.error || state.message) && (
        <p role="status" className={`order-last basis-full text-sm font-medium ${state.error ? "text-critical" : "text-good-ink"}`}>
          {state.error ? `✕ ${state.error}` : `✓ ${state.message}`}
        </p>
      )}
    </form>
  );
}
