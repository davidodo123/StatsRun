import "server-only";
// Archivos subidos (PDFs de la carrera):
// - En Vercel, Vercel Blob en modo privado: sin URL pública, solo se leen desde el servidor tras comprobar la sesión.
// - Sin token de Blob (en local), en data/files/<usuario>/.
import { promises as fs } from "node:fs";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

const LOCAL_DIR = path.join(process.cwd(), "data", "files");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Tamaño máximo: el cuerpo de una petición a una función de Vercel no puede pasar de 4,5 MB. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const safe = (s: string) => s.replace(/[^\w.-]/g, "_");

/** Guarda el archivo y devuelve la clave para leerlo o borrarlo después. */
export async function saveFile(uid: string, id: string, fileName: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const pathname = `documentos/${safe(uid)}/${safe(id)}-${safe(fileName)}`;
  if (blobEnabled()) {
    const res = await put(pathname, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: true });
    return res.url;
  }
  if (process.env.VERCEL) throw new Error("Falta conectar Vercel Blob al proyecto (Storage → Create → Blob) para guardar archivos.");
  const file = path.join(LOCAL_DIR, pathname);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return `local:${pathname}`;
}

/** Contenido del archivo como stream (o undefined si ya no existe). */
export async function readFile(key: string): Promise<ReadableStream<Uint8Array> | undefined> {
  if (key.startsWith("local:")) {
    try {
      const buf = await fs.readFile(path.join(LOCAL_DIR, key.slice("local:".length)));
      return new Blob([new Uint8Array(buf)]).stream();
    } catch {
      return undefined;
    }
  }
  const res = await get(key, { access: "private" });
  return res?.statusCode === 200 ? res.stream : undefined;
}

export async function deleteFile(key: string): Promise<void> {
  if (key.startsWith("local:")) {
    await fs.rm(path.join(LOCAL_DIR, key.slice("local:".length)), { force: true });
    return;
  }
  await del(key);
}

/** ¿Es un PDF de verdad? (cabecera %PDF-, no solo la extensión) */
export const isPdf = (bytes: Uint8Array) => bytes.length > 4 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
