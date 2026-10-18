import { describe, expect, it } from "vitest";
import { aerobicDecoupling, decouplingLabel } from "./decoupling";

// rodaje de `min` minutos a 1 Hz, con el pulso que da `hr(t)` y velocidad fija
const run = (min: number, hr: (t: number) => number, v = 3) => {
  const time = Array.from({ length: min * 60 + 1 }, (_, i) => i);
  return { time, heartrate: time.map(hr), velocity: time.map(() => v) };
};

describe("desacople aeróbico", () => {
  it("es 0 con pulso y ritmo constantes", () => {
    expect(aerobicDecoupling(run(70, () => 140))).toBe(0);
  });

  it("sale positivo si el pulso sube al final con el mismo ritmo", () => {
    const pct = aerobicDecoupling(run(80, (t) => 140 + (t / 4800) * 14))!;
    expect(pct).toBeGreaterThan(3);
    expect(pct).toBeLessThan(6);
  });

  it("no da dato en rodajes de menos de una hora", () => {
    expect(aerobicDecoupling(run(50, () => 140))).toBeUndefined();
  });

  it("no cuenta las paradas ni los tramos andando", () => {
    const r = run(70, () => 140);
    // 5 min parado en mitad con el pulso bajando
    for (let i = 2400; i < 2700; i++) {
      r.velocity[i] = 0;
      r.heartrate[i] = 100;
    }
    expect(aerobicDecoupling(r)).toBe(0);
  });

  it("etiqueta según los umbrales de 5 y 10 %", () => {
    expect(decouplingLabel(3).tone).toBe("good");
    expect(decouplingLabel(7).tone).toBe("warn");
    expect(decouplingLabel(12).tone).toBe("bad");
  });
});
