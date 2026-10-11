import { describe, expect, it } from "vitest";
import { MAX_PREFERENCES, addPreferences, feedbackFor, preferencesFor } from "./aiMemory";
import { chatReplyFromAi } from "./strength/chat";
import type { AiPreference } from "./types";

let n = 0;
const id = () => `p${n++}`;
const pref = (text: string, area: AiPreference["area"], at: string): Omit<AiPreference, "id"> => ({ text, area, source: "manual", at });

describe("memoria de la IA", () => {
  it("no repite preferencias (aunque cambien mayúsculas o puntos) y descarta las vacías", () => {
    let list = addPreferences([], [pref("No quiero zancadas", "fuerza", "2026-10-01")], id);
    list = addPreferences(list, [pref("no quiero zancadas.", "fuerza", "2026-10-02"), pref("  ", "todas", "2026-10-02"), pref("Entreno a las 7:00", "todas", "2026-10-03")], id);
    expect(list.map((p) => p.text)).toEqual(["No quiero zancadas", "Entreno a las 7:00"]);
  });

  it("cada IA recibe las suyas y las de todas, primero las más recientes", () => {
    const list = addPreferences([], [pref("A plan", "plan", "2026-10-01"), pref("B fuerza", "fuerza", "2026-10-02"), pref("C todas", "todas", "2026-10-03")], id);
    expect(preferencesFor({ aiPreferences: list }, "plan")).toEqual(["C todas", "A plan"]);
    expect(preferencesFor({ aiPreferences: list }, "fuerza")).toEqual(["C todas", "B fuerza"]);
    expect(preferencesFor({}, "plan")).toEqual([]);
  });

  it("con el tope lleno se quedan las más recientes", () => {
    const many = Array.from({ length: MAX_PREFERENCES + 5 }, (_, i) => pref(`Preferencia número ${i}`, "todas", `2026-10-${String(1 + (i % 28)).padStart(2, "0")}T${String(i).padStart(2, "0")}`));
    const list = addPreferences([], many, id);
    expect(list).toHaveLength(MAX_PREFERENCES);
  });

  it("la valoración de una respuesta es la última que se dio", () => {
    const db = { aiFeedback: [{ at: "1", area: "chat" as const, ref: "m1", rating: 1 as const }, { at: "2", area: "chat" as const, ref: "m1", rating: -1 as const }] };
    expect(feedbackFor(db, "chat", "m1")?.rating).toBe(-1);
    expect(feedbackFor(db, "plan", "m1")).toBeUndefined();
    expect(feedbackFor(db, "chat", undefined)).toBeUndefined();
  });

  it("el chat devuelve lo que hay que recordar, limpio y con tope", () => {
    const r = chatReplyFromAi({ reply: "Vale.", recordar: ["No quiere zancadas", "", 5, "x", "Tiene barra de dominadas", "ab"] }, ["corporal"], "t");
    expect(r.remember).toEqual(["No quiere zancadas", "Tiene barra de dominadas"]); // fuera vacíos, números y frases de menos de 3 letras
    expect(chatReplyFromAi({ reply: "Hola" }, ["corporal"], "t").remember).toEqual([]);
  });
});
