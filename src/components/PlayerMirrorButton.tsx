"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { Peer?: any }
}

const PEER_SCRIPT = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
const BRIDGE_URL = "http://127.0.0.1:38421";

type LanDevice = { id: string; ip: string; name: string; type: string; manufacturer?: string; model?: string };
type Platform = "android" | "ios" | "desktop";
type Status = "idle" | "mobile" | "creating" | "waiting" | "connecting" | "mirroring" | "error";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function loadPeerJS() {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Browser only"));
    if (window.Peer) return resolve(window.Peer);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PEER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Peer), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load TV connection service")), { once: true });
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

function newCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function PlayerMirrorButton({ channelName }: { channelName: string }) {
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [bridge, setBridge] = useState<"unknown" | "online" | "offline">("unknown");
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [compact, setCompact] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const update = () => {
      setPlatform(getPlatform());
      setCompact(window.innerWidth <= 768);
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      streamRef.current?.getTracks().forEach(t => t.stop());
      try { callRef.current?.close(); } catch {}
      try { peerRef.current?.destroy(); } catch {}
    };
  }, []);

  const mobile = platform !== "desktop" || compact;

  async function scanLocalTvs() {
    setScanning(true);
    setError("");
    try {
      const response = await fetch(`${BRIDGE_URL}/devices`, { cache: "no-store" } as RequestInit);
      if (!response.ok) throw new Error("Bridge returned an error");
      const data = await response.json();
      setDevices(data.devices || []);
      setBridge("online");
      if (!(data.devices || []).length) setError("No compatible LAN devices answered. Make sure the TV is awake and on the same Wi-Fi.");
    } catch {
      setBridge("offline");
      setError("LAN discovery is optional and only available from a PC running the free CricketHub TV Bridge.");
    } finally {
      setScanning(false);
    }
  }

  function openMirror() {
    setOpen(true);
    setError("");
    setCopied(false);
    setPlatform(getPlatform());
    setCompact(window.innerWidth <= 768);
    if (getPlatform() !== "desktop" || window.innerWidth <= 768) {
      setStatus("mobile");
      return;
    }
    setStatus("creating");
    void scanLocalTvs();
    void createReceiverSession();
  }

  async function createReceiverSession() {
    setError("");
    try {
      const Peer = await loadPeerJS();
      const nextCode = newCode();
      const peer = new Peer(undefined, { secure: true });
      peerRef.current = peer;
      peer.on("open", () => {
        setCode(nextCode);
        setStatus("waiting");
      });
      peer.on("error", (e: any) => {
        setError(e?.message || "TV connection failed. Try again.");
        setStatus("error");
      });
    } catch (e: any) {
      setError(e?.message || "TV mirroring is unavailable.");
      setStatus("error");
    }
  }

  async function useReceiver() {
    setStatus("creating");
    await createReceiverSession();
  }

  async function copyTvLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tv`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the TV link. Open /tv on the TV browser manually.");
    }
  }

  async function startBrowserShare() {
    setError("");
    setStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("This browser does not support browser screen sharing. Use Cast / Smart View / Screen Mirroring from your phone instead.");
      }
      setOpen(false);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        systemAudio: "include",
      } as DisplayMediaStreamOptions);
      streamRef.current = stream;
      const peer = peerRef.current;
      if (!peer) throw new Error("TV session expired. Open Mirror to TV again.");
      const call = peer.call(`ch-${code}`, stream, { metadata: { channelName, platform } });
      callRef.current = call;
      call.on("error", () => {
        setError("TV connection dropped. Keep both devices online and try again.");
        setStatus("error");
      });
      call.on("close", () => setStatus("waiting"));
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        try { call.close(); } catch {}
        stream.getTracks().forEach(t => t.stop());
        setStatus("waiting");
      });
      setStatus("mirroring");
    } catch (e: any) {
      setOpen(true);
      setError(e?.name === "NotAllowedError" ? "Screen sharing was cancelled. Choose the player tab or screen in the browser picker." : e?.message || "Could not start TV mirroring.");
      setStatus(code ? "waiting" : "mobile");
    }
  }

  function stop() {
    try { callRef.current?.close(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    callRef.current = null;
    setStatus(code ? "waiting" : "mobile");
  }

  function close() {
    if (status === "mirroring") stop();
    else {
      try { peerRef.current?.destroy(); } catch {}
      peerRef.current = null;
    }
    setOpen(false);
    setError("");
    setStatus("idle");
  }

  const active = status === "mirroring";

  return <>
    <button type="button" onClick={active ? stop : openMirror}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition ${active ? "border-green-400/50 bg-green-500/10 text-green-300" : "border-[#29445e] bg-white/[.04] text-slate-200 hover:border-green-400/50 hover:text-green-300"}`}
      aria-label={active ? "Stop TV mirroring" : "Mirror player to TV"}>
      <span>{active ? "⏹" : "📺"}</span>{active ? "Stop TV" : "Mirror to TV"}
    </button>

    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="my-2 w-full max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl border border-[#29445e] bg-[#081321] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-[.18em] text-green-400">FREE TV MIRROR</p>
            <h2 className="mt-1.5 text-2xl font-black sm:text-3xl">Watch on your TV</h2>
            <p className="mt-1.5 truncate text-sm text-slate-400">{channelName}</p>
          </div>
          <button onClick={close} className="shrink-0 px-1 text-xl text-slate-400" aria-label="Close">×</button>
        </div>

        {mobile && status === "mobile" && <>
          <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/[.06] p-4">
            <p className="font-black text-sky-200">📱 Phone → TV</p>
            <p className="mt-1 text-sm leading-5 text-slate-300">Use your phone's built-in screen mirroring for the most compatible free experience. CricketHub cannot open the system Cast/AirPlay picker from a normal website.</p>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">{platform === "android" ? "Android" : platform === "ios" ? "iPhone / iPad" : "Phone / tablet"}</p>
            {platform === "android" ? <ol className="mt-3 space-y-2 text-sm leading-5 text-slate-200">
              <li><b>1.</b> Keep the phone and TV on the same Wi-Fi.</li>
              <li><b>2.</b> Open Android Quick Settings.</li>
              <li><b>3.</b> Tap <b>Cast</b>, <b>Screen Cast</b> or <b>Smart View</b>.</li>
              <li><b>4.</b> Select your TV and start mirroring.</li>
              <li><b>5.</b> Return to CricketHub and play the match.</li>
            </ol> : platform === "ios" ? <ol className="mt-3 space-y-2 text-sm leading-5 text-slate-200">
              <li><b>1.</b> Keep the iPhone/iPad and TV on the same Wi-Fi.</li>
              <li><b>2.</b> Open Control Center.</li>
              <li><b>3.</b> Tap <b>Screen Mirroring</b> / <b>AirPlay</b>.</li>
              <li><b>4.</b> Select your compatible TV or Apple TV.</li>
              <li><b>5.</b> Return to CricketHub and play the match.</li>
            </ol> : <ol className="mt-3 space-y-2 text-sm leading-5 text-slate-200">
              <li><b>1.</b> Keep the phone/tablet and TV on the same Wi-Fi.</li>
              <li><b>2.</b> Use the device's <b>Cast</b>, <b>Screen Mirroring</b> or <b>AirPlay</b> control.</li>
              <li><b>3.</b> Select your TV.</li>
              <li><b>4.</b> Return to CricketHub and play the match.</li>
            </ol>}
          </div>

          <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-500/[.05] p-4">
            <p className="font-black text-green-300">Use CricketHub TV receiver</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">For TVs with a browser, open <b className="text-white">/tv</b> on the TV. This keeps the video peer-to-peer and uses no paid Cast service.</p>
            <button type="button" onClick={copyTvLink} className="mt-3 w-full rounded-xl bg-white/[.08] px-4 py-2.5 text-sm font-black text-white hover:bg-white/[.12]">{copied ? "✓ TV link copied" : "Copy TV receiver link"}</button>
            <button type="button" onClick={useReceiver} className="mt-2 w-full rounded-xl border border-green-400/30 px-4 py-2.5 text-sm font-black text-green-300 hover:bg-green-500/10">Use 6-digit CricketHub code</button>
          </div>
        </>}

        {status === "creating" && <div className="mt-8 p-6 text-center"><div className="text-3xl">⏳</div><p className="mt-3 font-bold">Preparing free connection…</p></div>}

        {(status === "waiting" || status === "connecting") && <>
          {!mobile && <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Free LAN discovery</p><p className="mt-1 text-sm text-slate-300">{bridge === "online" ? `${devices.length} device${devices.length === 1 ? "" : "s"} found` : bridge === "offline" ? "Optional PC bridge not running" : "Checking…"}</p></div><button type="button" onClick={scanLocalTvs} disabled={scanning} className="rounded-lg bg-white/[.07] px-3 py-2 text-xs font-black disabled:opacity-50">{scanning ? "Scanning…" : "Find TVs"}</button></div>
            {devices.length > 0 && <div className="mt-3 space-y-2">{devices.slice(0, 5).map(d => <div key={d.id} className="flex items-center gap-3 rounded-xl bg-black/20 p-3"><span className="text-xl">📺</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{d.name || d.ip}</p><p className="text-[11px] text-slate-500">{d.type} · {d.ip}</p></div></div>)}</div>}
          </div>}

          <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-500/[.05] p-4 text-center sm:p-5"><p className="text-[11px] font-black uppercase tracking-[.18em] text-slate-500">Enter this code on your TV</p><p className="mt-2 select-all text-4xl font-black tracking-[.18em] text-green-300 sm:text-5xl sm:tracking-[.22em]">{code}</p></div>
          <ol className="mt-4 space-y-2 text-sm leading-5 text-slate-300"><li><b>1.</b> Open <b className="text-white">CricketHub /tv</b> on the TV browser.</li><li><b>2.</b> Enter the 6-digit code and connect.</li><li><b>3.</b> {mobile ? <>Tap <b>Try browser screen sharing</b> below.</> : <>Click <b>Start mirroring</b> here.</>}</li><li><b>4.</b> Allow screen sharing and choose the player tab/screen.</li></ol>
          <button onClick={startBrowserShare} disabled={status === "connecting"} className="mt-5 w-full rounded-xl bg-green-500 px-5 py-3 font-black text-slate-950 disabled:opacity-60">{status === "connecting" ? "Choose screen…" : mobile ? "Try browser screen sharing" : "Start mirroring"}</button>
        </>}

        {status === "mirroring" && <div className="mt-7 rounded-2xl border border-green-400/20 bg-green-500/[.05] p-6 text-center"><div className="text-2xl">📺</div><h3 className="mt-4 text-xl font-black">Mirroring to TV</h3><p className="mt-2 text-sm text-slate-400">Your screen is being sent peer-to-peer.</p><button onClick={stop} className="mt-5 rounded-xl border border-red-400/30 px-5 py-3 font-black text-red-300">Stop mirroring</button></div>}

        {status === "error" && <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-500/[.05] p-5"><p className="font-black text-red-300">Could not connect</p><p className="mt-2 text-sm text-slate-400">{error}</p><button onClick={openMirror} className="mt-4 rounded-xl bg-white/[.08] px-4 py-2 font-bold">Try again</button></div>}
        {error && status !== "error" && <p className="mt-4 rounded-xl bg-red-500/[.06] p-3 text-sm text-red-300">{error}</p>}
        <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">100% free. No Cast developer account, subscription, paid API, or CricketHub video relay.</p>
      </div>
    </div>}
  </>;
}
