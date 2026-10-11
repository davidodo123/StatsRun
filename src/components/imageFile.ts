// Fotos elegidas en el móvil: se reducen a JPEG en el navegador antes de subirlas (de varios MB a decenas de KB).

/** JPEG como data URL: el cuadrado del centro de `max` px (`square`) o la foto entera con su lado mayor a `max` px. */
export async function toJpeg(file: File, { max, square = false, quality = 0.82 }: { max: number; square?: boolean; quality?: number }): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    const side = Math.min(w0, h0);
    const [sx, sy, sw, sh] = square ? [(w0 - side) / 2, (h0 - side) / 2, side, side] : [0, 0, w0, h0];
    const k = Math.min(1, max / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * k);
    canvas.height = Math.round(sh * k);
    canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
