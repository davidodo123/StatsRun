"use client";

import { useRef, useState, useTransition } from "react";
import { setActivityPhoto } from "@/app/actions";
import { Icon } from "./icons";
import { toJpeg } from "./imageFile";

// lado mayor de 1280 px: se ve bien a pantalla completa en el móvil y pesa ~150-300 KB
const reduce = (file: File) => toJpeg(file, { max: 1280, quality: 0.8 });

/** Elegir foto (galería o cámara): botón y campo oculto. */
function Picker({ onPick, label, disabled }: { onPick: (file: File) => void; label: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} disabled={disabled} className="btn btn-ghost inline-flex items-center gap-2">
        <Icon name="camera" className="h-4 w-4" />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </>
  );
}

/** Foto del entreno dentro del formulario de registrar: va en el campo «photo» (o «removePhoto») al guardar. */
export function PhotoField({ initial }: { initial?: string }) {
  const [photo, setPhoto] = useState<string>();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string>();
  const shown = photo ?? (removed ? undefined : initial);
  return (
    <div className="field">
      Foto (opcional)
      {photo && <input type="hidden" name="photo" value={photo} />}
      {removed && !photo && <input type="hidden" name="removePhoto" value="1" />}
      {shown && (
        // vista previa (data: o /api/foto): sin optimizar
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="Foto del entreno" className="max-h-72 w-full rounded-xl object-cover" />
      )}
      <span className="flex flex-wrap items-center gap-2 font-normal">
        <Picker
          label={shown ? "Cambiar foto" : "Añadir foto"}
          onPick={async (f) => {
            setError(undefined);
            try {
              setPhoto(await reduce(f));
            } catch {
              setError("No se pudo leer la foto.");
            }
          }}
        />
        {shown && (
          <button
            type="button"
            onClick={() => {
              setPhoto(undefined);
              setRemoved(true);
            }}
            className="text-xs text-muted underline hover:text-critical"
          >
            Quitar foto
          </button>
        )}
        {error && <span className="text-xs text-critical">{error}</span>}
      </span>
      <span className="text-xs font-normal text-muted">De la galería o la cámara. La verán tus amigos con el entreno.</span>
    </div>
  );
}

/** En la ficha del entreno (tuyo): poner, cambiar o quitar la foto sin pasar por Editar. */
export function ActivityPhotoButtons({ id, hasPhoto }: { id: string; hasPhoto: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Picker
        label={pending ? "Subiendo…" : hasPhoto ? "Cambiar foto" : "Añadir foto"}
        disabled={pending}
        onPick={(f) =>
          start(async () => {
            setError(undefined);
            try {
              const r = await setActivityPhoto(id, await reduce(f));
              if (r.error) setError(r.error);
            } catch {
              setError("No se pudo subir la foto.");
            }
          })
        }
      />
      {hasPhoto && !pending && (
        <button type="button" onClick={() => start(async () => void (await setActivityPhoto(id, null)))} className="text-xs text-muted underline hover:text-critical">
          Quitar foto
        </button>
      )}
      {error && <span className="text-xs text-critical">{error}</span>}
    </div>
  );
}
