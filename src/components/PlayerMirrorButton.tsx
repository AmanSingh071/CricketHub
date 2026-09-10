"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { Peer?: any; }
}

const PEER_SCRIPT = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";

function loadPeerJS() {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Browser only"));
    if (window.Peer) return resolve(window.Peer);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PEER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Peer));
      existing.addEventListener("error", () => reject(new Error("Could not load TV mirroring service")));
      return;
    }
    const script = document.createElement("script");
    script.src = PEER_SCRIPT;
    script.async = true;
    script.onload = () => window.Peer ? resolve(window.Peer) : reject(new Error("TV mirroring service did not load"));
    script.onerror = () => reject(new Error("Could not load TV mirroring service"));
    document.head.appendChild(script);
  });
}

function newCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

export default function PlayerMirrorButton({ channelName }: { channelName: string }) {
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "creating" | "waiting" | "connecting" | "mirroring" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    try { callRef.current?.close(); } catch {}
    try { peerRef.current?.destroy(); } catch {}
  }, []);

  async function prepare() {
    setOpen(true); setStatus("creating"); setError("");
    try {
      const Peer = await loadPeerJS();
      const nextCode = newCode();
      // Sender gets a random PeerJS id. The 6-digit code belongs to the TV receiver.
      const peer = new Peer(undefined, { secure: true });
      peerRef.current = peer;
      peer.on("open", () => { setCode(nextCode); setStatus("waiting"); });
      peer.on("error", (err: any) => {
        setError(err?.message || "TV connection failed. Please try again.");
        setStatus("error");
      });
      peer.on("disconnected", () => {
        if (peerRef.current === peer) setError("The TV signalling connection was lost. Keep both devices online and try again.");
      });
    } catch (err: any) {
      setError(err?.message || "TV mirroring is unavailable in this browser.");
      setStatus("error");
    }
  }

  async function startMirroring() {
    setError(""); setStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen mirroring is not supported by this browser. Try the latest Chrome or Edge.");

      // Hide the setup UI before the browser capture picker opens, so the dialog is not mirrored.
      setOpen(false);
      await new Promise(requestAnimationFrame);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
      });
      streamRef.current = stream;

      const peer = peerRef.current;
      if (!peer) throw new Error("The TV session expired. Open Mirror to TV again.");
      const call = peer.call(`ch-${code}`, stream, { metadata: { channelName } });
      callRef.current = call;
      call.on("error", () => {
        setError("The TV connection dropped. Keep both devices online and try again.");
        setStatus("error");
      });
      call.on("close", () => setStatus("waiting"));
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        try { call.close(); } catch {}
        stream.getTracks().forEach(track => track.stop());
        setStatus("waiting");
      });
      setStatus("mirroring");
    } catch (err: any) {
      setOpen(true);
      setError(err?.name === "NotAllowedError" ? "Screen sharing was cancelled. Click Start mirroring and choose this browser tab." : err?.message || "Could not start TV mirroring.");
      setStatus("waiting");
    }
  }

  function stopMirroring() {
    try { callRef.current?.close(); } catch {}
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null; callRef.current = null; setStatus("waiting");
  }

  function close() {
    if (status === "mirroring") stopMirroring();
    else { try { peerRef.current?.destroy(); } catch {} peerRef.current = null; }
    setOpen(false); setError(""); setStatus("idle");
  }

  const active = status === "mirroring";

  return <>
    <button type="button" onClick={active ? stopMirroring : prepare}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition ${active ? "border-green-400/50 bg-green-500/10 text-green-300" : "border-[#29445e] bg-white/[.04] text-slate-200 hover:border-green-400/50 hover:text-green-300"}`}
      aria-label={active ? "Stop TV mirroring" : "Mirror player to TV"}>
      <span className="text-base">{active ? "⏹" : "📺"}</span>{active ? "Stop TV" : "Mirror to TV"}
    </button>

    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Mirror player to TV">
      <div className="w-full max-w-md rounded-3xl border border-[#29445e] bg-[#081321] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black tracking-[.18em] text-green-400">TV MIRROR</p><h2 className="mt-2 text-2xl font-black">Watch on your TV</h2><p className="mt-2 text-sm text-slate-400">{channelName}</p></div>
          <button type="button" onClick={close} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-white/[.06]" aria-label="Close">×</button>
        </div>

        {status === "creating" && <div className="mt-8 rounded-2xl bg-white/[.04] p-6 text-center"><div className="text-3xl">⏳</div><p className="mt-3 font-bold">Preparing TV connection…</p></div>}

        {(status === "waiting" || status === "connecting") && <>
          <div className="mt-7 rounded-2xl border border-green-400/20 bg-green-500/[.05] p-5 text-center">
            <p className="text-xs font-black uppercase tracking-[.18em] text-slate-500">Enter this code on your TV</p>
            <p className="mt-3 select-all text-5xl font-black tracking-[.22em] text-green-300">{code}</p>
          </div>
          <ol className="mt-5 space-y-2 text-sm text-slate-300">
            <li><b>1.</b> Open <span className="font-bold text-white">CricketHub /tv</span> on the TV browser.</li>
            <li><b>2.</b> Enter the 6-digit code above and press Connect.</li>
            <li><b>3.</b> Click <b>Start mirroring</b> here.</li>
            <li><b>4.</b> Choose <b>This tab</b> in the browser picker and enable tab audio if offered.</li>
          </ol>
          {status === "connecting" && <p className="mt-5 text-center text-sm font-bold text-sky-300">Waiting for the screen-share permission…</p>}
          <button type="button" onClick={startMirroring} disabled={status === "connecting"} className="mt-6 w-full rounded-xl bg-green-500 px-5 py-3 font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{status === "connecting" ? "Choose this tab…" : "Start mirroring"}</button>
        </>}

        {status === "mirroring" && <div className="mt-8 rounded-2xl border border-green-400/20 bg-green-500/[.05] p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-2xl">📺</div><h3 className="mt-4 text-xl font-black">Mirroring to TV</h3><p className="mt-2 text-sm text-slate-400">The player tab is being sent directly to the TV.</p><button type="button" onClick={stopMirroring} className="mt-5 rounded-xl border border-red-400/30 px-5 py-3 font-black text-red-300">Stop mirroring</button></div>}

        {status === "error" && <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-500/[.05] p-5"><p className="font-black text-red-300">Could not start TV mirroring</p><p className="mt-2 text-sm text-slate-400">{error}</p><button type="button" onClick={prepare} className="mt-4 rounded-xl bg-white/[.08] px-4 py-2 font-bold">Try again</button></div>}
        {error && status !== "error" && <p className="mt-4 rounded-xl bg-red-500/[.06] p-3 text-sm text-red-300">{error}</p>}
        <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">The screen stream is sent peer-to-peer after the TV connects. The video does not pass through CricketHub's server.</p>
      </div>
    </div>}
  </>;
}
