import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SERVER_TEXT, serverText } from "./serverText";

// cada say("…") de las acciones tiene su traducción, y no sobra ninguna (también las del reajuste de la IA, en lib/coach.ts)
const APP = path.join(__dirname, "..", "..", "app");
const LIB = path.join(__dirname, "..");
const sources = [...readdirSync(APP).filter((f) => f.endsWith(".ts")).map((f) => path.join(APP, f)), path.join(LIB, "coach.ts"), path.join(LIB, "engine", "planner.ts"), path.join(LIB, "auth.ts")].map((f) => readFileSync(f, "utf8"));
// los errores con frase de esos dos (los de una palabra, como «password», se traducen en la pantalla)
const libErrors = [path.join(LIB, "engine", "planner.ts"), path.join(LIB, "auth.ts")].flatMap((f) => [...readFileSync(f, "utf8").matchAll(/error(?:: | = )"([^"]+ [^"]+)"/g)].map((m) => m[1]));
const used = [...sources.flatMap((s) => [...s.matchAll(/\bsay(?:With)?\("([^"]+)"[,)]/g)].map((m) => m[1])), ...libErrors];

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
