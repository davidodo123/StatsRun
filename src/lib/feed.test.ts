import { describe, expect, it } from "vitest";
import { buildFeed } from "./feed";
import type { Activity, Db } from "./types";

const today = "2026-10-09";
const act = (id: string, date: string, extra: Partial<Activity> = {}): Activity => ({
  id,
  source: "manual",
  name: id,
  sport: "run",
  sportRaw: "Run",
  date,
  startLocal: `${date}T08:00:00`,
  distanceM: 5000,
  movingSec: 1500,
  elapsedSec: 1500,
  elevationGainM: 0,
  ...extra,
});

describe("Feed de amigos", () => {
  const ana = { person: { id: "ana", name: "Ana" }, db: { activities: [act("a1", "2026-10-08", { with: ["yo"], feelings: "privado" }), act("a2", "2026-10-01"), act("a3", "2026-09-01")] } as Db };
  const leo = { person: { id: "leo", name: "Leo" }, db: { activities: [act("l1", "2026-10-09", { with: ["yo"] })] } as Db };

  it("ordena por fecha, limita a 14 días y oculta las sensaciones", () => {
    const f = buildFeed("yo", { activities: [] }, [ana, leo], today);
    expect(f.items.map((i) => i.activity.id)).toEqual(["l1", "a1", "a2"]);
    expect(f.items[1].activity.feelings).toBeUndefined();
  });

  it("sesiones compartidas conmigo, salvo las ya añadidas o descartadas", () => {
    expect(buildFeed("yo", { activities: [] }, [ana, leo], today).sharedWithMe.map((i) => i.activity.id)).toEqual(["l1", "a1"]);
    const me: Db = { activities: [act("x", "2026-10-08", { sharedFrom: "ana:a1" })], dismissedShared: ["leo:l1"] };
    expect(buildFeed("yo", me, [ana, leo], today).sharedWithMe).toEqual([]);
  });
});
