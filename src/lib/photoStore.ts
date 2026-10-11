import "server-only";
// Fotos (de perfil y de los entrenos): JPEG ya reducido en el navegador, guardado aparte del Db del usuario.
import { kvDel, kvGet, kvSet } from "./db";
export { jpegFromDataUrl } from "./jpeg";

export const photoKey = (uid: string, activityId: string) => `statsrun:foto:${uid}:${activityId}`;

export const putImage = (key: string, base64: string) => kvSet(key, JSON.stringify({ type: "image/jpeg", data: base64 }));

export async function getImage(key: string): Promise<{ type: string; bytes: Buffer } | undefined> {
  const raw = await kvGet(key);
  if (!raw) return undefined;
  const { type, data } = JSON.parse(raw) as { type: string; data: string };
  return { type, bytes: Buffer.from(data, "base64") };
}

export const deleteImage = (key: string) => kvDel(key);
