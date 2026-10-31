import { ImageResponse } from "next/og";
import { getUserId } from "@/lib/session";
import { readDbNow as getDb } from "@/lib/db";
import { ACCENT, shareCard, type ShareCard } from "@/lib/shareCard";
import { intlLocale, isLocale } from "@/lib/i18n";

const LOGO = (
  <svg width="56" height="56" viewBox="0 0 64 64" style={{ marginRight: 18 }}>
    <rect width="64" height="64" rx="14" fill={ACCENT} />
    <path d="M14 46l12-20 8 12 6-8 10 16z" fill="#000" />
  </svg>
);
// texto blanco legible encima de cualquier foto
const SHADOW = "0 2px 10px rgba(0,0,0,0.55)";

/** Sticker sin fondo (1080 de ancho): el dibujo y los datos grandes, para pegarlo en una historia encima de una foto. */
function sticker(c: ShareCard) {
  const strength = c.kind === "fuerza";
  const stats = c.stats.slice(0, 3);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", color: "#fff", padding: "30px 40px" }}>
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- imagen generada (Satori)
          <img src={c.image} width={strength ? 700 : 960} height={strength ? 735 : 760} style={{ objectFit: "contain" }} />
        ) : null}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-around", marginTop: c.image ? 30 : 0 }}>
          {stats.map((st) => (
            <div key={st.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", textShadow: SHADOW }}>
              <div style={{ fontSize: 30, letterSpacing: 2, textTransform: "uppercase" }}>{st.label}</div>
              <div style={{ fontSize: stats.length > 2 ? 76 : 96, fontWeight: 700, letterSpacing: -1 }}>{st.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 26, fontSize: 30, letterSpacing: 3, textShadow: SHADOW }}>
          {LOGO}
          ZANCAVOLT
        </div>
      </div>
    ),
    { width: 1080, height: c.image ? (strength ? 1110 : 1140) : 380, headers: { "Cache-Control": "private, no-store" } },
  );
}

// Imagen de un entreno propio para Instagram o WhatsApp: de historia (1080 × 1920) o, con ?formato=sticker, sin fondo.
export async function GET(req: Request, { params }: RouteContext<"/api/compartir/[id]">) {
  const uid = await getUserId();
  if (!uid) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const { id } = await params;
  const db = await getDb(uid);
  const a = db.activities.find((x) => x.id === decodeURIComponent(id));
  if (!a) return Response.json({ error: "No existe" }, { status: 404 });
  // en el idioma de la app de quien lo comparte
  const locale = isLocale(db.lang) ? db.lang : "es";
  if (new URL(req.url).searchParams.get("formato") === "sticker") return sticker(shareCard(db, a, "sticker", locale));
  const c = shareCard(db, a, "historia", locale);
  const date = new Date(`${c.date}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const strength = c.kind === "fuerza";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#000000", color: "#ffffff", padding: "110px 80px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, color: "#a6a6a6", letterSpacing: 2 }}>
          {LOGO}
          ZANCAVOLT
        </div>
        <div style={{ marginTop: 70, fontSize: 36, color: "#a6a6a6" }}>{date}</div>
        {/* título largo (p. ej. en francés): más pequeño, para que no se monte sobre la imagen */}
        <div style={{ marginTop: 14, fontSize: c.title.length > 22 ? 64 : 84, lineHeight: 1.05, letterSpacing: -2, display: "flex" }}>{c.title}</div>
        {c.subtitle && <div style={{ marginTop: 16, fontSize: 40, color: ACCENT }}>{c.subtitle}</div>}

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "50px 0" }}>
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- imagen generada (Satori)
            <img src={c.image} width={strength ? 830 : 920} height={strength ? 870 : 860} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 220, color: ACCENT, letterSpacing: -6 }}>{c.stats[0]?.value}</div>
          )}
        </div>

        {c.lines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 40 }}>
            {c.lines.map((l) => (
              <div key={l} style={{ fontSize: 34, color: "#d0d0d0", marginTop: 8, display: "flex" }}>
                {l}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", borderTop: "2px solid #262626", paddingTop: 40 }}>
          {c.stats.map((s) => (
            <div key={s.label} style={{ width: "50%", display: "flex", flexDirection: "column", marginBottom: 34 }}>
              <div style={{ fontSize: 30, color: "#a6a6a6" }}>{s.label}</div>
              <div style={{ fontSize: 66, letterSpacing: -1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1080, height: 1920, headers: { "Cache-Control": "private, no-store" } },
  );
}
