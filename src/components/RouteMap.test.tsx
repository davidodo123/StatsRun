import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteMap } from "./RouteMap";
import { encodePolyline } from "../lib/route";

const route = encodePolyline([
  [40.41, -3.71],
  [40.42, -3.69],
  [40.43, -3.7],
]);

describe("RouteMap", () => {
  it("dibuja teselas, recorrido y atribución", () => {
    const html = renderToStaticMarkup(<RouteMap route={route} />);
    expect(html).toContain("basemaps.cartocdn.com/rastertiles/voyager/");
    expect(html).toContain("<polyline");
    expect(html).toContain("© OpenStreetMap");
  });

  it("miniatura sin teselas", () => {
    const html = renderToStaticMarkup(<RouteMap route={route} width={64} height={48} tiles={false} />);
    expect(html).not.toContain("<image");
    expect(html).toContain("<polyline");
  });
});
