import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getActaPhotoStorage } from "@/lib/acta-storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  // Exclusivo: solo el administrador autenticado puede ver la foto del acta
  const admin = await isAdmin();
  if (!admin) {
    return new NextResponse("Acceso restringido: Solo el administrador oficial puede ver las fotografías de las actas.", {
      status: 403,
    });
  }

  const { matchId } = await params;
  const photo = await getActaPhotoStorage(matchId);

  if (!photo) {
    return new NextResponse("No hay fotografía física guardada para este acta.", {
      status: 404,
    });
  }

  // Si está almacenada como Data URL (ej. data:image/jpeg;base64,...)
  const match = photo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600, no-transform",
      },
    });
  }

  return new NextResponse(photo, {
    headers: { "Content-Type": "text/plain" },
  });
}
