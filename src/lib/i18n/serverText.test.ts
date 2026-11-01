import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SERVER_TEXT, serverText } from "./serverText";

// cada say("…") de las acciones tiene su traducción, y no sobra ninguna (también las del reajuste de la IA, en lib/coach.ts)
const APP = path.join(__dirname, "..", "..", "app");
const sources = [...readdirSync(APP).filter((f) => f.endsWith(".ts")).map((f) => path.join(APP, f)), path.join(__dirname, "..", "coach.ts")].map((f) => readFileSync(f, "utf8"));
const used = sources.flatMap((s) => [...s.matchAll(/say\("([^"]+)"\)/g)].map((m) => m[1]));

describe("mensajes del servidor en los otros idiomas", () => {
  it("todos los que se usan están traducidos", () => {
    expect(used.length).toBeGreaterThan(40);
    expect(used.filter((s) => !SERVER_TEXT[s])).toEqual([]);
  });
  it("no hay traducciones que ya no se usan", () => {
    expect(Object.keys(SERVER_TEXT).filter((s) => !sources.some((src) => src.includes(`"${s}"`)))).toEqual([]);
  });
  it("un mensaje guardado se lee en el idioma de cada uno", () => {
    expect(serverText("La IA no está disponible ahora mismo. Vuelve a intentarlo más tarde.", "fr")).toBe("L'IA n'est pas disponible pour le moment. Réessaie plus tard.");
    expect(serverText("algo sin traducir", "en")).toBe("algo sin traducir");
  });
});
