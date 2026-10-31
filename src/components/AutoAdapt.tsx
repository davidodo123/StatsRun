"use client";

import { useEffect } from "react";
import { checkMissedSessions } from "@/app/actions";

/**
 * Al abrir de verdad el plan (no al prepararlo por adelantado), mira si se han quedado sesiones sin hacer y,
 * si es así, la IA reprograma en segundo plano (como mucho una vez al día). Desde la página, con el prerender,
 * la llamada a la IA a veces se cortaba.
 */
export function AutoAdapt() {
  useEffect(() => {
    checkMissedSessions().catch(() => undefined);
  }, []);
  return null;
}
