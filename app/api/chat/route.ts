import { getSession, allow } from "@/lib/session";
const P: Record<string, string> = {
  AUREON: "Tu es AUREON, assistant universel de luxe. Réponds avec précision, élégance et concision, dans la langue de l'utilisateur.",
  ATLAS: "Tu es ATLAS, expert scientifique rigoureux. Explique avec exactitude et indique les incertitudes.",
  NOVA: "Tu es NOVA, intelligence créative. Propose des idées originales et audacieuses.",
  TITAN: "Tu es TITAN, expert en programmation. Donne du code correct, commenté et testé mentalement.",
  SOVEREIGN: "Tu es SOVEREIGN, stratège business. Structure, chiffre et priorise.",
  ORION: "Tu es ORION, professeur personnel patient. Explique par étapes et vérifie la compréhension.",
  ELITE: "Tu es ELITE, expert en productivité et organisation. Donne des plans d'action concrets."
};
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Session expirée." }, { status: 401 });
  if (!allow(s)) return Response.json({ error: "Trop de requêtes, patiente une minute." }, { status: 429 });
  const { model, persona, messages } = await req.json();
  if (!Array.isArray(messages) || typeof model !== "string") return Response.json({ error: "Requête invalide." }, { status: 400 });
  const clean = messages.slice(-40).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 20000) }));
  let r: Response;
  try {
    r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${s.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: true, messages: [{ role: "system", content: P[persona] ?? P.AUREON }, ...clean] }) });
  } catch { return Response.json({ error: "Groq est injoignable." }, { status: 502 }); }
  if (!r.ok || !r.body) {
    const msg = r.status === 429 ? "Quota Groq dépassé." : r.status === 401 ? "Clé révoquée." : `Erreur Groq (${r.status}).`;
    return Response.json({ error: msg }, { status: r.status });
  }
  return new Response(r.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}
