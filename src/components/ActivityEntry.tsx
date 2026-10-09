"use client";

import { useRef, useState } from "react";
import type { ScanResponse } from "@/app/api/scan/route";
import type { PlannedSession } from "@/lib/types";
import { ActivityForm, type ActivityFormInitial } from "./ActivityForm";

/** Reduce la captura a ≤1600 px de lado (JPEG) para subir menos y gastar menos tokens. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo leer la imagen"))), "image/jpeg", 0.85));
}

type ScanState = { phase: "idle" } | { phase: "busy" } | { phase: "done"; fields: number } | { phase: "error"; text: string };

/** Formulario de registro + relleno automático desde capturas de pantalla (Strava, Garmin, reloj…). */
export function ActivityEntry({ initial, session, today, aiEnabled }: { initial: ActivityFormInitial; session?: PlannedSession; today: string; aiEnabled: boolean }) {
  const [init, setInit] = useState(initial);
  const [version, setVersion] = useState(0);
  const [scan, setScan] = useState<ScanState>({ phase: "idle" });
  const input = useRef<HTMLInputElement>(null);

  async function handle(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, 4);
    if (!files.length) return;
    setScan({ phase: "busy" });
    try {
      const fd = new FormData();
      for (const f of files) fd.append("images", await shrink(f), f.name.replace(/\.\w+$/, ".jpg"));
      const res = await fetch("/api/scan", { method: "POST", body: fd });
      const json = (await res.json()) as ScanResponse;
      if (!json.ok) throw new Error(json.error);
      const d = json.data;
      const found = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined && v !== ""));
      // las notas se suman a las que ya hubiera; el resto de campos leídos sustituyen
      setInit((prev) => ({
        ...prev,
        ...found,
        notes: [prev.notes, d.notes].filter(Boolean).join("\n") || undefined,
        name: d.name ?? prev.name,
      }));
      setVersion((v) => v + 1);
      setScan({ phase: "done", fields: Object.keys(found).length });
    } catch (e) {
      setScan({ phase: "error", text: (e as Error).message });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {aiEnabled && (
        <div className="rounded-xl border border-dashed border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn" disabled={scan.phase === "busy"} onClick={() => input.current?.click()}>
              {scan.phase === "busy" ? "Leyendo captura…" : "📷 Rellenar desde captura"}
            </button>
            <p className="min-w-0 flex-1 text-xs text-ink-2">
              Haz captura del resumen del entreno en Strava, Garmin, Nike Run Club, tu reloj o la cinta (puedes subir hasta 4: resumen, parciales, pulso…). La IA lee los datos y rellena el formulario; revísalos antes de guardar.
            </p>
          </div>
          <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
          {scan.phase === "done" && <p className="mt-2 text-sm font-medium text-good-ink">✓ {scan.fields} datos leídos. Revisa y pulsa «Registrar entreno».</p>}
          {scan.phase === "error" && <p className="mt-2 text-sm font-medium text-critical">✕ {scan.text}</p>}
        </div>
      )}
      <ActivityForm key={version} initial={init} session={session} today={today} />
    </div>
  );
}
