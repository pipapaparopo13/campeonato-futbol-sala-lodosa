import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "lodosa_editor";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 días

export type UserRole = "admin" | "arbitro";

export interface UserSession {
  role: UserRole;
  username: string;
}

function secret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "lodosa-futsal-session-secret"
  );
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkCredentials(
  password: string,
  userHint?: string,
): UserSession | null {
  const adminPass = process.env.ADMIN_PASSWORD || "LodosaLodosa41";
  const arbitroPass = process.env.ARBITRO_PASSWORD || "javimesa";

  const user = (userHint || "").trim().toLowerCase();

  // Si especifica usuario mesa / javi mesa / árbitro
  if (user === "arbitro" || user === "mesa" || user === "javimesa" || user === "javi") {
    if (safeEqual(password, arbitroPass)) {
      return { role: "arbitro", username: "Mesa" };
    }
    return null;
  }

  // Si especifica usuario admin / organizador
  if (user === "admin" || user === "organizador") {
    if (safeEqual(password, adminPass)) {
      return { role: "admin", username: "Organizador" };
    }
    return null;
  }

  // Si solo pone contraseña
  if (safeEqual(password, adminPass)) {
    return { role: "admin", username: "Organizador" };
  }

  if (safeEqual(password, arbitroPass)) {
    return { role: "arbitro", username: "Mesa" };
  }

  return null;
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const value = (await cookies()).get(COOKIE)?.value;
    if (!value) return null;

    const parts = value.split(".");
    if (parts.length !== 4) return null;
    const [exp, role, usernameEnc, sig] = parts;
    if (!exp || !role || !usernameEnc || !sig) return null;

    const payload = `${exp}.${role}.${usernameEnc}`;
    if (!safeEqual(sig, sign(payload))) return null;
    if (Number(exp) <= Date.now()) return null;

    const validRoles: UserRole[] = ["admin", "arbitro"];
    if (!validRoles.includes(role as UserRole)) return null;

    return {
      role: role as UserRole,
      username: decodeURIComponent(usernameEnc),
    };
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

export async function isEditorOrReferee(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/** Acceso a gestión de actas (organizador o árbitro). */
export async function requireEditorOrReferee() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Acceso exclusivo de administración general (solo organizador). */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");
  return session;
}

export async function createSession(session: UserSession) {
  const exp = String(Date.now() + MAX_AGE_S * 1000);
  const usernameEnc = encodeURIComponent(session.username);
  const payload = `${exp}.${session.role}.${usernameEnc}`;
  const sig = sign(payload);

  (await cookies()).set(COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
