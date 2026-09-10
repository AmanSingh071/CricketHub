"use client";

import {useState} from "react";

export default function PlayerMirrorButton({channelName,channelUrl}:{channelName:string;channelUrl:string}){
  const [message,setMessage]=useState("");

  function cast(){
    if(typeof window==="undefined")return;
    const isAndroid=/Android/i.test(navigator.userAgent);
    if(!isAndroid){
      setMessage("For the free no-TV-app method, open CricketHub on Android and use the Cast button there.");
      return;
    }
    const params=new URLSearchParams({url:channelUrl,name:channelName});
    const deepLink=`crickethub://cast?${params.toString()}`;
    window.location.href=deepLink;
    window.setTimeout(()=>{
      setMessage("If nothing opened, install the free CricketHub Cast helper first.");
    },1200);
  }

  return <div className="flex items-center gap-2" title="Cast this player to a TV">
    <button type="button" onClick={cast} className="flex h-11 items-center gap-2 rounded-xl border border-green-400/30 bg-green-500/10 px-4 text-sm font-bold text-green-200 transition hover:bg-green-500/20">
      <span className="text-base">📺</span>
      <span>Cast to TV</span>
    </button>
    {message&&<span className="max-w-[300px] text-xs text-amber-300">{message}</span>}
  </div>;
}
