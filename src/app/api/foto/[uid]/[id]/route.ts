import { connection } from "next/server";
import { areFriends } from "@/lib/auth";
import { getImage, photoKey } from "@/lib/photoStore";
import { getUserId } from "@/lib/session";

/** Foto de un entreno: la ve su dueño y sus amigos. La dirección lleva la versión (?v=): caché para siempre. */
export async function GET(_: Request, ctx: RouteContext<"/api/foto/[uid]/[id]">) {
  await connection();
  const [{ uid, id }, me] = await Promise.all([ctx.params, getUserId()]);
  if (!me || (me !== uid && !(await areFriends(me, uid)))) return new Response(null, { status: 404 });
  const img = await getImage(photoKey(uid, decodeURIComponent(id)));
  if (!img) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(img.bytes), { headers: { "Content-Type": img.type, "Cache-Control": "private, max-age=31536000, immutable" } });
}
