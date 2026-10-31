import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SERVER_TEXT } from "./serverText";

// cada say("…") de las acciones tiene su traducción, y no sobra ninguna
const APP = path.join(__dirname, "..", "..", "app");
const used = readdirSync(APP)
  .filter((f) => f.endsWith(".ts"))
  .flatMap((f) => [...readFileSync(path.join(APP, f), "utf8").matchAll(/say\("([^"]+)"\)/g)].map((m) => m[1]));

describe("mensajes del servidor en los otros idiomas", () => {
  it("todos los que se usan están traducidos", () => {
    expect(used.length).toBeGreaterThan(40);
    expect(used.filter((s) => !SERVER_TEXT[s])).toEqual([]);
  });
  it("no hay traducciones que ya no se usan", () => {
    expect(Object.keys(SERVER_TEXT).filter((s) => !used.includes(s))).toEqual([]);
  });
});
