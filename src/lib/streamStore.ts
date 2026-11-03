import "server-only";
// Serie de cada carrera (tiempo, distancia, altitud y pulso), guardada aparte del Db como las fotos: ocupa unos 20 kB
import { kvDel, kvGet, kvSet } from "./db";
import type { Stream } from "./engine/streams";

export const streamKey = (uid: string, activityId: string) => `statsrun:serie:${uid}:${activityId}`;

/** La serie; `null` si ya se miró y no tiene (sin GPS); `undefined` si aún no se ha pedido. */
export async function getStream(uid: string, activityId: string): Promise<Stream | null | undefined> {
  const raw = await kvGet(streamKey(uid, activityId));
  return raw === undefined ? undefined : (JSON.parse(raw) as Stream | null);
}

export const putStream = (uid: string, activityId: string, s: Stream | null) => kvSet(streamKey(uid, activityId), JSON.stringify(s));

export const deleteStream = (uid: string, activityId: string) => kvDel(streamKey(uid, activityId));
