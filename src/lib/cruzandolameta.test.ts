import { describe, expect, it } from "vitest";
import { decodeHtml, distancesFrom, isRunning, parseCmDetail, parseCmList } from "./cruzandolameta";

// fragmentos con la misma estructura que cruzandolameta.es (octubre de 2026)
const LIST = `
<div class='post-item'> <div class="row"> <div class='col-md-2'> <div class="date-header text-center proximas"> <span>18<br>Octubre</span> 2026<br/> </div>
<div class='date-header-2'> Domingo </div> </div> <div class="col-md-4"> <div class="img-hover"> <img src="/media/competiciones/WEB_XtfxF0o.jpg" alt="" class="img-responsive"> </div> </div>
<div class='col-md-6'> <h4><a href="/ver/xlii-media-maraton-ciudad-de-motril---2487/">XLII Media Maratón “Ciudad de Motril”</a></h4>
<p class="data-info"><i class="fa fa-map-marker"></i> Motril (Granada). </p> <p class="data-info proximas-color"><i class="fa fa-road"></i> Distancia: Media maratón - 10K. </p>
<p class="data-info proximas-color"><i class="fa fa-clock-o"></i> Hora: 10:00. </p> <p class="data-info proximas-color">Tipo: Circuito de fondo. </p> </div> </div> </div>
<div class='post-item'> <div class="row"> <div class='col-md-2'> <div class="date-header text-center proximas"> <span>25<br>Octubre</span> 2026<br/> </div> </div>
<div class='col-md-6'> <h4><a href="/ver/btt-marquesado-del-zenete---2522/">BTT MARQUESADO &#x27;&#x27;DEL ZENETE&#x27;&#x27;</a></h4>
<p class="data-info"><i class="fa fa-map-marker"></i> Aldeire (Granada). </p> <p class="data-info proximas-color"><i class="fa fa-road"></i> Distancia: Maratón. </p>
<p class="data-info proximas-color"><i class="fa fa-clock-o"></i> Hora: 00:00. </p> <p class="data-info proximas-color">Tipo: BTT. </p> </div> </div> </div>`;

const DETAIL = `
<p><strong><i class="fa fa-map-marker"></i> Distancia</strong>: <span class='proximas-color'>Media maratón - 10K</span> </p>
<p><strong><i class="fa fa-map-marker"></i> Lugar de Salida</strong>: <span class='proximas-color'>Avenida Norman Bethune</span></p>
<div class='titles'> <h4>Inscripciones abiertas desde 27/07/2026 - 08:00 hasta 13/10/2026 - 13:00 </h4> </div>
<div class='titles'><h4>Enlaces</h4></div> <ul class="list"> <li><a href='https://mediamaraton.motril.es/' target='_blank'> Web Oficial</a></li> </ul>
<div class="titles"> <h4>Descargas</h4> </div> <ul class="list"> <li><a href='/media/competiciones/Normativa_2026.pdf' target='_blank'> Normativa</a></li>
<li><a href='/media/competiciones/Recorrido_21k.gpx' target='_blank'> Recorrido 21K</a></li> </ul>
<script> var latlng = new google.maps.LatLng(36.744669,-3.516718); </script>`;

describe("Cruzando la Meta", () => {
  it("lee la lista de próximas: fecha, lugar, provincia, distancias, hora y tipo", () => {
    const [motril, btt] = parseCmList(LIST);
    expect(motril).toMatchObject({
      id: "2487",
      name: "XLII Media Maratón “Ciudad de Motril”",
      date: "2026-10-18",
      time: "10:00",
      place: "Motril (Granada)",
      province: "Granada",
      distanceText: "Media maratón - 10K",
      distancesKm: [21.0975, 10],
      type: "Circuito de fondo",
      image: "https://www.cruzandolameta.es/media/competiciones/WEB_XtfxF0o.jpg",
      url: "https://www.cruzandolameta.es/ver/xlii-media-maraton-ciudad-de-motril---2487/",
    });
    expect(btt.name).toBe("BTT MARQUESADO ''DEL ZENETE''");
    expect(btt.time).toBeUndefined(); // 00:00 = sin hora
    expect(isRunning(motril)).toBe(true);
    expect(isRunning(btt)).toBe(false);
  });

  it("lee la ficha: salida, coordenadas, inscripciones, web, descargas y el recorrido si lo hay", () => {
    expect(parseCmDetail(DETAIL)).toEqual({
      startPlace: "Avenida Norman Bethune",
      lat: 36.744669,
      lon: -3.516718,
      registration: "del 27/07/2026 al 13/10/2026",
      website: "https://mediamaraton.motril.es/",
      downloads: [
        { label: "Normativa", url: "https://www.cruzandolameta.es/media/competiciones/Normativa_2026.pdf" },
        { label: "Recorrido 21K", url: "https://www.cruzandolameta.es/media/competiciones/Recorrido_21k.gpx" },
      ],
      courseUrl: "https://www.cruzandolameta.es/media/competiciones/Recorrido_21k.gpx",
      distanceText: "Media maratón - 10K",
      distancesKm: [21.0975, 10],
    });
    expect(parseCmDetail("<html></html>")).toEqual({ startPlace: undefined, downloads: [] });
  });

  it("distancias escritas de mil maneras", () => {
    expect(distancesFrom("Maratón")).toEqual([42.195]);
    expect(distancesFrom("Media Maratón y 10K")).toEqual([21.0975, 10]);
    expect(distancesFrom("7,17 Km")).toEqual([7.17]);
    expect(distancesFrom("25 km - 12 km")).toEqual([25, 12]);
    expect(distancesFrom("Varias")).toEqual([]);
    expect(distancesFrom("Cronoescalada")).toEqual([]);
  });

  it("texto sin etiquetas ni entidades", () => {
    expect(decodeHtml("<b>Hola</b>&nbsp;&amp;&#39;adios&#x27;")).toBe("Hola &'adios'");
  });
});
