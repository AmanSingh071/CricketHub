"use client";

import {useState} from "react";

export default function PlayerMirrorButton({channelName,channelUrl}:{channelName:string;channelUrl:string}){
  const [message,setMessage]=useState("");
  const [opening,setOpening]=useState(false);

  function cast(){
    if(typeof window==="undefined")return;
    const isAndroid=/Android/i.test(navigator.userAgent);
    if(!isAndroid){
      setMessage("Casting is available from Android. Open this channel on your Android phone.");
      return;
    }
    setOpening(true);
    setMessage("");
    const params=new URLSearchParams({url:channelUrl,name:channelName});
    window.location.href=`crickethub://cast?${params.toString()}`;
    window.setTimeout(()=>{
      setOpening(false);
      setMessage("CricketHub Cast did not open. Install the free Cast helper, then tap Cast to TV again.");
    },1400);
  }

  return <div className="w-full sm:w-auto">
    <button type="button" onClick={cast} disabled={opening} aria-label={`Cast ${channelName} to a TV`} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-green-400/40 bg-green-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-green-500/10 transition active:scale-[.98] hover:bg-green-400 disabled:cursor-wait disabled:opacity-70 sm:w-auto">
      <span className="text-lg">📺</span>
      <span>{opening?"Opening Cast…":"Cast to TV"}</span>
    </button>
    {message&&<div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-5 text-amber-200 sm:max-w-[340px]">{message}</div>}
  </div>;
}
