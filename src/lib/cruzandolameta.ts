// Carreras de Cruzando la Meta (cruzandolameta.es, cronometraje en Andalucía): leer su lista de próximas y la ficha de
// cada una. Aquí solo se interpreta el HTML; la descarga y la caché están en cruzandolametaStore.ts.

export const CM_BASE = "https://www.cruzandolameta.es";

export interface CmDownload {
  label: string;
  url: string;
}

export interface CmRace {
  id: string; // el número de la web («---2487»)
  name: string;
  date: string; // AAAA-MM-DD
  time?: string; // HH:MM
  place: string; // «Motril (Granada)»
  province?: string;
  distanceText: string; // tal cual: «Media maratón - 10K», «Varias»
  distancesKm: number[]; // las que se entienden: [21.0975, 10]
  type: string; // «Circuito de fondo», «Trail», «Carrera Infantil»…
  image?: string;
  url: string; // ficha en su web
  // de la ficha
  startPlace?: string;
  lat?: number;
  lon?: number;
  registration?: string; // «del 27/07/2026 al 13/10/2026»
  website?: string;
  downloads?: CmDownload[];
  courseUrl?: string; // recorrido en GPX, KMZ o KML si lo publican
}

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");
const plain = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Texto sin etiquetas y con las entidades más comunes. */
export function decodeHtml(t: string): string {
  return t
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

const absolute = (u: string) => (u.startsWith("http") ? u : `${CM_BASE}${u.startsWith("/") ? "" : "/"}${u}`);

/** Distancias que se entienden en «Media maratón - 10K», «21K y 10K», «25 km», «Maratón»… (en km). */
export function distancesFrom(text: string): number[] {
  const t = plain(text);
  const out: number[] = [];
  const add = (km: number) => {
    if (km >= 1 && km <= 200 && !out.some((x) => Math.abs(x - km) < 0.05)) out.push(km);
  };
  if (/media\s*marat|medio\s*marat|half/.test(t)) add(21.0975);
  if (/(^|[^a-z])marat(on|hon)/.test(t.replace(/media\s*marat\w*|medio\s*marat\w*/g, ""))) add(42.195);
  for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s*(k\b|km\b|kms\b|kilometros)/g)) add(Number(m[1].replace(",", ".")));
  return out;
}

/** Lista de próximas carreras (una página). */
export function parseCmList(html: string): CmRace[] {
  const out: CmRace[] = [];
  for (const block of html.split(/<div class=['"]post-item['"]>/).slice(1)) {
    const link = block.match(/<h4>\s*<a href="(\/ver\/[^"]*---(\d+)\/?)"[^>]*>([\s\S]*?)<\/a>/);
    const date = block.match(/<span>\s*(\d{1,2})\s*<br>\s*([A-Za-zÁÉÍÓÚáéíóú]+)\s*<\/span>\s*(\d{4})/);
    if (!link || !date) continue;
    const month = MONTHS[plain(date[2])];
    if (!month) continue;
    const field = (re: RegExp) => {
      const m = block.match(re);
      return m ? decodeHtml(m[1]).replace(/\.$/, "").trim() : undefined;
    };
    const place = field(/fa-map-marker"><\/i>([\s\S]*?)<\/p>/) ?? "";
    const distanceText = field(/Distancia:([\s\S]*?)<\/p>/) ?? "";
    out.push({
      id: link[2],
      name: decodeHtml(link[3]),
      date: `${date[3]}-${pad(month)}-${pad(Number(date[1]))}`,
      // «00:00» es que aún no tienen hora
      time: field(/Hora:\s*([\d:]+)/)?.replace(/^00:00$/, "") || undefined,
      place,
      province: place.match(/\(([^)]+)\)/)?.[1],
      distanceText,
      distancesKm: distancesFrom(distanceText),
      type: field(/Tipo:([\s\S]*?)<\/p>/) ?? "",
      image: block.match(/<img src="([^"]+)"/)?.[1] && absolute(block.match(/<img src="([^"]+)"/)![1]),
      url: absolute(link[1]),
    });
  }
  return out;
}

/** Datos de la ficha: salida, coordenadas, inscripciones, web oficial y descargas (y el recorrido si lo hay). */
export function parseCmDetail(html: string): Pick<CmRace, "startPlace" | "lat" | "lon" | "registration" | "website" | "downloads" | "courseUrl"> & Partial<Pick<CmRace, "distanceText" | "distancesKm">> {
  const field = (label: string) => {
    const m = html.match(new RegExp(`${label}<\\/strong>:\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`));
    return m ? decodeHtml(m[1]) : undefined;
  };
  const ll = html.match(/google\.maps\.LatLng\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
  const reg = html.match(/abiertas desde\s*(\d{2}\/\d{2}\/\d{4})[^<]*?hasta\s*(\d{2}\/\d{2}\/\d{4})/);
  const section = (title: string) => {
    const i = html.indexOf(`<h4>${title}</h4>`);
    return i < 0 ? "" : html.slice(i, html.indexOf("</ul>", i) + 5);
  };
  const links = (seg: string) => [...seg.matchAll(/<a href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ url: absolute(m[1]), label: decodeHtml(m[2]) }));
  const downloads = links(section("Descargas"));
  const website = links(section("Enlaces")).find((l) => /web/i.test(l.label))?.url;
  const course = downloads.find((d) => /\.(gpx|kmz|kml)(\?|$)/i.test(d.url));
  const distanceText = field("Distancia");
  return {
    startPlace: field("Lugar de Salida"),
    ...(ll ? { lat: Number(ll[1]), lon: Number(ll[2]) } : {}),
    ...(reg ? { registration: `del ${reg[1]} al ${reg[2]}` } : {}),
    ...(website ? { website } : {}),
    downloads,
    ...(course ? { courseUrl: course.url } : {}),
    ...(distanceText ? { distanceText, distancesKm: distancesFrom(distanceText) } : {}),
  };
}

/** Tipos que no son carreras a pie para adultos (se ocultan por defecto). */
export const isRunning = (r: Pick<CmRace, "type" | "name">) =>
  !/infantil|btt|mtb|bici|ciclis|nado|natacion|triatl|duatl|acuatl|marcha nordica|senderismo/.test(plain(r.type)) && !/btt|mtb|ciclis|triatl|duatl/.test(plain(r.name));
