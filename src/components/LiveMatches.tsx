"use client";
import { useEffect, useState } from "react";

type M={id:string;name:string;teams?:string[];teamInfo?:{name?:string}[];score?:{inning?:string;r?:number|null;w?:number|null;o?:string|number}[];status?:string};
type Feed={ok?:boolean;data?:M[];debug?:{url:string;status?:number;bytes?:number;error?:string}[]};

export default function LiveMatches(){
  const [m,setM]=useState<M[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [debug,setDebug]=useState("");

  async function load(){
    setLoading(true);
    try{
      const r=await fetch("/api/live?ts="+Date.now(),{cache:"no-store"});
      const raw=await r.text();
      let j:Feed;
      try{j=JSON.parse(raw)}catch{throw new Error("The live endpoint returned a non-JSON response (HTTP "+r.status+").")}
      if(!r.ok||!j?.ok)throw new Error("Live endpoint returned HTTP "+r.status+".");
      setM(Array.isArray(j.data)?j.data:[]);
      setError("");
      const details=(j.debug||[]).map(x=>x.error?new URL(x.url).hostname+": "+x.error:new URL(x.url).hostname+": HTTP "+x.status+" ("+x.bytes+" bytes)").join(" • ");
      setDebug(details);
    }catch(e){
      setError(e instanceof Error?e.message:"Live feed could not be reached.");
      setDebug("");
    }finally{setLoading(false)}
  }

  useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);

  const st=(x:M["score"])=>x?.length?x.map(s=>`${s.inning||"Innings"} ${s.r??"—"}/${s.w??"—"} (${s.o??"—"})`).join(" • "):"Live score not yet parsed";

  return <section className="mt-12">
    <div className="flex items-end justify-between">
      <div>
        <p className="text-xs font-black tracking-[.2em] text-red-400">LIVE SCORECARD</p>
        <h2 className="mt-2 text-3xl font-black">🔴 All live matches</h2>
        <p className="mt-2 text-sm text-slate-400">Live data is fetched through CricketHub&apos;s own server-side scraper.</p>
      </div>
      <a href="/live" className="text-sm font-bold text-green-400">View all →</a>
    </div>

    {loading&&!m.length?<div className="card mt-6 rounded-3xl p-7"><p className="font-black">Checking live cricket matches…</p></div>:m.length?<div className="mt-6 grid gap-5 lg:grid-cols-2">{m.map(x=>{
      const t=x.teams?.length?x.teams:(x.teamInfo||[]).map(z=>z.name||"").filter(Boolean);
      return <a key={x.id} href={"/match/"+x.id+"/scorecard"} className="card block rounded-3xl p-6 transition hover:-translate-y-1 hover:border-green-400/60">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black tracking-[.18em] text-red-400">🔴 LIVE NOW</p><h3 className="mt-3 text-2xl font-black">{x.name}</h3></div>
          <span className="rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-slate-950">Scorecard</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">{t.slice(0,2).map(z=><div key={z} className="rounded-2xl bg-white/[.04] p-5 text-center"><div className="text-3xl">🏏</div><p className="mt-2 font-black">{z}</p></div>)}</div>
        <div className="mt-5 rounded-2xl bg-green-500/5 p-5"><p className="text-xs font-bold tracking-wider text-green-400">CURRENT SCORE</p><p className="mt-2 text-xl font-black text-green-300">{st(x.score)}</p></div>
        <p className="mt-5 text-sm font-black text-green-400">Open detailed player-by-player scorecard →</p>
      </a>
    })}</div>:<div className="card mt-6 rounded-3xl p-7">
      <p className="text-lg font-black">No live matches are being returned at this moment</p>
      <p className="mt-2 text-sm text-slate-400">{error||"The scraper reached the source but did not detect a match marked live."}</p>
      {debug&&<p className="mt-3 break-all text-xs text-slate-500">{debug}</p>}
      <button onClick={load} disabled={loading} className="mt-5 rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{loading?"Refreshing…":"Refresh live matches"}</button>
    </div>}
  </section>;
}