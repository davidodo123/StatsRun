import { describe, expect, it } from "vitest";
import { celebrationSport } from "./celebrateCookie";

describe("celebrationSport", () => {
  it("devuelve el deporte de la cookie", () => {
    expect(celebrationSport("strength")).toBe("strength");
    expect(celebrationSport("run")).toBe("run");
    expect(celebrationSport("swim")).toBe("swim");
  });

  it("con un valor desconocido usa la figura genérica", () => {
    expect(celebrationSport("1")).toBe("other");
    expect(celebrationSport("")).toBe("other");
  });
});
