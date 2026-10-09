import { requireUserId } from "@/lib/session";
import { readDbNow, updateDb } from "@/lib/db";
import { parseCourseFile } from "@/lib/importers/course";

export interface RaceUploadResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

/** Los recorridos pesan poco (un KMZ ronda los 10-50 kB); Vercel corta el cuerpo a 4,5 MB. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const reply = (r: RaceUploadResponse, status = 200) => Response.json(r, { status });

/** Recorrido oficial de la carrera objetivo (.kmz / .kml / .gpx) → goal.course (mapa, distancia y desnivel). */
export async function POST(req: Request) {
  const uid = await requireUserId();
  const file = (await req.formData()).get("file");
  if (!file || typeof file === "string") return reply({ ok: false, error: "No llega ningún archivo." }, 400);
  if (file.size > MAX_FILE_BYTES) return reply({ ok: false, error: "El archivo pesa más de 4 MB." }, 413);
  if (!(await readDbNow(uid)).goal) return reply({ ok: false, error: "Primero elige tu carrera objetivo." }, 400);
  try {
    const course = parseCourseFile(file.name, new Uint8Array(await file.arrayBuffer()));
    await updateDb((d) => {
      if (d.goal) d.goal = { ...d.goal, course };
    }, uid);
    const ele = course.elevationGainM !== undefined ? `, +${course.elevationGainM} m de desnivel` : "";
    return reply({ ok: true, message: `Recorrido guardado: ${course.distanceKm.toLocaleString("es-ES")} km${ele}.` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error).message }, 400);
  }
}
