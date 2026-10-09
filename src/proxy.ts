import { NextResponse, type NextRequest } from "next/server";

// Protección con contraseña (autenticación básica del navegador) cuando se define APP_PASSWORD.
// En local, sin APP_PASSWORD, la app queda abierta como siempre.
export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
  }
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="StatsRun", charset="UTF-8"' },
  });
}

export const config = {
  // todo salvo los estáticos, el icono y el manifest (los pide el navegador sin credenciales)
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|manifest.webmanifest).*)"],
};
