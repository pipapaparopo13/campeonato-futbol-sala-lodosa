import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { connection } from "next/server";
import type { DB } from "./types";

/**
 * Almacenamiento sencillo en un fichero JSON (data/db.json).
 * Suficiente para un campeonato de 10 equipos con un único editor.
 */
const DB_PATH =
  process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json");

const TEAM_COLORS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#4b5563",
  "#65a30d",
];

export function newId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function seed(): DB {
  return {
    settings: {
      name: "Campeonato de Fútbol Sala de Lodosa",
      season: String(new Date().getFullYear()),
      location: "Lodosa (Navarra)",
      defaultVenue: "Polideportivo Municipal de Lodosa",
    },
    teams: TEAM_COLORS.map((color, i) => ({
      id: newId(),
      name: `Equipo ${i + 1}`,
      shortName: `E${i + 1}`,
      color,
      delegate: "",
    })),
    players: [],
    matches: [],
  };
}

import initialData from "../../data/db.json";

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

async function readKv(url: string, token: string): Promise<DB | null> {
  try {
    const res = await fetch(`${url}/get/lodosa_db`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result) return null;
    if (typeof data.result === "string") {
      return JSON.parse(data.result) as DB;
    }
    return data.result as DB;
  } catch (err) {
    console.error("Error leyendo de KV:", err);
    return null;
  }
}

async function writeKv(url: string, token: string, db: DB): Promise<void> {
  try {
    // Usar la sintaxis oficial de Upstash REST: POST / con array ["SET", key, value]
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", "lodosa_db", JSON.stringify(db)]),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Error escribiendo en KV:", res.status, text);
    }
  } catch (err) {
    console.error("Error conectando con KV:", err);
  }
}

async function writeLocalFile(db: DB) {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_PATH);
  } catch {
    // Ignorar en entornos de solo lectura como Vercel
  }
}

async function readLocalFile(): Promise<DB | null> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    return null;
  }
}

async function writeRaw(db: DB) {
  const kv = getKvConfig();
  if (kv) {
    await writeKv(kv.url, kv.token, db);
    return;
  }
  await writeLocalFile(db);
}

async function readRaw(): Promise<DB> {
  try {
    const kv = getKvConfig();
    if (kv) {
      const remote = await readKv(kv.url, kv.token);
      if (remote && remote.teams && remote.teams.length > 0) {
        // Si la base de datos remota aún tiene los nombres por defecto "Equipo 1",
        // sincronizar automáticamente con los nombres oficiales y plantillas de initialData
        const hasGenericNames = remote.teams.some((t) => /^Equipo \d+$/.test(t.name));
        if (hasGenericNames) {
          const official = initialData as DB;
          // Actualizar nombres y colores
          for (let i = 0; i < remote.teams.length; i++) {
            if (official.teams[i]) {
              remote.teams[i].name = official.teams[i].name;
              remote.teams[i].shortName = official.teams[i].shortName;
              remote.teams[i].color = official.teams[i].color;
            }
          }
          // Si no tenía jugadores, cargar los 140 jugadores oficiales vinculándolos a los ids de equipos
          if (!remote.players || remote.players.length === 0) {
            remote.players = official.players;
          }
          await writeKv(kv.url, kv.token, remote);
        }
        return remote;
      }
      // Primera vez con KV: volcar datos iniciales
      const local = (await readLocalFile()) || (initialData as DB);
      await writeKv(kv.url, kv.token, local);
      return local;
    }
    const local = await readLocalFile();
    return local || (initialData as DB);
  } catch (err) {
    console.error("Error en lectura de base de datos:", err);
    return initialData as DB;
  }
}

/** Lectura para páginas: siempre en tiempo de petición (datos frescos). */
export async function getDB(): Promise<DB> {
  try {
    await connection();
  } catch {
    // Evitar fallos de contexto
  }
  return readRaw();
}

let queue: Promise<unknown> = Promise.resolve();

/** Modifica la base de datos de forma serializada (evita escrituras simultáneas). */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readRaw();
    const result = await fn(db);
    await writeRaw(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}
