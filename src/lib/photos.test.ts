import { describe, expect, it } from "vitest";
import { activityPhotoUrl } from "./photos";
import { jpegFromDataUrl } from "./jpeg";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");

describe("fotos", () => {
  it("solo JPEG de verdad y no más grande de lo permitido", () => {
    expect(jpegFromDataUrl(`data:image/jpeg;base64,${jpeg}`, 100)).toBe(jpeg);
    expect(jpegFromDataUrl(`data:image/jpeg;base64,${jpeg}`, 3)).toBeUndefined(); // demasiado grande
    expect(jpegFromDataUrl(`data:image/png;base64,${jpeg}`, 100)).toBeUndefined();
    expect(jpegFromDataUrl(`data:image/jpeg;base64,${Buffer.from("hola").toString("base64")}`, 100)).toBeUndefined(); // no es JPEG
    expect(jpegFromDataUrl("javascript:alert(1)", 100)).toBeUndefined();
    expect(jpegFromDataUrl(undefined, 100)).toBeUndefined();
  });

  it("la dirección lleva el dueño, el id y la versión", () => {
    expect(activityPhotoUrl("u1", { id: "manual-abc", photoAt: "2026-10-11T10:00:00.000Z" })).toBe(`/api/foto/u1/manual-abc?v=${Date.parse("2026-10-11T10:00:00.000Z")}`);
    expect(activityPhotoUrl("u1", { id: "x" })).toBeUndefined();
  });
});
