"use client";

import {createElement, useEffect, useRef, useState} from "react";

declare global {
  interface Window { __onGCastApiAvailable?: (isAvailable:boolean)=>void; cast?:any; chrome?:any; }
}

const CAST_SENDER_SCRIPT="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
const CAST_NAMESPACE="urn:x-cast:com.crickethub.player";

function loadCastSdk(){
  return new Promise<boolean>((resolve,reject)=>{
    if(typeof window==="undefined") return reject(new Error("Cast is only available in a browser."));
    if(window.cast?.framework?.CastContext) return resolve(true);
    const previous=window.__onGCastApiAvailable;
    window.__onGCastApiAvailable=(available)=>{
      previous?.(available);
      if(available&&window.cast?.framework?.CastContext) resolve(true);
      else if(!available) reject(new Error("Google Cast is unavailable in this browser."));
    };
    const existing=document.querySelector<HTMLScriptElement>(`script[src="${CAST_SENDER_SCRIPT}"]`);
    if(existing){existing.addEventListener("error",()=>reject(new Error("Could not load Google Cast.")),{once:true});return;}
    const script=document.createElement("script");
    script.src=CAST_SENDER_SCRIPT; script.async=true;
    script.onerror=()=>reject(new Error("Could not load Google Cast."));
    document.head.appendChild(script);
  });
}

export default function PlayerMirrorButton({channelName,channelUrl}:{channelName:string;channelUrl:string}){
  const [available,setAvailable]=useState(false);
  const [casting,setCasting]=useState(false);
  const [message,setMessage]=useState("");
  const contextRef=useRef<any>(null);
  const listenerRef=useRef<any>(null);

  useEffect(()=>{
    let mounted=true;
    async function sendChannel(context:any){
      const session=context.getCurrentSession(); if(!session)return;
      try{
        await session.sendMessage(CAST_NAMESPACE,{type:"LOAD_CHANNEL",channelName,channelUrl});
        if(mounted){setCasting(true);setMessage("");}
      }catch{if(mounted)setMessage("The TV connected, but the player could not be sent.");}
    }
    async function init(){
      const appId=process.env.NEXT_PUBLIC_CAST_APP_ID;
      if(!appId)return;
      try{
        await loadCastSdk(); if(!mounted)return;
        const context=window.cast.framework.CastContext.getInstance();
        context.setOptions({receiverApplicationId:appId,autoJoinPolicy:window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED});
        const listener=(event:any)=>{
          if(event.sessionState===window.cast.framework.SessionState.SESSION_STARTED||event.sessionState===window.cast.framework.SessionState.SESSION_RESUMED)void sendChannel(context);
          if(event.sessionState===window.cast.framework.SessionState.SESSION_ENDED&&mounted)setCasting(false);
        };
        context.addEventListener(window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,listener);
        contextRef.current=context; listenerRef.current=listener; setAvailable(true);
        if(context.getCurrentSession())void sendChannel(context);
      }catch(error:any){if(mounted)setMessage(error?.message||"Google Cast is unavailable.");}
    }
    void init();
    return()=>{mounted=false;const context=contextRef.current;const listener=listenerRef.current;if(context&&listener){try{context.removeEventListener(window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,listener);}catch{}}};
  },[channelName,channelUrl]);

  if(!process.env.NEXT_PUBLIC_CAST_APP_ID)return null;
  return <div className="flex items-center gap-2" title="Cast this channel to a TV">
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${casting?"border-green-400/60 bg-green-500/10":"border-[#29445e] bg-white/[.04]"}`}>
      {createElement("google-cast-launcher",{"aria-label":`Cast ${channelName} to a TV`,style:{width:40,height:40,display:available?"block":"none"}})}
      {!available&&<span className="text-base">📺</span>}
    </div>
    {message&&<span className="max-w-[260px] text-xs text-amber-300">{message}</span>}
    {casting&&<span className="text-xs font-bold text-green-300">Casting</span>}
  </div>;
}
