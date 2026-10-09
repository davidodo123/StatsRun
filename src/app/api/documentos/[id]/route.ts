import { requireUserId } from "@/lib/session";
import { readDbNow } from "@/lib/db";
import { readFile } from "@/lib/files";

/** Abre un PDF propio. Los archivos son privados: solo se sirven tras comprobar que son del usuario de la sesión. */
export async function GET(req: Request, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params;
  const uid = await requireUserId();
  const doc = (await readDbNow(uid)).documents?.find((d) => d.id === id);
  if (!doc) return new Response("No encontrado", { status: 404 });
  const stream = await readFile(doc.key);
  if (!stream) return new Response("El archivo ya no existe", { status: 404 });
  const download = new URL(req.url).searchParams.has("descargar");
  return new Response(stream, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      // datos personales: que no los guarde ninguna caché compartida
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
