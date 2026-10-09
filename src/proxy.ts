import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "sr_session";
// pantalla de entrada, vuelta de Google, política de privacidad (Google la pide pública)
// y el atajo de Salud del iPhone, que se autentica con su propia clave
const isPublic = (p: string) => p === "/login" || p.startsWith("/login/") || p.startsWith("/api/auth/") || p === "/privacidad" || p === "/api/salud";

// Sin sesión, a /login. Aquí solo se mira que exista la cookie; la firma se verifica en el servidor
// al leer los datos (requireUserId), que también manda a /login si no es válida.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // todo salvo los estáticos, iconos, imágenes de public, manifest, service worker y pantalla sin conexión (los pide el navegador sin credenciales)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:png|svg|webp)$).*)"],
};
