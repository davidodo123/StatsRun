// Vídeo corto del recorrido para las historias (se hace en el móvil, sin servidor): la línea se va dibujando y
// después salen los datos. Se graba el <canvas> con MediaRecorder: MP4 en iPhone y en el Chrome de Android.
import type { ShareVideo } from "@/lib/shareCard";

const W = 720;
const H = 1280;
const FPS = 30;
const DRAW_MS = 3800; // la línea
const HOLD_MS = 2400; // los datos, ya quietos
const ACCENT = "#d4ff3a";

/** Formato que sabe grabar este navegador (Instagram quiere MP4). */
export function videoType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !("captureStream" in HTMLCanvasElement.prototype)) return;
  return ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
}

const ease = (t: number) => 1 - (1 - t) ** 3;

/** Graba el vídeo (tarda lo que dura, ~6 s) y lo devuelve como archivo. */
export async function recordRouteVideo(v: ShareVideo): Promise<File> {
  const type = videoType();
  if (!type) throw new Error("Este navegador no puede grabar vídeo.");
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;

  // recorrido encajado en un cuadrado de 600 px, centrado
  const box = 600;
  const maxX = Math.max(...v.points.map((p) => p[0]));
  const maxY = Math.max(...v.points.map((p) => p[1]));
  const ox = (W - box * maxX) / 2;
  const oy = 300 + (box - box * maxY) / 2;
  const xy = v.points.map(([x, y]) => [ox + x * box, oy + y * box] as const);
  // distancia acumulada: la línea avanza a velocidad constante
  const acc = [0];
  for (let i = 1; i < xy.length; i++) acc.push(acc[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  const total = acc.at(-1) || 1;

  const frame = (ms: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "left";
    ctx.fillStyle = "#a6a6a6";
    ctx.font = `600 24px ${font}`;
    ctx.fillText("ZANCAVOLT", 60, 110);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 48px ${font}`;
    ctx.fillText(v.title.length > 26 ? `${v.title.slice(0, 25)}…` : v.title, 60, 180);

    // la línea hasta donde toque
    const t = ease(Math.min(1, ms / DRAW_MS));
    const upTo = t * total;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#262626";
    ctx.lineWidth = 10;
    ctx.beginPath();
    xy.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 10;
    ctx.beginPath();
    let head = xy[0];
    for (let i = 0; i < xy.length; i++) {
      if (acc[i] > upTo) {
        const k = (upTo - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
        head = [xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * k, xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * k];
        ctx.lineTo(head[0], head[1]);
        break;
      }
      head = xy[i];
      if (i) ctx.lineTo(xy[i][0], xy[i][1]);
      else ctx.moveTo(xy[i][0], xy[i][1]);
    }
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(xy[0][0], xy[0][1], 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // los datos aparecen al acabar la línea
    const alpha = Math.max(0, Math.min(1, (ms - DRAW_MS + 400) / 600));
    ctx.globalAlpha = alpha;
    const colW = (W - 120) / Math.max(1, v.stats.length);
    v.stats.forEach((s, i) => {
      const x = 60 + colW * i + colW / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = "#a6a6a6";
      ctx.font = `500 24px ${font}`;
      ctx.fillText(s.label.toUpperCase(), x, 1040);
      ctx.fillStyle = "#ffffff";
      // la cifra, tan grande como quepa en su columna
      let size = v.stats.length > 2 ? 52 : 64;
      ctx.font = `700 ${size}px ${font}`;
      while (size > 28 && ctx.measureText(s.value).width > colW - 16) ctx.font = `700 ${(size -= 2)}px ${font}`;
      ctx.fillText(s.value, x, 1110);
    });
    ctx.globalAlpha = 1;
  };

  frame(0);
  const stream = canvas.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const ms = performance.now() - t0;
      frame(ms);
      if (ms < DRAW_MS + HOLD_MS) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
  return new File(chunks, `run-in-out.${ext}`, { type: type.split(";")[0] });
}
