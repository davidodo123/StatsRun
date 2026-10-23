"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { readLiveWorkout, type LiveWorkoutInfo } from "@/lib/strength/liveWorkout";

const clock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

/** Con un entreno empezado, una pestaña encima de la barra de abajo para volver a él desde cualquier sección. */
export function LiveWorkoutBar() {
  const path = usePathname();
  const [w, setW] = useState<LiveWorkoutInfo>();
  const [now, setNow] = useState(() => Date.now());

  // se mira al cambiar de página (al terminar o descartar el entreno se cambia de página) y si otra pestaña lo cambia
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
    setW(readLiveWorkout());
    const onStorage = () => setW(readLiveWorkout());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [path]);
  useEffect(() => {
    if (!w || w.pausedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [w]);

  if (!w || path.startsWith("/fuerza/entreno")) return null;
  const elapsed = Math.max(0, Math.floor(((w.pausedAt ?? now) - w.startedAt - (w.pausedMs ?? 0)) / 1000));
  const sets = w.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done && s.type !== "calentamiento").length, 0);

  return (
    <div className="live-workout-bar hide-on-kb fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2 md:bottom-4 md:left-56 md:px-8">
      <Link
        href={w.routineId ? `/fuerza/entreno?rutina=${w.routineId}` : "/fuerza/entreno"}
        className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-accent/40 bg-surface px-3 py-2.5 shadow-lg"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name="dumbbell" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{w.pausedAt ? "Entreno en pausa" : "Entreno en curso"}</span>
          <span className="block truncate font-semibold">{w.name}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="tabular block font-semibold text-accent">{clock(elapsed)}</span>
          <span className="block text-xs text-muted">{sets} {sets === 1 ? "serie" : "series"}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-accent">Seguir →</span>
      </Link>
    </div>
  );
}
