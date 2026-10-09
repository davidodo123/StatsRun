import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "sr_session";
const PUBLIC = ["/login", "/registro"];

// Sin sesión, a /login. Aquí solo se mira que exista la cookie; la firma se verifica en el servidor
// al leer los datos (requireUserId), que también manda a /login si no es válida.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p)) return NextResponse.next();
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // todo salvo los estáticos, el icono y el manifest (los pide el navegador sin credenciales)
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|manifest.webmanifest).*)"],
};
