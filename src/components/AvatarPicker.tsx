"use client";

import { useRef, useState, useTransition } from "react";
import { removeAvatar, saveAvatar } from "@/app/auth-actions";
import { Icon } from "./icons";

const SIZE = 320; // px del lado: nítida en pantallas retina y ~20-40 KB

/** Recorta la foto al cuadrado del centro y la reduce a JPEG (en el navegador, antes de subirla). */
async function toSquareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Foto de perfil: al tocarla se elige otra (de la galería o la cámara); si es subida, se puede quitar. */
export function AvatarPicker({ picture, initials, custom }: { picture?: string; initials: string; custom: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const shown = preview ?? picture;

  const pick = (file?: File) => {
    if (!file) return;
    setError(undefined);
    start(async () => {
      try {
        const jpeg = await toSquareJpeg(file);
        setPreview(jpeg);
        const r = await saveAvatar(jpeg);
        if (r.error) {
          setPreview(undefined);
          setError(r.error);
        }
      } catch {
        setPreview(undefined);
        setError("No se pudo leer la foto.");
      }
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label="Cambiar foto de perfil"
        className="relative grid h-14 w-14 place-items-center rounded-full bg-accent text-lg font-bold text-accent-ink"
      >
        {shown ? (
          // foto subida (data: o /api/avatar) o de Google: sin optimizar
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className={`h-14 w-14 rounded-full object-cover ${pending ? "opacity-50" : ""}`} referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-surface-2 text-ink">
          <Icon name="camera" className="h-3.5 w-3.5" />
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {custom && !pending && (
        <button
          type="button"
          onClick={() => start(async () => { setPreview(undefined); await removeAvatar(); })}
          className="text-[11px] text-muted underline hover:text-critical"
        >
          Quitar
        </button>
      )}
      {error && <span className="max-w-24 text-center text-[11px] text-critical">{error}</span>}
    </div>
  );
}
