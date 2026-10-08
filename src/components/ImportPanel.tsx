"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportResponse } from "@/app/api/import/route";

type State = { phase: "idle" } | { phase: "busy"; text: string } | { phase: "done"; res: ImportResponse } | { phase: "error"; text: string };

const ACCEPT = ".zip,.csv,.fit,.gpx,.tcx,.gz";

/** Extrae activities.csv del zip de Strava en el navegador (el zip puede pesar cientos de MB). */
async function csvFromZip(file: File): Promise<string> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const data = new Uint8Array(await file.arrayBuffer());
  // versión síncrona: la asíncrona usa Web Workers que no cargan dentro del bundle
  const files = unzipSync(data, { filter: (f) => /(^|\/)activities\.csv$/i.test(f.name) });
  const key = Object.keys(files)[0];
  if (!key) throw new Error("El zip no contiene activities.csv. ¿Es la exportación de Strava?");
  return strFromU8(files[key]);
}

export function ImportPanel() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handle(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list];
    try {
      const fd = new FormData();
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) {
          setState({ phase: "busy", text: `Leyendo ${f.name}…` });
          fd.append("csv", await csvFromZip(f));
        } else if (/\.csv$/i.test(f.name)) fd.append("csv", await f.text());
        else fd.append("files", f);
      }
      setState({ phase: "busy", text: `Importando ${files.length} archivo${files.length > 1 ? "s" : ""}…` });
      const res = await fetch("/api/import", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setState({ phase: "done", res: await res.json() });
      router.refresh();
    } catch (e) {
      setState({ phase: "error", text: (e as Error).message });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        disabled={state.phase === "busy"}
        className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
          drag ? "border-accent bg-surface-2" : "border-line hover:bg-surface-2"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
        </svg>
        <span className="font-semibold">{state.phase === "busy" ? state.text : "Arrastra aquí tus archivos o haz clic"}</span>
        <span className="text-xs text-ink-2">
          Exportación de Strava (<strong>.zip</strong> o <strong>activities.csv</strong>) · actividades sueltas <strong>.fit .gpx .tcx</strong> (también .gz)
        </span>
      </button>
      <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => handle(e.target.files)} />

      {state.phase === "done" && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-good-ink">
            ✓ {state.res.added} {state.res.added === 1 ? "actividad nueva" : "actividades nuevas"}{state.res.skipped ? ` · ${state.res.skipped} ya existían` : ""}
          </p>
          {state.res.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-ink-2">
              {state.res.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.phase === "error" && <p className="mt-3 text-sm font-medium text-critical">✕ {state.text}</p>}
    </div>
  );
}
