"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { RaceUploadResponse } from "@/app/api/carrera/route";

/** Botón para subir el recorrido (.kmz/.kml/.gpx) o un PDF de la carrera. */
export function RaceFileUpload({ kind, label }: { kind: "recorrido" | "documento"; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RaceUploadResponse>();
  const [, startTransition] = useTransition();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setResult(undefined);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/carrera", { method: "POST", body: fd });
      // un archivo demasiado grande lo corta Vercel antes de llegar a la app: no hay JSON
      const json: RaceUploadResponse = res.headers.get("content-type")?.includes("json")
        ? await res.json()
        : { ok: false, error: res.status === 413 ? "El archivo es demasiado grande (máx. 4 MB)." : `Error ${res.status} al subir.` };
      setResult(json);
      if (json.ok) startTransition(() => router.refresh());
    } catch {
      setResult({ ok: false, error: "No se pudo subir: revisa la conexión." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <button type="button" className="btn btn-ghost w-full text-sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Subiendo…" : label}
      </button>
      <input
        ref={input}
        type="file"
        className="hidden"
        accept={kind === "recorrido" ? ".kmz,.kml,.gpx,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml" : ".pdf,application/pdf"}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {result?.error && <p className="text-xs font-medium text-critical">✕ {result.error}</p>}
      {result?.message && <p className="text-xs font-medium text-good-ink">✓ {result.message}</p>}
    </div>
  );
}
