"use client";

import { useActionState, useState } from "react";
import { rateAi } from "@/app/ai-actions";
import type { FormState } from "@/app/actions";
import type { AiArea } from "@/lib/types";
import { Icon } from "./icons";
import { keepForm } from "./keepForm";

/** «¿Te ha servido?» con pulgar arriba o abajo; abajo pide el motivo, que la IA recordará. */
export function AiRating({ area, refId, rating }: { area: AiArea; refId?: string; rating?: 1 | -1 }) {
  const [state, action, pending] = useActionState<FormState, FormData>(rateAi, {});
  const [down, setDown] = useState(false);
  if (!refId) return null;
  const send = (r: 1 | -1, reason = "") => {
    const fd = new FormData();
    fd.set("area", area);
    fd.set("ref", refId);
    fd.set("rating", String(r));
    if (reason) fd.set("reason", reason);
    return fd;
  };
  const btn = (on: boolean) => `grid h-8 w-8 place-items-center rounded-full border ${on ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:text-ink"}`;
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted">¿Te ha servido?</span>
        <form onSubmit={keepForm(() => action(send(1)))}>
          <button className={btn(rating === 1)} disabled={pending} aria-label="Me ha servido" aria-pressed={rating === 1}>
            <Icon name="thumbUp" className="h-4 w-4" />
          </button>
        </form>
        <button type="button" className={btn(rating === -1 || down)} disabled={pending} onClick={() => setDown((d) => !d)} aria-label="No me ha servido" aria-pressed={rating === -1}>
          <Icon name="thumbDown" className="h-4 w-4" />
        </button>
        {state.message && !down && <span className="text-good-ink">{state.message}</span>}
      </div>
      {down && (
        <form
          onSubmit={keepForm((fd) => {
            action(send(-1, String(fd.get("reason") ?? "")));
            setDown(false);
          })}
          className="flex gap-2"
        >
          <input className="input flex-1 py-1.5 text-sm" name="reason" maxLength={200} placeholder="¿Qué no te ha gustado? Lo recordará" autoFocus aria-label="Qué no te ha gustado" />
          <button className="btn px-3 py-1.5 text-sm" disabled={pending}>
            Enviar
          </button>
        </form>
      )}
      {state.error && <p className="text-critical">{state.error}</p>}
    </div>
  );
}
