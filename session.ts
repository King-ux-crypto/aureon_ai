import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
// Session sans état : la clé Groq est chiffrée (AES-256-GCM) dans un cookie httpOnly.
// Compatible Vercel/serverless. Jamais en localStorage, jamais dans une URL ni un log.
type S = { key: string; exp: number; hits: number[] };
const TTL = 1000 * 60 * 60 * 8;
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (32+ caractères) manquant.");
    return createHash("sha256").update("dev-only-secret").digest();
  }
  return createHash("sha256").update(s).digest();
};
const seal = (o: object) => {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", secret(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(o), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
};
const open = (t: string): { key: string; exp: number } | null => {
  try {
    const b = Buffer.from(t, "base64url"), d = createDecipheriv("aes-256-gcm", secret(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  } catch { return null; }
};
const g = globalThis as unknown as { __h?: Map<string, number[]> };
const hitsMap = (g.__h ??= new Map<string, number[]>());
export async function createSession(key: string) {
  (await cookies()).set("aureon_sid", seal({ key, exp: Date.now() + TTL }), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL / 1000 });
}
export async function getSession(): Promise<S | null> {
  const t = (await cookies()).get("aureon_sid")?.value;
  const d = t ? open(t) : null;
  if (!t || !d || d.exp < Date.now()) return null;
  const id = createHash("sha256").update(t).digest("hex");
  return { key: d.key, exp: d.exp, hits: hitsMap.get(id) ?? (hitsMap.set(id, []), hitsMap.get(id)!) };
}
export async function destroySession() { (await cookies()).delete("aureon_sid"); }
export function allow(s: S, max = 30) {
  const now = Date.now(); const h = s.hits.filter(t => now - t < 60000);
  s.hits.length = 0; s.hits.push(...h);
  if (s.hits.length >= max) return false; s.hits.push(now); return true;
}
