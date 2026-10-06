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
  const res = await fetch(`${url}/set/lodosa_db`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(db),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Error escribiendo en KV:", res.status, text);
  }
}

async function writeLocalFile(db: DB) {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_PATH);
  } catch (err) {
    console.warn("No se pudo escribir en el sistema de archivos local:", err);
  }
}

async function readLocalFile(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as DB;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const db = seed();
      await writeLocalFile(db);
      return db;
    }
    throw err;
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
  const kv = getKvConfig();
  if (kv) {
    const remote = await readKv(kv.url, kv.token);
    if (remote) return remote;
    const local = await readLocalFile();
    await writeKv(kv.url, kv.token, local);
    return local;
  }
  return readLocalFile();
}

/** Lectura para páginas: siempre en tiempo de petición (datos frescos). */
export async function getDB(): Promise<DB> {
  await connection();
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
