"use client";

import { useEffect, useRef, useState } from "react";

declare global { interface Window { Peer?: any } }

const PEER_SCRIPT = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";

function loadPeerJS() {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Browser only"));
    if (window.Peer) return resolve(window.Peer);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PEER_SCRIPT}"]`);
    if (existing) { existing.addEventListener("load", () => resolve(window.Peer), { once: true }); existing.addEventListener("error", () => reject(new Error("Could not load TV connection service")), { once: true }); return; }
    const script = document.createElement("script"); script.src = PEER_SCRIPT; script.async = true;
    script.onload = () => window.Peer ? resolve(window.Peer) : reject(new Error("TV connection service did not load"));
    script.onerror = () => reject(new Error("Could not load TV connection service"));
    document.head.appendChild(script);
  });
}

export default function TVMirrorReceiver() {
  const videoRef = useRef<HTMLVideoElement>(null), peerRef = useRef<any>(null), callRef = useRef<any>(null), streamRef = useRef<MediaStream | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Enter the code shown on your phone or computer.");
  const [connected, setConnected] = useState(false);

  function cleanup() {
    try { callRef.current?.close(); } catch {}
    try { peerRef.current?.destroy(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    callRef.current = null; peerRef.current = null; streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setConnected(false);
  }

  useEffect(() => cleanup, []);

  async function connect() {
    const clean = code.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) { setStatus("Enter the 6-digit code first."); return; }
    cleanup(); setCode(clean); setStatus("Connecting to CricketHub…");
    try {
      const Peer = await loadPeerJS();
      const peer = new Peer(`ch-${clean}`, { secure: true }); peerRef.current = peer;
      peer.on("open", () => setStatus("TV ready. Waiting for the player…"));
      peer.on("call", (call: any) => {
        callRef.current = call;
        call.answer();
        call.on("stream", async (stream: MediaStream) => {
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = false; try { await videoRef.current.play(); } catch {} }
          setConnected(true); setStatus("Playing CricketHub on this TV");
        });
        call.on("close", () => { setConnected(false); if (videoRef.current) videoRef.current.srcObject = null; setStatus("Connection ended. Enter a new code to reconnect."); });
        call.on("error", () => { setConnected(false); setStatus("The connection dropped. Try the code again."); });
      });
      peer.on("error", (err: any) => { setConnected(false); setStatus(err?.type === "unavailable-id" ? "That TV code is no longer active. Enter a fresh code." : "Could not connect. Check both devices are online and try again."); });
    } catch (err: any) { setStatus(err?.message || "Could not start TV connection."); }
  }

  if (connected) return <main className="fixed inset-0 bg-black"><video ref={videoRef} className="h-full w-full object-contain" playsInline autoPlay controls={false} /><div className="pointer-events-none fixed left-5 bottom-5 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/70">🏏 CricketHub • TV</div></main>;

  return <main className="fixed inset-0 flex items-center justify-center bg-black p-6 text-white"><div className="w-full max-w-xl text-center"><div className="text-6xl">🏏</div><h1 className="mt-5 text-5xl font-black"><span className="text-green-400">CricketHub</span> TV</h1><p className="mt-4 text-xl text-slate-400">Connect this TV to your player</p><input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={e => { if (e.key === "Enter") void connect(); }} placeholder="6-digit code" className="mt-8 w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-5 text-center text-4xl font-black tracking-[.25em] outline-none focus:border-green-400" /><button onClick={() => void connect()} className="mt-5 w-full rounded-2xl bg-green-500 px-6 py-5 text-xl font-black text-black hover:bg-green-400">Connect TV</button><p className="mt-5 text-sm text-slate-500">{status}</p></div></main>;
}
