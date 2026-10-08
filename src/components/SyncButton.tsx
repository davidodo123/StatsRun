"use client";

import { useActionState } from "react";
import { syncStrava, type FormState } from "@/app/actions";

export function SyncButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(() => syncStrava(), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button className="btn" disabled={pending}>
        {pending ? "Sincronizando…" : "↻ Sincronizar ahora"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
