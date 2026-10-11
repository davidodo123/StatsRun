/** El base64 de un `data:image/jpeg` válido y no más grande de `maxBytes`; si no, undefined. */
export function jpegFromDataUrl(dataUrl: unknown, maxBytes: number): string | undefined {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl ?? ""));
  if (!m) return undefined;
  const bytes = Buffer.from(m[1], "base64");
  return bytes.length <= maxBytes && bytes[0] === 0xff && bytes[1] === 0xd8 ? m[1] : undefined;
}
