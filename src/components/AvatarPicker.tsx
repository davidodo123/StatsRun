"use client";

import { useRef, useState, useTransition } from "react";
import { removeAvatar, saveAvatar } from "@/app/auth-actions";
import { Icon } from "./icons";
import { toJpeg } from "./imageFile";

/** Foto de perfil: al tocarla se elige otra (de la galería o la cámara); si es una subida, sale un menú para cambiarla o quitarla. */
export function AvatarPicker({ picture, initials, custom }: { picture?: string; initials: string; custom: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [menu, setMenu] = useState(false);
  const shown = preview ?? picture;

  const pick = (file?: File) => {
    if (!file) return;
    setError(undefined);
    start(async () => {
      try {
        // 320 px: nítida en pantallas retina y ~20-40 KB
        const jpeg = await toJpeg(file, { max: 320, square: true, quality: 0.85 });
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
    <div className="relative flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => (custom ? setMenu((m) => !m) : input.current?.click())}
        aria-expanded={custom ? menu : undefined}
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
      {menu && (
        <>
          {/* capa invisible: tocar fuera cierra */}
          <button type="button" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(false)} aria-label="Cerrar" tabIndex={-1} />
          <div className="absolute left-0 top-16 z-40 w-40 overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-lg" role="menu">
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left hover:bg-surface-2"
              onClick={() => {
                setMenu(false);
                input.current?.click();
              }}
            >
              Cambiar foto
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-critical hover:bg-surface-2"
              onClick={() => {
                setMenu(false);
                start(async () => {
                  setPreview(undefined);
                  await removeAvatar();
                });
              }}
            >
              Quitar foto
            </button>
          </div>
        </>
      )}
      {error && <span className="max-w-24 text-center text-[11px] text-critical">{error}</span>}
    </div>
  );
}
