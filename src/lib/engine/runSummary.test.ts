import { describe, expect, it } from "vitest";
import { runSummary, summaryContext } from "./runSummary";
import type { Activity } from "../types";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const run = (id: string, date: string, km: number, paceSec: number): Activity => ({
  id, source: "manual", name: id, sport: "run", sportRaw: "run", date, startLocal: `${date}T08:00:00`,
  distanceM: km * 1000, movingSec: km * paceSec, elapsedSec: km * paceSec, elevationGainM: 0,
});

describe("resumen de una carrera", () => {
  const acts = [run("a", "2026-10-20", 5, 400), run("b", "2026-10-24", 5, 390), run("c", "2026-10-28", 6, 395), run("hoy", "2026-11-02", 7, 370)];
  const ctx = summaryContext(acts, acts[3]);

  it("ritmo habitual (mediana de antes) y la más larga del último mes", () => {
    expect(ctx.habitualPace).toBe(395);
    expect(ctx.longestRecentKm).toBe(6);
  });

  it("más rápido que lo habitual, la más larga, zona y récords", () => {
    const parts = runSummary({ paceSec: 370, distanceKm: 7, gapSec: 360, zones: [0, 100, 900, 200, 0, 0], records: [1000] }, ctx, fmt);
    expect(parts.map((p) => p.key)).toEqual(["ra.s.rapido", "ra.s.larga", "ra.s.zona", "ra.s.cuestas", "ra.s.record"]);
    expect(parts[0].params).toMatchObject({ s: 25, ritmo: "6:10", habitual: "6:35" });
    expect(parts[2].params).toMatchObject({ z: 3, pct: 75 });
  });

  it("sin carreras antes, solo lo que se sabe de esta", () => {
    const parts = runSummary({ paceSec: 370, distanceKm: 7, zones: [0, 0, 0, 0, 0, 0], records: [] }, summaryContext([acts[3]], acts[3]), fmt);
    expect(parts).toEqual([]);
  });

  it("ritmo parecido: «a tu ritmo de siempre»", () => {
    expect(runSummary({ paceSec: 397, distanceKm: 5, zones: [], records: [] }, ctx, fmt)[0].key).toBe("ra.s.igual");
  });
});
