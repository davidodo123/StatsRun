import Image from "next/image";
import { translator, type Locale } from "@/lib/i18n";
import type { Muscle } from "@/lib/strength/labels";
import type { Sex } from "@/lib/types";
import { PHOTO_BACK, PHOTO_FRONT, PHOTO_H, PHOTO_MIRROR, PHOTO_W, photoPath, type PhotoShape } from "@/lib/strength/bodyPhoto";

// muñeco realista (public/cuerpo): hombre o mujer según el perfil; mismo encuadre, así que los contornos sirven para los dos
const BODY = { male: "hombre", female: "mujer" } as const;

// Un lado del cuerpo: la imagen en gris y encima, en lima, cada músculo según las series que ha recibido.
// El lima se mezcla con la imagen (overlay) para que se vean las fibras y las sombras del músculo, y se recorta
// con la silueta (la imagen no tiene fondo) para que no se salga del cuerpo.
function Figure({ src, shapes, label, sets, full }: { src: string; shapes: PhotoShape[]; label: string; sets: Partial<Record<Muscle, number>>; full: number }) {
  const lit = shapes.filter((s) => (sets[s.m] ?? 0) > 0);
  const paths = lit.map((s, i) => (
    <path key={i} d={photoPath(s.pts)} fill="var(--accent)" fillOpacity={0.35 + 0.65 * Math.min(1, sets[s.m]! / full)}>
      <title>{`${sets[s.m]!.toLocaleString("es-ES")} series`}</title>
    </path>
  ));
  return (
    <figure className="flex-1 text-center">
      <div className="relative isolate mx-auto h-64 w-fit" role="img" aria-label={`Músculos trabajados, vista de ${label.toLowerCase()}`}>
        <Image src={src} alt="" width={PHOTO_W} height={PHOTO_H} unoptimized className="h-full w-auto" />
        <svg
          viewBox={`0 0 ${PHOTO_W} ${PHOTO_H}`}
          className="absolute inset-0 h-full w-full mix-blend-overlay"
          style={{ maskImage: `url(${src})`, maskSize: "100% 100%", WebkitMaskImage: `url(${src})`, WebkitMaskSize: "100% 100%" }}
          aria-hidden
        >
          <defs>
            <filter id="mm-suave">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g filter="url(#mm-suave)">
            <g>{paths}</g>
            <g transform={PHOTO_MIRROR}>{paths}</g>
          </g>
        </svg>
      </div>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** Delante y detrás; color pleno a partir de `full` series. */
export function MuscleMap({ sets, full = 10, locale = "es", sex = "male" }: { sets: Partial<Record<Muscle, number>>; full?: number; locale?: Locale; sex?: Sex }) {
  const t = translator(locale);
  const body = BODY[sex] ?? BODY.male;
  return (
    <div className="flex gap-2">
      <Figure src={`/cuerpo/${body}-delante.webp`} shapes={PHOTO_FRONT} label={t("mm.delante")} sets={sets} full={full} />
      <Figure src={`/cuerpo/${body}-detras.webp`} shapes={PHOTO_BACK} label={t("mm.detras")} sets={sets} full={full} />
    </div>
  );
}
