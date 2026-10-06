import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Si la petición a un Server Action o formulario POST no trae la cabecera 'origin'
  // (típico en envíos de formularios nativos, curl o peticiones a través de proxies/túneles),
  // Next.js muestra la advertencia:
  // "Missing `origin` header from a forwarded Server Actions request".
  // Derivamos el 'origin' a partir de los datos del host de la petición.
  if (!requestHeaders.get("origin")) {
    const host =
      requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      requestHeaders.get("host") ||
      request.nextUrl.host;
    const proto =
      requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      request.nextUrl.protocol.replace(":", "") ||
      "http";

    if (host) {
      requestHeaders.set("origin", `${proto}://${host}`);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Aplicar a todas las rutas excepto archivos estáticos internos de Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
