import { scanActivityImages, type ScannedActivity } from "@/lib/coach";

const MAX_IMAGES = 4;
const MAX_BYTES = 6 * 1024 * 1024;

export type ScanResponse = { ok: true; data: ScannedActivity } | { ok: false; error: string };

/** Recibe capturas de pantalla de un entreno y devuelve los datos leídos por la IA. */
export async function POST(req: Request) {
  const fd = await req.formData();
  const images: string[] = [];
  for (const entry of fd.getAll("images").slice(0, MAX_IMAGES)) {
    if (typeof entry === "string" || !entry.type.startsWith("image/")) continue;
    if (entry.size > MAX_BYTES) return Response.json({ ok: false, error: `${entry.name}: imagen demasiado grande` } satisfies ScanResponse);
    images.push(`data:${entry.type};base64,${Buffer.from(await entry.arrayBuffer()).toString("base64")}`);
  }
  if (!images.length) return Response.json({ ok: false, error: "Sube al menos una imagen." } satisfies ScanResponse);
  try {
    return Response.json({ ok: true, data: await scanActivityImages(images) } satisfies ScanResponse);
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message } satisfies ScanResponse);
  }
}
