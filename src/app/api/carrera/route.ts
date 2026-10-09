import { randomUUID } from "node:crypto";
import { requireUserId } from "@/lib/session";
import { readDbNow, updateDb } from "@/lib/db";
import { MAX_FILE_BYTES, deleteFile, isPdf, saveFile } from "@/lib/files";
import { parseCourseFile } from "@/lib/importers/course";
import type { StoredDocument } from "@/lib/types";

export interface RaceUploadResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

const MAX_DOCUMENTS = 20;
const reply = (r: RaceUploadResponse, status = 200) => Response.json(r, { status });

/**
 * Archivos de la carrera objetivo:
 * - `kind=recorrido`: .kmz / .kml / .gpx con el circuito → goal.course (mapa, distancia y desnivel).
 * - `kind=documento`: PDF (reglamento, dorsal…) → db.documents.
 */
export async function POST(req: Request) {
  const uid = await requireUserId();
  const fd = await req.formData();
  const file = fd.get("file");
  if (!file || typeof file === "string") return reply({ ok: false, error: "No llega ningún archivo." }, 400);
  if (file.size > MAX_FILE_BYTES) return reply({ ok: false, error: `El archivo pesa más de ${MAX_FILE_BYTES / 1024 / 1024} MB.` }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (fd.get("kind") === "recorrido") {
    const db = await readDbNow(uid);
    if (!db.goal) return reply({ ok: false, error: "Primero elige tu carrera objetivo." }, 400);
    try {
      const course = parseCourseFile(file.name, bytes);
      await updateDb((d) => {
        if (d.goal) d.goal = { ...d.goal, course };
      }, uid);
      const ele = course.elevationGainM !== undefined ? `, +${course.elevationGainM} m de desnivel` : "";
      return reply({ ok: true, message: `Recorrido guardado: ${course.distanceKm.toLocaleString("es-ES")} km${ele}.` });
    } catch (e) {
      return reply({ ok: false, error: (e as Error).message }, 400);
    }
  }

  if (fd.get("kind") === "documento") {
    if (!isPdf(bytes)) return reply({ ok: false, error: "Solo se admiten documentos PDF." }, 400);
    const current = (await readDbNow(uid)).documents ?? [];
    if (current.length >= MAX_DOCUMENTS) return reply({ ok: false, error: `Máximo ${MAX_DOCUMENTS} documentos: borra alguno antes.` }, 400);
    const id = randomUUID();
    const name = file.name.replace(/[\r\n"]/g, "").slice(0, 120) || "documento.pdf";
    let key: string;
    try {
      key = await saveFile(uid, id, name, bytes, "application/pdf");
    } catch (e) {
      return reply({ ok: false, error: (e as Error).message }, 500);
    }
    const doc: StoredDocument = { id, name, size: file.size, contentType: "application/pdf", uploadedAt: new Date().toISOString(), key };
    try {
      await updateDb((d) => {
        d.documents = [...(d.documents ?? []).filter((x) => x.id !== id), doc];
      }, uid);
    } catch (e) {
      // sin registro en la base de datos el archivo quedaría huérfano
      await deleteFile(key).catch(() => undefined);
      return reply({ ok: false, error: (e as Error).message }, 500);
    }
    return reply({ ok: true, message: `«${name}» guardado.` });
  }

  return reply({ ok: false, error: "Tipo de archivo no válido." }, 400);
}
