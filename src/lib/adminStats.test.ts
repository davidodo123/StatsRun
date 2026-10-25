import { describe, expect, it } from "vitest";
import { adminRow, adminTotals, type AdminUser } from "./adminStats";
import type { Activity, Db } from "./types";

const user = (id: string, createdAt = "2026-10-01T10:00:00Z"): AdminUser => ({ id, name: id, username: id, createdAt, friends: 2 });
const act = (date: string) => ({ id: date, date, sport: "run" }) as Activity;

describe("panel de administración", () => {
  const today = "2026-10-25"; // domingo
  const a: Db = { activities: [act("2026-10-10"), act("2026-10-20"), act("2026-10-24")], aiUsage: { chat: { period: today, n: 3 }, adapt: { period: "2026-10-24", n: 5 } }, healthTokenHash: "x" };
  const b: Db = { activities: [act("2026-09-01")] };

  it("resume cada usuario", () => {
    const r = adminRow(user("a"), a, JSON.stringify(a), today);
    expect(r.lastActivity).toBe("2026-10-24");
    expect(r.activities).toBe(3);
    expect(r.last7).toBe(2); // del 19 al 25
    expect(r.aiToday).toEqual({ chat: 3, adapt: 0 }); // el uso de ayer no cuenta
    expect(r.health).toBe("iPhone");
    expect(r.plan).toBe(false);
  });

  it("totales: activos, nuevos y entrenos de la semana", () => {
    const rows = [adminRow(user("a"), a, "{}", today), adminRow(user("b", "2026-10-21T09:00:00Z"), b, "{}", today)];
    const t = adminTotals(rows, [a, b], today);
    expect(t.users).toBe(2);
    expect(t.active7).toBe(1);
    expect(t.newThisWeek).toBe(1);
    expect(t.activitiesWeek).toBe(2); // desde el lunes 19
    expect(t.aiChatToday).toBe(3);
  });
});
