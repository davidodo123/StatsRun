"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { recordRouteVideo, videoType } from "./routeVideo";
import type { ShareVideo } from "@/lib/shareCard";
import { translator, type Locale } from "@/lib/i18n";

type Busy = "historia" | "sticker" | "copiar" | "video";

/** Comparte con el menú del móvil (Instagram, WhatsApp…); si no se puede, lo descarga. */
async function shareFile(file: File, title: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
    } catch (e) {
      // cerrar el menú sin elegir nada no es un error
      if ((e as DOMException).name !== "AbortError") throw e;
    }
    return;
  }
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement("a"), { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const image = async (id: string, sticker: boolean) => {
  const res = await fetch(`/api/compartir/${encodeURIComponent(id)}${sticker ? "?formato=sticker" : ""}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.blob();
};

/**
 * «Compartir» un entreno: imagen de historia, sticker sin fondo (copiar para pegarlo en una historia encima de una
 * foto propia, o guardarlo) y, si tiene recorrido, un vídeo con la línea dibujándose.
 */
export function ShareActivityButton({ id, name, video, locale = "es" }: { id: string; name: string; video?: ShareVideo; locale?: Locale }) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>();
  const [note, setNote] = useState<{ ok: boolean; text: string }>();
  // grabar vídeo solo se sabe en el navegador (al montar: así no hay desajuste con lo que pinta el servidor)
  const [canVideo, setCanVideo] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- MediaRecorder solo existe en el navegador
    setCanVideo(Boolean(video) && Boolean(videoType()));
  }, [video]);

  const run = async (what: Busy, fn: () => Promise<string | void>) => {
    setBusy(what);
    setNote(undefined);
    try {
      const text = await fn();
      if (text) setNote({ ok: true, text });
      else setOpen(false);
    } catch {
      setNote({ ok: false, text: t("sh.error") });
    } finally {
      setBusy(undefined);
    }
  };

  const copySticker = () =>
    run("copiar", async () => {
      // en el iPhone el portapapeles solo se puede escribir en el mismo toque: la imagen va como promesa
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": image(id, true) })]);
          return t("sh.copiado");
        } catch {
          // sin permiso para copiar imágenes: se comparte el archivo
        }
      }
      await shareFile(new File([await image(id, true)], "run-in-out-sticker.png", { type: "image/png" }), name);
      return t("sh.guardalo");
    });

  const label = (what: Busy, text: string) => (busy === what ? (what === "video" ? t("sh.grabando") : t("sh.preparando")) : text);
  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-2 disabled:opacity-50";

  return (
    <div className="relative">
      <button type="button" className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={t("sh.title")}>
        <Icon name="share" className="mr-1 h-4 w-4 align-[-2px]" />
        {t("sh.compartir")}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          <button type="button" className={item} disabled={Boolean(busy)} onClick={() => run("historia", async () => shareFile(new File([await image(id, false)], "run-in-out.png", { type: "image/png" }), name))}>
            <Icon name="share" className="h-4 w-4 text-muted" />
            <span>
              {label("historia", t("sh.historia"))}
              <span className="block text-xs text-muted">{t("sh.historiaD")}</span>
            </span>
          </button>
          <button type="button" className={item} disabled={Boolean(busy)} onClick={copySticker}>
            <Icon name="star" className="h-4 w-4 text-muted" />
            <span>
              {label("copiar", t("sh.copiar"))}
              <span className="block text-xs text-muted">{t("sh.copiarD")}</span>
            </span>
          </button>
          <button type="button" className={item} disabled={Boolean(busy)} onClick={() => run("sticker", async () => shareFile(new File([await image(id, true)], "run-in-out-sticker.png", { type: "image/png" }), name))}>
            <Icon name="star" className="h-4 w-4 text-muted" />
            <span>
              {label("sticker", t("sh.guardar"))}
              <span className="block text-xs text-muted">{t("sh.guardarD")}</span>
            </span>
          </button>
          {canVideo && video && (
            <button type="button" className={item} disabled={Boolean(busy)} onClick={() => run("video", async () => shareFile(await recordRouteVideo(video), name))}>
              <Icon name="play" className="h-4 w-4 text-muted" />
              <span>
                {label("video", t("sh.video"))}
                <span className="block text-xs text-muted">{t("sh.videoD")}</span>
              </span>
            </button>
          )}
          {note && <p className={`px-3 py-2 text-xs font-medium ${note.ok ? "text-good-ink" : "text-critical"}`}>{note.text}</p>}
        </div>
      )}
    </div>
  );
}
