import { connection } from "next/server";
import { avatarKey } from "@/lib/auth";
import { getImage } from "@/lib/photoStore";

/** Foto de perfil subida por un usuario. La dirección lleva la versión (?v=), así que se puede guardar en caché para siempre. */
export async function GET(_: Request, ctx: RouteContext<"/api/avatar/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const img = await getImage(avatarKey(id));
  if (!img) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(img.bytes), { headers: { "Content-Type": img.type, "Cache-Control": "private, max-age=31536000, immutable" } });
}
