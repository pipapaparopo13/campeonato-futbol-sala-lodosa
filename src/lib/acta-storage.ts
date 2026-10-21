import { promises as fs } from "fs";
import path from "path";

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

const LOCAL_ACTAS_DIR = path.join(process.cwd(), "data", "actas");

/**
 * Guarda la fotografía física del acta en KV o en el sistema local de archivos.
 * Formato esperado: string dataUrl (data:image/jpeg;base64,...)
 */
export async function saveActaPhotoStorage(matchId: string, dataUrl: string): Promise<void> {
  const kv = getKvConfig();
  if (kv) {
    try {
      const res = await fetch(`${kv.url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kv.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", `acta_photo_${matchId}`, dataUrl]),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("Error guardando foto del acta en KV:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Error conectando con KV para guardar foto:", err);
    }
  }

  // Guardado local de respaldo si el entorno lo permite
  try {
    await fs.mkdir(LOCAL_ACTAS_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_ACTAS_DIR, `${matchId}.txt`), dataUrl, "utf8");
  } catch {
    // Ignorar en entornos de solo lectura
  }
}

/**
 * Recupera la fotografía del acta física como dataUrl (data:image/jpeg;base64,...)
 */
export async function getActaPhotoStorage(matchId: string): Promise<string | null> {
  const kv = getKvConfig();
  if (kv) {
    try {
      const res = await fetch(`${kv.url}/get/acta_photo_${matchId}`, {
        headers: { Authorization: `Bearer ${kv.token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          return typeof data.result === "string" ? data.result : JSON.stringify(data.result);
        }
      }
    } catch (err) {
      console.error("Error leyendo foto de acta de KV:", err);
    }
  }

  try {
    return await fs.readFile(path.join(LOCAL_ACTAS_DIR, `${matchId}.txt`), "utf8");
  } catch {
    return null;
  }
}

/**
 * Elimina la fotografía del acta de KV y del disco local.
 */
export async function deleteActaPhotoStorage(matchId: string): Promise<void> {
  const kv = getKvConfig();
  if (kv) {
    try {
      await fetch(`${kv.url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kv.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["DEL", `acta_photo_${matchId}`]),
        cache: "no-store",
      });
    } catch (err) {
      console.error("Error eliminando foto de KV:", err);
    }
  }

  try {
    await fs.unlink(path.join(LOCAL_ACTAS_DIR, `${matchId}.txt`));
  } catch {
    // Ignorar si el archivo no existe
  }
}
