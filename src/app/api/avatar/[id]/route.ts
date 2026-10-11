import { connection } from "next/server";
import { avatarKey } from "@/lib/auth";
import { kvGet } from "@/lib/db";

/** Foto de perfil subida por un usuario. La dirección lleva la versión (?v=), así que se puede guardar en caché para siempre. */
export async function GET(_: Request, ctx: RouteContext<"/api/avatar/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const raw = await kvGet(avatarKey(id));
  if (!raw) return new Response(null, { status: 404 });
  const { type, data } = JSON.parse(raw) as { type: string; data: string };
  return new Response(Buffer.from(data, "base64"), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
