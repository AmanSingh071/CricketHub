"use client";

import {useEffect, useRef, useState} from "react";

const CAST_SDK = "https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js";
const NAMESPACE = "urn:x-cast:com.crickethub.player";

type CastWindow = Window & {
  cast?: any;
};

export default function CastReceiver(){
  const frame = useRef<HTMLIFrameElement>(null);
  const [status,setStatus] = useState("Waiting for CricketHub…");
  const [name,setName] = useState("");

  useEffect(()=>{
    const script=document.createElement("script");
    script.src=CAST_SDK;
    script.async=true;
    script.onload=()=>{
      const cast=(window as CastWindow).cast;
      if(!cast?.framework?.CastReceiverContext){
        setStatus("Cast receiver could not start.");
        return;
      }

      const context=cast.framework.CastReceiverContext.getInstance();
      context.addCustomMessageListener(NAMESPACE,(event:any)=>{
        const data=event?.data;
        if(!data || data.type!=="LOAD_CHANNEL" || typeof data.channelUrl!=="string") return;
        const channelName=typeof data.channelName==="string"?data.channelName:"CricketHub";
        setName(channelName);
        setStatus("Loading live player…");
        if(frame.current){
          frame.current.src=data.channelUrl;
        }
      });

      context.start({disableIdleTimeout:true});
      setStatus("Ready");
    };
    script.onerror=()=>setStatus("Cast receiver could not load.");
    document.head.appendChild(script);
    return()=>{script.remove();};
  },[]);

  return <main className="fixed inset-0 bg-black text-white">
    <iframe ref={frame} title={name||"CricketHub live player"} className="absolute inset-0 h-full w-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
    {!name && <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="text-6xl">🏏</div>
        <h1 className="mt-5 text-3xl font-black">CricketHub</h1>
        <p className="mt-2 text-sm text-slate-400">{status}</p>
      </div>
    </div>}
    {name && status!=="Ready" && <div className="absolute left-4 top-4 rounded-lg bg-black/70 px-3 py-2 text-xs text-white/80">{status}</div>}
  </main>;
}
