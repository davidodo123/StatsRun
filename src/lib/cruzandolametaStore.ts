import "server-only";
// Descarga y caché de las carreras de Cruzando la Meta. Se leen como mucho cada 12 horas, despacio (de dos en dos y con
// pausas) y se guardan para todos los usuarios: la web no se toca en cada visita.
import { CM_RACES_KEY, kvGet, kvSet } from "./db";
import { CM_BASE, parseCmDetail, parseCmList, type CmRace } from "./cruzandolameta";
import { diffDays } from "./dates";
import { todayMadrid } from "./health";

export interface CmCache {
  updatedAt?: string;
  refreshingAt?: string;
  races: CmRace[];
}

const MAX_AGE_H = 12;
const MAX_PAGES = 8;
const UA = "Zancavolt/1.0 (+https://run-in-out.vercel.app; calendario de carreras)";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function readCmCache(): Promise<CmCache> {
  const raw = await kvGet(CM_RACES_KEY);
  return raw ? (JSON.parse(raw) as CmCache) : { races: [] };
}

/** ¿Toca volver a leer la web? (y nadie la está leyendo ya) */
export function cmCacheStale(c: CmCache, now = new Date()): boolean {
  const age = (iso?: string) => (iso ? (now.getTime() - new Date(iso).getTime()) / 3_600_000 : Infinity);
  return age(c.updatedAt) > MAX_AGE_H && age(c.refreshingAt) > 0.1;
}

/** Lee la lista de próximas y la ficha de cada una (hasta 9 meses vista) y lo guarda. */
export async function refreshCmRaces(): Promise<CmCache> {
  const prev = await readCmCache();
  await kvSet(CM_RACES_KEY, JSON.stringify({ ...prev, refreshingAt: new Date().toISOString() }));
  const today = todayMadrid();
  const byId = new Map<string, CmRace>();
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      // pasada la última página su web responde 404: ahí se acaba la lista
      let html: string;
      try {
        html = await fetchText(`${CM_BASE}/carreras/proximas/${page > 1 ? `?page=${page}` : ""}`);
      } catch (e) {
        if (page > 1) break;
        throw e;
      }
      const list = parseCmList(html);
      const fresh = list.filter((r) => !byId.has(r.id));
      if (!fresh.length) break;
      for (const r of fresh) byId.set(r.id, r);
      await sleep(400);
    }
    const races = [...byId.values()].filter((r) => r.date >= today && diffDays(r.date, today) <= 270).sort((a, b) => a.date.localeCompare(b.date));
    // fichas de dos en dos; si una falla, se queda con los datos de la lista (o los de la vez anterior)
    const old = new Map(prev.races.map((r) => [r.id, r]));
    for (let i = 0; i < races.length; i += 2) {
      await Promise.all(
        races.slice(i, i + 2).map(async (r, k) => {
          try {
            Object.assign(r, parseCmDetail(await fetchText(r.url)));
          } catch {
            const o = old.get(r.id);
            if (o) Object.assign(races[i + k], { ...o, ...r });
          }
        }),
      );
      await sleep(300);
    }
    const cache: CmCache = { updatedAt: new Date().toISOString(), races };
    await kvSet(CM_RACES_KEY, JSON.stringify(cache));
    return cache;
  } catch (e) {
    // sin conexión con su web: se mantiene lo que había (y se reintenta en un rato)
    await kvSet(CM_RACES_KEY, JSON.stringify({ ...prev, refreshingAt: new Date().toISOString() }));
    throw e;
  }
}

/** Una carrera por su número (de la caché). */
export async function findCmRace(id: string): Promise<CmRace | undefined> {
  return (await readCmCache()).races.find((r) => r.id === id);
}

/** Descarga el recorrido de una carrera (solo de su web y con tope de tamaño). */
export async function downloadCmCourse(url: string): Promise<{ name: string; bytes: Uint8Array } | undefined> {
  const u = new URL(url);
  if (u.hostname !== new URL(CM_BASE).hostname) return undefined;
  const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return undefined;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > 4 * 1024 * 1024) return undefined;
  return { name: decodeURIComponent(u.pathname.split("/").pop() ?? "recorrido"), bytes };
}
