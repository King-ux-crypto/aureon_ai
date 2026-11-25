"use client";
import { useRef, useState } from "react";
type Msg = { role: "user" | "assistant"; content: string };
const PERSONAS = ["AUREON", "ATLAS", "NOVA", "TITAN", "SOVEREIGN", "ORION", "ELITE"];
export default function Home() {
  const [key, setKey] = useState(""); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [models, setModels] = useState<string[] | null>(null);
  const [model, setModel] = useState(""); const [persona, setPersona] = useState("AUREON");
  const [msgs, setMsgs] = useState<Msg[]>([]); const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false); const end = useRef<HTMLDivElement>(null);

  async function unlock() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      setKey(""); setModels(d.models);
      setModel(d.models.includes("llama-3.3-70b-versatile") ? "llama-3.3-70b-versatile" : d.models[0]);
    } catch { setErr("Erreur réseau."); } finally { setBusy(false); }
  }
  async function logout() { await fetch("/api/logout", { method: "POST" }); setModels(null); setMsgs([]); }
  async function send() {
    if (!input.trim() || streaming) return;
    const next: Msg[] = [...msgs, { role: "user", content: input }, { role: "assistant", content: "" }];
    setMsgs(next); setInput(""); setStreaming(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, persona, messages: next.slice(0, -1) }) });
      if (!r.ok || !r.body) { const d = await r.json().catch(() => ({ error: "Erreur." })); if (r.status === 401) setModels(null); fail(d.error); return; }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "", acc = "";
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data: ") || l.includes("[DONE]")) continue;
          try { acc += JSON.parse(l.slice(6)).choices?.[0]?.delta?.content ?? ""; } catch {}
        }
        setMsgs(m => [...m.slice(0, -1), { role: "assistant", content: acc }]);
        end.current?.scrollIntoView();
      }
    } catch { fail("Erreur réseau."); } finally { setStreaming(false); }
  }
  const fail = (e: string) => setMsgs(m => [...m.slice(0, -1), { role: "assistant", content: "⚠ " + e }]);

  if (!models) return (<>
    <div className="bg" style={{ backgroundImage: "url(/img/lamborghini.png)" }} />
    <div className="center"><div className="glass login">
      <img className="logo" src="/img/logo.gif" alt="" />
      <h1>AUREON AI</h1><p className="sub">Your intelligence. Your empire.</p>
      <div className="row"><input type={show ? "text" : "password"} placeholder="Clé API Groq (gsk_…)" value={key}
        autoComplete="off" onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === "Enter" && unlock()} />
        <button className="ghost" onClick={() => setShow(!show)}>{show ? "Masquer" : "Afficher"}</button></div>
      <button className="gold" disabled={busy || !key} onClick={unlock}>{busy ? "CONNEXION…" : "UNLOCK AUREON"}</button>
      {err && <div className="err">{err}</div>}
      <p style={{ marginTop: 20, fontSize: 13 }}><a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Créer une clé API Groq</a></p>
    </div></div></>);

  return (<>
    <div className="bg" style={{ backgroundImage: "url(/img/office.png)" }} />
    <div className="app">
      <aside className="side"><h1 style={{ fontSize: 16 }}>AUREON</h1>
        <div className="pers">{PERSONAS.map(p => <button key={p} className={p === persona ? "on" : ""} onClick={() => setPersona(p)}>{p}</button>)}</div>
        <select value={model} onChange={e => setModel(e.target.value)}>{models.map(m => <option key={m}>{m}</option>)}</select>
        <button className="ghost" style={{ padding: 10 }} onClick={() => setMsgs([])}>Nouvelle conversation</button>
        <button className="ghost" style={{ padding: 10, marginTop: "auto" }} onClick={logout}>Déconnexion</button></aside>
      <main className="main"><div className="msgs">
        {!msgs.length && <div className="hero">What would you like to achieve today?</div>}
        {msgs.map((m, i) => <div key={i} className={"m glass " + (m.role === "user" ? "u" : "a")}>{m.content || "…"}</div>)}
        <div ref={end} /></div>
        <div className="bar"><textarea rows={2} value={input} placeholder="Demande n'importe quoi…" onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="ghost" onClick={send} disabled={streaming}>Envoyer</button></div></main>
    </div></>);
}
