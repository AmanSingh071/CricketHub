"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";

declare global {
  interface Window { Hls?: any; YT?: any; Vimeo?: any; }
}

type Props={src:string;title:string};
type Quality={label:string;index:number;height?:number;bitrate?:number};
type MediaKind="youtube"|"vimeo"|"hls"|"html5"|"embed";
const HLS_JS="https://cdn.jsdelivr.net/npm/hls.js@1.6.2/dist/hls.min.js";
const VIMEO_JS="https://player.vimeo.com/api/player.js";
const YOUTUBE_JS="https://www.youtube.com/iframe_api";

function kindOf(src:string):MediaKind{
  const value=src.toLowerCase().split("?")[0];
  if(value.includes("youtube.com")||value.includes("youtu.be"))return "youtube";
  if(value.includes("vimeo.com"))return "vimeo";
  if(value.endsWith(".m3u8"))return "hls";
  if(/\.(mp4|webm|ogg|ogv)$/.test(value))return "html5";
  return "embed";
}
function loadScript(src:string){
  return new Promise<void>((resolve,reject)=>{
    const old=document.querySelector<HTMLScriptElement>('script[src="'+src+'"]');
    if(old){if((old as any).dataset.loaded==="true")return resolve();old.addEventListener("load",()=>resolve(),{once:true});old.addEventListener("error",()=>reject(new Error("Player dependency failed")),{once:true});return;}
    const s=document.createElement("script");s.src=src;s.async=true;
    s.onload=()=>{s.dataset.loaded="true";resolve()};s.onerror=()=>reject(new Error("Player dependency failed"));document.head.appendChild(s);
  });
}
function fmt(n:number){
  if(!Number.isFinite(n)||n<0)return "00:00";
  const s=Math.floor(n),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;
  return h?[h,m,x].map((v)=>String(v).padStart(2,"0")).join(":"):[m,x].map((v)=>String(v).padStart(2,"0")).join(":");
}

export default function CricketHubPlayer({src,title}:Props){
  const root=useRef<HTMLDivElement>(null),media=useRef<HTMLVideoElement>(null),hls=useRef<any>(null),timer=useRef<number|null>(null),iframe=useRef<HTMLIFrameElement>(null),apiPlayer=useRef<any>(null);
  const type=useMemo(()=>kindOf(src),[src]), controllable=type==="hls"||type==="html5";
  const [apiReady,setApiReady]=useState(false),apiControllable=type==="youtube"||type==="vimeo",canControl=controllable||apiReady;
  const [playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[volume,setVolume]=useState(.9);
  const [current,setCurrent]=useState(0),[duration,setDuration]=useState(0),[buffered,setBuffered]=useState(0);
  const [speed,setSpeed]=useState(1),[quality,setQuality]=useState("Auto"),[qualities,setQualities]=useState<Quality[]>([]),[theater,setTheater]=useState(false);
  const [fullscreen,setFullscreen]=useState(false),[controls,setControls]=useState(true),[menu,setMenu]=useState<string|null>(null),[iframeKey,setIframeKey]=useState(0),[copied,setCopied]=useState(false);
  const [ambient,setAmbient]=useState(false),[autoplay,setAutoplay]=useState(false),[error,setError]=useState("");
  const autoplayRef=useRef(false);
  const [reaction,setReaction]=useState("🔥"),[reactions,setReactions]=useState<{id:number;emoji:string}[]>([]);
  const progress=duration?Math.min(100,current/duration*100):0,buf=duration?Math.min(100,buffered/duration*100):0;

  const wake=useCallback(()=>{
    setControls(true);if(timer.current)clearTimeout(timer.current);
    if(playing)timer.current=window.setTimeout(()=>setControls(false),2800);
  },[playing]);

  const full=useCallback(async()=>{
    if(!root.current)return;
    if(document.fullscreenElement)await document.exitFullscreen?.();else await root.current.requestFullscreen?.();
  },[]);
  const seek=(d:number)=>{
    if(controllable){if(!media.current||!duration)return;media.current.currentTime=Math.max(0,Math.min(duration,media.current.currentTime+d));wake();return;}
    if(!apiReady||!apiPlayer.current)return;
    if(type==="youtube"){const t=Number(apiPlayer.current.getCurrentTime?.()||0);apiPlayer.current.seekTo(Math.max(0,t+d),true);}
    if(type==="vimeo"){apiPlayer.current.getCurrentTime().then((t:number)=>apiPlayer.current.setCurrentTime(Math.max(0,t+d))).catch(()=>{});}
    wake();
  };
  const play=()=>{
    if(controllable){if(!media.current)return;if(media.current.paused)media.current.play().catch(()=>{});else media.current.pause();wake();return;}
    if(!apiReady||!apiPlayer.current)return;
    if(type==="youtube"){const state=apiPlayer.current.getPlayerState?.();state===1?apiPlayer.current.pauseVideo():apiPlayer.current.playVideo();}
    if(type==="vimeo"){apiPlayer.current.getPaused().then((paused:boolean)=>paused?apiPlayer.current.play():apiPlayer.current.pause()).catch(()=>{});}
    wake();
  };
  const mute=()=>{
    if(controllable){if(!media.current)return;
    media.current.muted=!media.current.muted;setMuted(media.current.muted);
    if(!media.current.muted&&media.current.volume===0){media.current.volume=.8;setVolume(.8);}wake();return;}
    if(!apiReady||!apiPlayer.current)return;
    if(type==="youtube"){const m=!!apiPlayer.current.isMuted?.();m?apiPlayer.current.unMute():apiPlayer.current.mute();setMuted(!m);}
    if(type==="vimeo"){apiPlayer.current.getMuted().then((m:boolean)=>apiPlayer.current.setMuted(!m).then(()=>setMuted(!m))).catch(()=>{});}
    wake();
  };
  const setVol=(v:number)=>{
    if(controllable){if(!media.current)return;media.current.volume=v;media.current.muted=v===0;setVolume(v);setMuted(v===0);wake();return;}
    if(!apiReady||!apiPlayer.current)return;
    if(type==="youtube"){apiPlayer.current.setVolume(Math.round(v*100));if(v>0)apiPlayer.current.unMute();}
    if(type==="vimeo"){apiPlayer.current.setVolume(v).catch(()=>{});}
    setVolume(v);setMuted(v===0);wake();
  };
  const changeVolume=(delta:number)=>{
    if(!canControl)return;
    const base=controllable&&media.current?media.current.volume:volume;
    const next=Math.max(0,Math.min(1,base+delta));
    setVol(next);
  };
  const reloadProvider=()=>{if(!controllable){setIframeKey(x=>x+1);wake()}};
  const copyProvider=async()=>{try{await navigator.clipboard.writeText(src);setCopied(true);window.setTimeout(()=>setCopied(false),1600)}catch{}};
  const send=(emoji:string)=>{
    setReaction(emoji);const id=Date.now()+Math.random();
    setReactions((x)=>[...x,{id,emoji}].slice(-8));setTimeout(()=>setReactions((x)=>x.filter((r)=>r.id!==id)),1800);
  };

  useEffect(()=>{
    if(!apiControllable)return;
    let dead=false;
    const init=async()=>{
      try{
        if(type==="vimeo"){
          await loadScript(VIMEO_JS);if(dead||!window.Vimeo||!iframe.current)return;
          const p=new window.Vimeo.Player(iframe.current);apiPlayer.current=p;await p.ready();if(dead)return;setApiReady(true);
          p.on("timeupdate",(e:any)=>{setCurrent(e.seconds||0);setDuration(e.duration||0);});
          p.on("volumechange",(e:any)=>{setVolume(e.volume??.9);setMuted(!!e.muted);});
        }else{
          await loadScript(YOUTUBE_JS);if(dead||!window.YT||!iframe.current)return;
          const p=new window.YT.Player(iframe.current,{events:{onReady:()=>{if(dead)return;apiPlayer.current=p;setApiReady(true);setDuration(Number(p.getDuration?.()||0));setVolume(Number(p.getVolume?.()||90)/100);},onStateChange:(e:any)=>setPlaying(e.data===1)}});
        }
      }catch{if(!dead)setApiReady(false);}
    };
    void init();
    return()=>{dead=true;apiPlayer.current?.destroy?.();apiPlayer.current=null;setApiReady(false);};
  },[apiControllable,type,src]);

  useEffect(()=>{
    let dead=false;
    autoplayRef.current=autoplay;
    const boot=async()=>{
      try{
        setError("");
        if(!controllable)return;
        const v=media.current;if(!v)return;
        if(type==="hls"){
          await loadScript(HLS_JS);if(dead)return;
          if(window.Hls?.isSupported()){
            const h=new window.Hls({enableWorker:true,lowLatencyMode:false,maxBufferLength:45,maxMaxBufferLength:90,backBufferLength:30,maxBufferHole:0.5,highBufferWatchdogPeriod:2,nudgeOffset:0.1,nudgeMaxRetry:5,liveSyncDurationCount:4});
            hls.current=h;h.loadSource(src);h.attachMedia(v);
            h.on(window.Hls.Events.MANIFEST_PARSED,()=>{
              const next=(h.levels||[]).map((level:any,index:number)=>({
                index,
                height:Number(level.height)||undefined,
                bitrate:Number(level.bitrate)||undefined,
                label:level.height?`${level.height}p`:level.bitrate?`${Math.round(level.bitrate/1000)} kbps`:`Level ${index+1}`
              }));
              setQualities(next);
              setQuality("Auto");
            });
            h.on(window.Hls.Events.LEVEL_SWITCHED,(_:any,d:any)=>{
              if(d?.level>=0){
                const level=h.levels?.[d.level];
                setQuality(level?.height?`${level.height}p`:d.level===-1?"Auto":`Level ${d.level+1}`);
              }
            });
            h.on(window.Hls.Events.ERROR,(_:any,d:any)=>{
              if(!d?.fatal)return;
              if(d.type===window.Hls.ErrorTypes?.NETWORK_ERROR){setError("Network hiccup — reconnecting…");h.startLoad();}
              else if(d.type===window.Hls.ErrorTypes?.MEDIA_ERROR){setError("Recovering video decoder…");h.recoverMediaError();}
              else{setError("Stream playback error — refresh and try again.");h.destroy();}
            });
          }else v.src=src;
        }else v.src=src;
        const loaded=()=>setDuration(v.duration||0),time=()=>setCurrent(v.currentTime||0),prog=()=>{try{setBuffered(v.buffered.length?v.buffered.end(v.buffered.length-1):0)}catch{}};
        const onPlay=()=>setPlaying(true),onPause=()=>setPlaying(false),onEnd=()=>{setPlaying(false);if(autoplayRef.current)v.play().catch(()=>{})};
        v.addEventListener("loadedmetadata",loaded);v.addEventListener("timeupdate",time);v.addEventListener("progress",prog);
        v.addEventListener("play",onPlay);v.addEventListener("pause",onPause);v.addEventListener("ended",onEnd);
        return()=>{v.removeEventListener("loadedmetadata",loaded);v.removeEventListener("timeupdate",time);v.removeEventListener("progress",prog);v.removeEventListener("play",onPlay);v.removeEventListener("pause",onPause);v.removeEventListener("ended",onEnd);};
      }catch(e){if(!dead)setError(e instanceof Error?e.message:"Player initialization failed.");}
    };
    const cleanup=boot();
    return()=>{dead=true;hls.current?.destroy?.();hls.current=null;void cleanup;};
  },[src,type,controllable]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
      const k=e.key.toLowerCase();
      if(e.key===" "||k==="k"||k==="p"){e.preventDefault();if(canControl)play()}
      else if(e.key==="ArrowLeft"){e.preventDefault();if(canControl)seek(-5)}
      else if(e.key==="ArrowRight"){e.preventDefault();if(canControl)seek(5)}
      else if(e.key==="ArrowUp"){e.preventDefault();if(canControl)changeVolume(.05)}
      else if(e.key==="ArrowDown"){e.preventDefault();if(canControl)changeVolume(-.05)}
      else if(k==="j"){e.preventDefault();if(canControl)seek(-10)}
      else if(k==="l"){e.preventDefault();if(canControl)seek(10)}
      else if(k==="m"){e.preventDefault();if(canControl)mute()}
      else if(k==="f"){e.preventDefault();void full()}
      else if(k==="t"){e.preventDefault();setTheater((x)=>!x)}
      else if(k==="r"&&!controllable){e.preventDefault();reloadProvider()}
      else if(e.key==="Home"||e.key==="0"){e.preventDefault();if(controllable&&media.current){media.current.currentTime=0;wake()}}
      else if(e.key==="End"){e.preventDefault();if(controllable&&media.current&&duration){media.current.currentTime=duration;wake()}}
      else if(k===","&&controllable){e.preventDefault();changeSpeed(Math.max(.5,Number((speed-.25).toFixed(2))))}
      else if(k==="."&&controllable){e.preventDefault();changeSpeed(Math.min(2,Number((speed+.25).toFixed(2))))}
      else if(e.key==="Escape"){setMenu(null);setTheater(false)}
    };
    addEventListener("keydown",key);return()=>removeEventListener("keydown",key);
  },[canControl,controllable,duration,speed]);
  useEffect(()=>{wake();return()=>{if(timer.current)clearTimeout(timer.current)}},[playing,wake]);

  const setSeek=(v:number)=>{if(media.current&&duration)media.current.currentTime=v/100*duration;wake()};
  const speeds=[.5,.75,1,1.25,1.5,1.75,2];
  const changeSpeed=(v:number)=>{setSpeed(v);if(media.current)media.current.playbackRate=v;setMenu(null)};
  const qualityOptions:Quality[]=[{label:"Auto",index:-1},...qualities];
  const changeQuality=(index:number,label:string)=>{
    if(hls.current&&type==="hls"){hls.current.currentLevel=index;}
    setQuality(label);setMenu(null);
  };

  return <section ref={root} tabIndex={0} aria-label={title+" player"} onMouseDown={()=>root.current?.focus({preventScroll:true})} onMouseMove={wake} onMouseLeave={()=>playing&&setControls(false)} onTouchStart={wake} className={"ch-player "+(theater?"ch-player--theater ":"")+(controls?"ch-player--controls ":"ch-player--clean ")+(ambient?"ch-player--ambient":"")}>
    <div className="ch-player__ambient"/>
    <header className="ch-player__header">
      <div className="ch-player__title"><div className="ch-player__live"><span/> LIVE <i>•</i> CRICKETHUB</div><strong>{title}</strong></div>
      <div className="ch-player__header-actions"><button onClick={()=>setTheater((x)=>!x)} title="Theater">▣</button>{!controllable&&<><button onClick={reloadProvider} title="Reload provider">↻</button></>}<button onClick={()=>void full()} title="Fullscreen">⛶</button></div>
    </header>
    <div className="ch-player__stage" onDoubleClick={(e)=>{
      if((e.target as HTMLElement).closest(".ch-player__controls"))return;
      if(controllable){const r=e.currentTarget.getBoundingClientRect();seek(e.clientX<r.left+r.width/2?-10:10);}
    }}>
      <div className="ch-player__video-wrap">
        {controllable&&<video ref={media} playsInline preload="auto" className="ch-player__video" onClick={play}/>}
        {!controllable&&<iframe key={iframeKey} ref={iframe} title={title} src={(type==="youtube" ? src+(src.includes("?")?"&":"?")+"enablejsapi=1&origin="+encodeURIComponent(window.location.origin) : src)} className="ch-player__iframe" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; display-capture" allowFullScreen/>}
      </div>
      <div className="ch-player__top-gradient"/>
      <div className="ch-player__brand">🏏 CricketHub</div>
      <div className="ch-player__live-pill"><span/> {type==="embed"||type==="hls"?"LIVE":"ON DEMAND"}</div>
      {controllable&&<button className={"ch-player__bigplay "+(playing?"is-playing":"")} onClick={play} aria-label={playing?"Pause":"Play"}>{playing?"Ⅱ":"▶"}</button>}
      {error&&<div className="ch-player__error">⚠️ {error}</div>}
      <div className="ch-player__controls">
        {controllable&&<div className="ch-player__timeline-wrap"><div className="ch-player__timeline"><span className="ch-player__buffer" style={{width:buf+"%"}}/><span className="ch-player__played" style={{width:progress+"%"}}/><input aria-label="Seek" type="range" min="0" max="100" step=".1" value={progress} onChange={(e)=>setSeek(Number(e.target.value))}/></div></div>}
        <div className="ch-player__control-row">
          <div className="ch-player__left">
            {controllable&&<><button className="ch-icon-btn" onClick={play}>{playing?"Ⅱ":"▶"}</button>
            <button className="ch-icon-btn" onClick={()=>seek(-10)}>↶<small>10</small></button>
            <button className="ch-icon-btn" onClick={()=>seek(10)}>↷<small>10</small></button>
            <div className="ch-volume"><button className="ch-icon-btn" onClick={mute}>{muted||volume===0?"🔇":"🔊"}</button><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={muted?0:volume} onChange={(e)=>setVol(Number(e.target.value))}/></div>
            <span className="ch-time">{fmt(current)}</span><span className="ch-time">/ {duration?fmt(duration):"LIVE"}</span></>}
            {!controllable&&apiReady&&<><button className="ch-icon-btn" onClick={()=>seek(-5)} title="Back 5 seconds">↶<small>5</small></button><button className="ch-icon-btn" onClick={play} title="Play/Pause">▶</button><button className="ch-icon-btn" onClick={()=>seek(5)} title="Forward 5 seconds">↷<small>5</small></button><button className="ch-icon-btn" onClick={mute} title="Mute">🔊</button><span className="ch-provider-status"><span/> API controls</span></>}{!controllable&&!apiReady&&<span className="ch-provider-status"><span/> Provider controls</span>}
          </div>
          <div className="ch-player__right">
            <button className="ch-icon-btn ch-reaction" onClick={()=>send(reaction)} title="Reaction">{reaction}</button>
            {controllable&&<><button className="ch-label-btn" onClick={()=>setMenu(menu==="speed"?null:"speed")}>{speed}×</button><button className="ch-icon-btn" onClick={()=>setMenu(menu==="settings"?null:"settings")}>⚙</button></>}
            <button className="ch-icon-btn" onClick={()=>setTheater((x)=>!x)}>▣</button>{!controllable&&<><button className="ch-icon-btn" onClick={reloadProvider} title="Reload">↻</button><button className="ch-icon-btn" onClick={copyProvider} title="Copy provider URL">{copied?"✓":"⧉"}</button></>}<button className="ch-icon-btn" onClick={()=>void full()}>⛶</button>
          </div>
        </div>
        {menu&&<div className="ch-player__menu">
          {menu==="settings"&&<><button onClick={()=>setMenu("speed")}>Speed <b>{speed}×</b><span>›</span></button><button onClick={()=>setMenu("quality")}>Quality <b>{quality}</b><span>›</span></button><button onClick={()=>setAmbient((x)=>!x)}>Ambient glow <b>{ambient?"On":"Off"}</b></button><button onClick={()=>setAutoplay((x)=>!x)}>Autoplay <b>{autoplay?"On":"Off"}</b></button><button onClick={()=>setMenu("stats")}>Stats for nerds <span>›</span></button></>}
          {menu==="speed"&&<><div className="ch-menu-title">Playback speed</div>{speeds.map((v)=><button key={v} className={speed===v?"active":""} onClick={()=>changeSpeed(v)}>{v===1?"Normal":v+"×"} {speed===v&&"✓"}</button>)}</>}
          {menu==="quality"&&<><div className="ch-menu-title">Stream quality</div>{type==="hls"&&qualities.length?qualityOptions.map((q)=><button key={q.label} className={quality===q.label?"active":""} onClick={()=>changeQuality(q.index,q.label)}>{q.label} {quality===q.label&&"✓"}</button>):<><button className="active">{type==="html5"?"Original":"Auto"} ✓</button><p className="ch-menu-note">Manual quality switching is available when an HLS manifest exposes multiple renditions.</p></>}</>}
          {menu==="stats"&&<><div className="ch-menu-title">Stats for nerds</div><div className="ch-stats"><span>Source <b>{type.toUpperCase()}</b></span><span>Quality <b>{quality}</b></span><span>Buffer <b>{fmt(buffered)}</b></span><span>Speed <b>{speed}×</b></span><span>Mode <b>{theater?"Theater":"Normal"}</b></span></div></>}
        </div>}
      </div>
      {!controllable&&!apiReady&&<div className="ch-player__provider-note">Provider mode · controls are available inside the embedded player</div>}
      <div className="ch-player__reactions">{reactions.map((r)=><span key={r.id}>{r.emoji}</span>)}</div>
    </div>
    <footer className="ch-player__footer"><div><b>● {type==="embed"||type==="hls"?"LIVE":"PLAY"}</b> <span>{title}</span></div><div className="ch-shortcuts">{canControl?<><span>Space/K</span> play <span>← →</span> ±5s <span>↑ ↓</span> volume <span>M</span> mute <span>J/L</span> ±10s <span>F</span> fullscreen <span>T</span> theater <span>R</span> reload <span>Esc</span> close</>:<><span>F</span> fullscreen <span>T</span> theater <span>R</span> reload <span>Esc</span> close</>}</div></footer>
  </section>;
}
