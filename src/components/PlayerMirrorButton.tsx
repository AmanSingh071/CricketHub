"use client";

import {useEffect, useState} from "react";

function isAndroid(){
  if(typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export default function PlayerMirrorButton({channelName, channelUrl}:{channelName:string; channelUrl:string}){
  const [android,setAndroid]=useState(false);
  const [open,setOpen]=useState(false);
  const [launching,setLaunching]=useState(false);

  useEffect(()=>setAndroid(isAndroid()),[]);

  function cast(){
    const target=`crickethub://cast?name=${encodeURIComponent(channelName)}&url=${encodeURIComponent(channelUrl)}`;
    setLaunching(true);
    window.location.href=target;
    window.setTimeout(()=>setLaunching(false),1200);
  }

  return <>
    <button type="button" onClick={()=>android?cast():setOpen(true)}
      className="inline-flex items-center gap-2 rounded-xl border border-[#29445e] bg-white/[.04] px-4 py-2.5 text-sm font-black text-slate-200 transition hover:border-green-400/50 hover:text-green-300"
      aria-label="Cast to TV">
      <span>📺</span>{launching?"Opening Cast…":"Cast to TV"}
    </button>

    {open&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-[#29445e] bg-[#081321] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[11px] font-black tracking-[.18em] text-green-400">ANDROID TV CASTING</p><h2 className="mt-2 text-2xl font-black">Use the CricketHub Android app</h2></div>
          <button onClick={()=>setOpen(false)} className="text-xl text-slate-400" aria-label="Close">×</button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">For your external iframe players, CricketHub uses a small free Android app. Install CricketHub Cast on your Android phone and CricketHub TV on the TV. Keep both on the same Wi‑Fi.</p>
        <ol className="mt-5 space-y-2 text-sm leading-5 text-slate-200">
          <li><b>1.</b> Open this channel in CricketHub Cast.</li>
          <li><b>2.</b> Tap <b>Cast to TV</b>.</li>
          <li><b>3.</b> Select the discovered CricketHub TV.</li>
          <li><b>4.</b> The TV opens the external player automatically.</li>
        </ol>
        <p className="mt-5 rounded-2xl border border-green-400/20 bg-green-500/[.05] p-3 text-xs leading-5 text-green-200">No QR code, 6‑digit code, or website needs to be opened on the TV.</p>
        <button onClick={()=>setOpen(false)} className="mt-5 w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-black text-black">Got it</button>
      </div>
    </div>}
  </>;
}
