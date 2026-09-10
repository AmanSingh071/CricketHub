"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global { interface Window { Peer?: any } }

const PEER_SCRIPT = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";

function loadPeerJS() {
  return new Promise<any>((resolve, reject) => {
    if (window.Peer) return resolve(window.Peer);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PEER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Peer));
      existing.addEventListener("error", () => reject(new Error("Could not load TV connection service")));
      return;
    }
    const script = document.createElement("script");
    script.src = PEER_SCRIPT;
    script.async = true;
    script.onload = () => window.Peer ? resolve(window.Peer) : reject(new Error("TV connection service did not load"));
    script.onerror = () => reject(new Error("Could not load TV connection service"));
    document.head.appendChild(script);
  });
}

export default function TVMirrorReceiver() {
  const params = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "connecting" | "ready" | "playing" | "error">("idle");
  const [message, setMessage] = useState("");

  async function connect(receiverCode: string) {
    const clean = receiverCode.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) { setMessage("Enter the 6-digit code shown on the player."); return; }
    try {
      try { peerRef.current?.destroy(); } catch {}
      setState("connecting"); setMessage("Connecting to the player…"); setCode(clean);
      const Peer = await loadPeerJS();
      const peer = new Peer(`ch-${clean}`, { secure: true });
      peerRef.current = peer;

      peer.on("open", () => {
        setState("ready");
        setMessage("TV is ready. Start mirroring from the player.");
      });

      peer.on("call", (call: any) => {
        callRef.current = call;
        call.answer();
        call.on("stream", (stream: MediaStream) => {
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          video.play().catch(() => setMessage("Press the play button on the TV to start the mirrored stream."));
          setState("playing");
          setMessage("Mirroring is active.");
        });
        call.on("close", () => {
          if (videoRef.current) videoRef.current.srcObject = null;
          setState("ready");
          setMessage("Mirroring stopped. Start it again from the player.");
        });
        call.on("error", () => {
          setState("error");
          setMessage("The player disconnected. Connect again using a new code.");
        });
      });

      peer.on("error", (err: any) => {
        setState("error");
        setMessage(err?.type === "unavailable-id" ? "This TV code is already in use. Generate a new code on the player." : (err?.message || "Could not connect to the player."));
      });
    } catch (err: any) {
      setState("error");
      setMessage(err?.message || "Could not connect to the player.");
    }
  }

  useEffect(() => {
    const initial = params.get("code") || "";
    if (/^\d{6}$/.test(initial)) {
      setInput(initial);
      connect(initial);
    }
    return () => {
      try { callRef.current?.close(); } catch {}
      try { peerRef.current?.destroy(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <main className="min-h-screen bg-black text-white">
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
        <div><p className="text-xs font-black tracking-[.2em] text-green-400">CRICKETHUB TV</p><h1 className="mt-1 text-xl font-black md:text-2xl">TV Mirror Receiver</h1></div>
        {state === "playing" && <span className="rounded-full bg-green-500/15 px-4 py-2 text-xs font-black text-green-300">● MIRRORING</span>}
      </header>

      {state === "playing" ? <div className="flex flex-1 items-center justify-center bg-black p-0">
        <video ref={videoRef} className="max-h-screen w-full object-contain" autoPlay playsInline controls={false} />
      </div> : <div className="flex flex-1 items-center justify-center px-5 py-10">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#081321] p-7 text-center shadow-2xl md:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-500/10 text-4xl">📺</div>
          <h2 className="mt-6 text-3xl font-black">Connect this TV</h2>
          <p className="mt-3 text-slate-400">On the player, tap <b className="text-white">Mirror to TV</b> and enter the 6-digit code below.</p>
          <form onSubmit={e => { e.preventDefault(); connect(input); }} className="mt-7">
            <input value={input} onChange={e => setInput(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} className="w-full rounded-2xl border border-[#29445e] bg-black/30 px-5 py-5 text-center text-4xl font-black tracking-[.25em] text-green-300 outline-none focus:border-green-400" aria-label="6 digit TV code" />
            <button type="submit" disabled={state === "connecting"} className="mt-4 w-full rounded-2xl bg-green-500 px-5 py-4 font-black text-slate-950 disabled:opacity-50">{state === "connecting" ? "Connecting…" : "Connect TV"}</button>
          </form>
          {message && <p className={`mt-5 text-sm ${state === "error" ? "text-red-300" : "text-slate-400"}`}>{message}</p>}
          <p className="mt-7 text-xs leading-5 text-slate-600">Keep this TV page open. The video is transferred directly between the player device and this TV browser using WebRTC.</p>
        </section>
      </div>}
    </div>
  </main>;
}
