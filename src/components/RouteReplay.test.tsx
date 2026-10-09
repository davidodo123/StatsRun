import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteReplay } from "./RouteReplay";
import { encodePolyline } from "../lib/route";

describe("RouteReplay", () => {
  it("antes de reproducir muestra el mapa estático y el botón", () => {
    const route = encodePolyline([
      [40.41, -3.71],
      [40.42, -3.69],
    ]);
    const html = renderToStaticMarkup(
      <RouteReplay route={route} distanceKm={5} movingSec={1500}>
        <p>mapa</p>
      </RouteReplay>,
    );
    expect(html).toContain("<p>mapa</p>");
    expect(html).toContain("Reproducir recorrido");
  });

  it("sin recorrido válido deja solo el mapa", () => {
    const html = renderToStaticMarkup(
      <RouteReplay route="" distanceKm={0} movingSec={0}>
        <p>mapa</p>
      </RouteReplay>,
    );
    expect(html).toBe("<p>mapa</p>");
  });
});
