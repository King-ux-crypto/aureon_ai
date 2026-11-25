import { createSession } from "@/lib/session";
export async function POST(req: Request) {
  const { key } = await req.json().catch(() => ({ key: "" }));
  if (typeof key !== "string" || !/^gsk_[A-Za-z0-9]{20,}$/.test(key.trim()))
    return Response.json({ error: "Format de clé invalide (elle commence par gsk_)." }, { status: 400 });
  let r: Response;
  try { r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key.trim()}` } }); }
  catch { return Response.json({ error: "Groq est injoignable (réseau)." }, { status: 502 }); }
  if (r.status === 401) return Response.json({ error: "Clé API incorrecte." }, { status: 401 });
  if (r.status === 429) return Response.json({ error: "Quota dépassé. Réessaie plus tard." }, { status: 429 });
  if (!r.ok) return Response.json({ error: `Erreur Groq (${r.status}).` }, { status: 502 });
  const d = await r.json();
  const models: string[] = (d.data ?? []).map((m: { id: string }) => m.id)
    .filter((id: string) => !/whisper|tts|guard|playai/i.test(id)).sort();
  await createSession(key.trim());
  return Response.json({ models });
}
