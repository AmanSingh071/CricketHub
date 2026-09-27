"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import type {CSSProperties} from "react";

declare global {
  interface Window {
    Plyr?: any;
    Hls?: any;
  }
}

type Props={
  src:string;
  title:string;
};

const PLYR_JS="https://cdn.plyr.io/3.8.4/plyr.polyfilled.js";
const PLYR_CSS="https://cdn.plyr.io/3.8.4/plyr.css";
const HLS_JS="https://cdn.jsdelivr.net/npm/hls.js@1.6.2/dist/hls.min.js";

function kindOf(src:string){
  const value=src.toLowerCase().split("?")[0];
  if(value.includes("youtube.com")||value.includes("youtu.be"))return "youtube";
  if(value.includes("vimeo.com"))return "vimeo";
  if(value.endsWith(".m3u8"))return "hls";
  if(/\.(mp4|webm|ogg|ogv)$/.test(value))return "html5";
  return "embed";
}

function loadScript(src:string){
  return new Promise<void>((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if(existing){
      if((existing as any).dataset.loaded==="true")return resolve();
      existing.addEventListener("load",()=>resolve(),{once:true});
      existing.addEventListener("error",()=>reject(new Error(`Failed to load ${src}`)),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.src=src;
    script.async=true;
    script.onload=()=>{script.dataset.loaded="true";resolve()};
    script.onerror=()=>reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadCss(href:string){
  if(document.querySelector(`link[href="${href}"]`))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=href;
  document.head.appendChild(link);
}

export default function CricketHubPlayer({src,title}:Props){
  const rootRef=useRef<HTMLDivElement>(null);
  const mediaRef=useRef<HTMLVideoElement>(null);
  const playerRef=useRef<any>(null);
  const hlsRef=useRef<any>(null);
  const [mode,setMode]=useState<"normal"|"theater">("normal");
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");
  const [cheers,setCheers]=useState(0);
  const [muted,setMuted]=useState(false);
  const type=kindOf(src);

  const fullscreen=useCallback(()=>{
    const element=rootRef.current;
    if(!element)return;
    if(document.fullscreenElement)document.exitFullscreen();
    else element.requestFullscreen?.();
  },[]);

  const cheer=useCallback(()=>{
    setCheers(n=>n+1);
    window.setTimeout(()=>setCheers(n=>Math.max(0,n-1)),1800);
  },[]);

  useEffect(()=>{
    loadCss(PLYR_CSS);
    let cancelled=false;

    async function boot(){
      try{
        setError("");
        await loadScript(PLYR_JS);
        if(cancelled)return;

        if(type==="hls"&&mediaRef.current){
          await loadScript(HLS_JS);
          if(cancelled)return;
          if(window.Hls?.isSupported()){
            const hls=new window.Hls({enableWorker:true,lowLatencyMode:true});
            hlsRef.current=hls;
            hls.loadSource(src);
            hls.attachMedia(mediaRef.current);
          }else{
            mediaRef.current.src=src;
          }
        }else if(type==="html5"&&mediaRef.current){
          mediaRef.current.src=src;
        }

        const target=rootRef.current?.querySelector<HTMLElement>(".js-crickethub-player");
        if(target&&window.Plyr){
          playerRef.current=new window.Plyr(target,{
            controls:["play-large","rewind","play","fast-forward","progress","current-time","mute","volume","settings","pip","fullscreen"],
            seekTime:10,
            keyboard:{focused:true,global:true},
            tooltips:{controls:true,seek:true},
            settings:["speed","loop"],
            speed:{selected:1,options:[0.5,0.75,1,1.25,1.5,1.75,2]},
            ratio:"16:9",
            autoplay:false,
            hideControls:true,
            resetOnEnd:false,
            i18n:{
              restart:"Restart",
              rewind:"Rewind {seektime}s",
              play:"Play",
              pause:"Pause",
              fastForward:"Forward {seektime}s",
              seek:"Seek",
              seekLabel:"Seek {currentTime} of {duration}",
              played:"Played",
              buffered:"Buffered",
              currentTime:"Current time",
              duration:"Duration",
              volume:"Volume",
              mute:"Mute",
              unmute:"Unmute",
              enableCaptions:"Enable captions",
              disableCaptions:"Disable captions",
              enterFullscreen:"Enter fullscreen",
              exitFullscreen:"Exit fullscreen",
              speed:"Speed",
              normal:"Normal",
              loop:"Loop",
              start:"Start",
              end:"End",
              pip:"PIP"
            }
          });
          playerRef.current.on?.("ready",()=>{if(!cancelled)setLoaded(true)});
          playerRef.current.on?.("error",()=>{if(!cancelled)setError("The media provider reported a playback error.")});
        }else if(type==="embed"||type==="youtube"||type==="vimeo"){
          setLoaded(true);
        }
      }catch(e){
        if(!cancelled)setError(e instanceof Error?e.message:"Player failed to initialize.");
      }
    }

    boot();
    return ()=>{
      cancelled=true;
      playerRef.current?.destroy?.();
      playerRef.current=null;
      hlsRef.current?.destroy?.();
      hlsRef.current=null;
    };
  },[src,type]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
      if(event.key.toLowerCase()==="t")setMode(m=>m==="normal"?"theater":"normal");
      if(event.key.toLowerCase()==="f")fullscreen();
      if(event.key==="ArrowLeft"&&playerRef.current)playerRef.current.currentTime=Math.max(0,(playerRef.current.currentTime||0)-10);
      if(event.key==="ArrowRight"&&playerRef.current)playerRef.current.currentTime=(playerRef.current.currentTime||0)+10;
      if(event.key.toLowerCase()==="m"&&playerRef.current){
        playerRef.current.muted=!playerRef.current.muted;
        setMuted(!!playerRef.current.muted);
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[fullscreen]);

  const setVolume=(value:number)=>{
    if(playerRef.current)playerRef.current.volume=value;
    setMuted(value===0);
  };

  return <section ref={rootRef} className={`cricket-player ${mode==="theater"?"cricket-player--theater":""}`}>
    <div className="cricket-player__topbar">
      <div className="min-w-0">
        <div className="cricket-player__live"><span/> CRICKETHUB PLAYER</div>
        <h2 className="truncate text-sm font-black sm:text-base">{title}</h2>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className="cricket-player__chip" onClick={()=>setMode(m=>m==="normal"?"theater":"normal")} title="Theater mode">◫ <span className="hidden sm:inline">Theater</span></button>
        <button type="button" className="cricket-player__chip" onClick={fullscreen} title="Fullscreen">⛶</button>
      </div>
    </div>

    <div className="cricket-player__stage">
      {type==="embed"&&<iframe title={title} src={src} className="cricket-player__iframe" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; display-capture" allowFullScreen/>}

      {(type==="html5"||type==="hls")&&<video ref={mediaRef} className="js-crickethub-player" playsInline preload="metadata"/>}

      {(type==="youtube"||type==="vimeo")&&<div className="plyr__video-embed js-crickethub-player">
        <iframe
          src={src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>}

      {!loaded&&type!=="embed"&&<div className="cricket-player__loading"><div className="cricket-player__spinner"/>Loading player…</div>}
      {error&&<div className="cricket-player__error">⚠️ {error}</div>}

      <div className="cricket-player__watermark">🏏 CricketHub</div>

      {cheers>0&&<div className="cricket-player__cheers" aria-live="polite">
        {Array.from({length:Math.min(cheers,7)}).map((_,i)=><span key={i} style={{"--i":i} as CSSProperties}>🏏</span>)}
      </div>}
    </div>

    <div className="cricket-player__bar">
      <div className="flex items-center gap-2">
        <button type="button" className="cricket-player__action" onClick={()=>playerRef.current?.play?.()} title="Play">▶</button>
        <button type="button" className="cricket-player__action" onClick={()=>playerRef.current&&(playerRef.current.currentTime=Math.max(0,(playerRef.current.currentTime||0)-10))} title="Back 10 seconds">↶10</button>
        <button type="button" className="cricket-player__action" onClick={()=>playerRef.current&&(playerRef.current.currentTime=(playerRef.current.currentTime||0)+10)} title="Forward 10 seconds">10↷</button>
      </div>
      <div className="flex items-center gap-2">
        {(type==="html5"||type==="hls"||type==="youtube"||type==="vimeo")&&<label className="cricket-player__volume" title="Volume"><span>{muted?"🔇":"🔊"}</span><input aria-label="Volume" type="range" min="0" max="1" step="0.05" defaultValue="1" onChange={e=>setVolume(Number(e.target.value))}/></label>}
        <button type="button" className="cricket-player__action cricket-player__cheer" onClick={cheer}>🔥 Cheer</button>
      </div>
    </div>

    <div className="cricket-player__hint">
      <span>⌨️ <b>Space</b> play</span><span>← → <b>10s</b></span><span><b>T</b> theater</span><span><b>F</b> fullscreen</span><span><b>M</b> mute</span>
      {type==="embed"&&<span className="ml-auto text-amber-300/80">Provider controls stay inside the embedded player</span>}
    </div>
  </section>;
}
