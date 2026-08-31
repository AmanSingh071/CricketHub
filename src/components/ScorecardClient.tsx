"use client";
import {useEffect,useState} from "react";

function value(v:any,fallback="—"){return v===undefined||v===null||v===""?fallback:String(v)}
function player(r:any){return r?.batsman||r?.batter||r?.name||r?.bowler||r?.player||"Unknown player"}

export default function ScorecardClient({id}:{id:string}){
 const[data,setData]=useState<any>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[debug,setDebug]=useState<string[]>([]);

 async function refresh(){
  setLoading(true);
  try{
   const r=await fetch("/api/score?score="+encodeURIComponent(id)+"&ts="+Date.now(),{cache:"no-store"});
   const j=await r.json().catch(()=>({status:"error",message:"Invalid scorecard response"}));
   if(j?.status!=="success"){
    setDebug(Array.isArray(j?.debug)?j.debug:[]);
    throw new Error(j?.message||"Scorecard unavailable");
   }
   setData(j);setError("");setDebug([]);
  }catch(e){setError(e instanceof Error?e.message:"Could not load scorecard")}
  finally{setLoading(false)}
 }

 useEffect(()=>{refresh()},[id]);

 const innings=Array.isArray(data?.scorecard)?data.scorecard:[];

 return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
  <a href={"/match/"+id} className="text-sm font-bold text-green-400">← Match Center</a>

  <div className="mt-6 flex items-end justify-between gap-4">
   <div>
    <p className={"text-xs font-black tracking-[.2em] "+(data?.result?"text-slate-400":"text-red-400")}>{data?.result?"MATCH SCORECARD":"🔴 LIVE SCORECARD"}</p>
    <h1 className="mt-2 text-3xl font-black md:text-5xl">{data?.name||"Detailed Scorecard"}</h1>
    <p className="mt-3 text-slate-400">{data?.matchStatus||"Loading match details…"}</p>
   </div>
   <button onClick={refresh} disabled={loading} className="rounded-xl border border-green-500/40 px-4 py-3 text-sm font-black text-green-400 disabled:opacity-50">{loading?"Refreshing…":"↻ Refresh"}</button>
  </div>

  {data&&(data?.toss||data?.result)&&<section className="card mt-6 grid gap-4 rounded-2xl p-5 md:grid-cols-2">
   {data.toss&&<div><p className="text-xs font-black tracking-[.15em] text-slate-500">TOSS</p><p className="mt-2 font-bold">{data.toss.winner} {data.toss.decision?"chose to "+data.toss.decision:""}</p></div>}
   {data.result&&<div><p className="text-xs font-black tracking-[.15em] text-slate-500">RESULT</p><p className="mt-2 font-bold">{data.result.winner} {data.result.margin!==undefined?"won by "+data.result.margin+(data.result.byInnings?" innings":data.result.byRuns?" runs":" wickets"):""}</p></div>}
  </section>}

  {loading&&!data?<div className="card mt-8 rounded-3xl p-7"><p className="font-black">Loading complete scorecard…</p><p className="mt-2 text-sm text-slate-400">Fetching batting, bowling and innings data.</p></div>:
  innings.length?<div className="mt-8 space-y-8">{innings.map((inn:any,i:number)=>{
   const batting=Array.isArray(inn.batting)?inn.batting:[];
   const bowling=Array.isArray(inn.bowling)?inn.bowling:[];
   const total=inn.total||{};
   return <section key={i} className="card overflow-hidden rounded-3xl">
    <div className="border-b border-[#20364d] p-6">
     <p className="text-xs font-black tracking-[.18em] text-green-400">INNINGS {i+1}</p>
     <h2 className="mt-2 text-2xl font-black">{inn.inning||"Innings "+(i+1)}</h2>
     <div className="mt-4 flex flex-wrap gap-3">
      {total.runs!==undefined&&<span className="rounded-full bg-green-500/10 px-3 py-2 font-black text-green-300">{value(total.runs)}/{value(total.wickets,"0")}</span>}
      {total.overs!==undefined&&<span className="rounded-full bg-white/[.04] px-3 py-2 text-sm text-slate-300">{value(total.overs)} overs</span>}
     </div>
    </div>
    {batting.length>0&&<div className="p-6"><h3 className="text-lg font-black">Batting</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-[#20364d] text-xs uppercase tracking-wider text-slate-500"><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>{batting.map((r:any,j:number)=><tr key={j} className="border-b border-white/[.04]"><td className="py-4 font-bold">{player(r)}</td><td className="text-xs text-slate-400">{value(r.dismissal)}</td><td>{value(r.runs)}</td><td>{value(r.balls)}</td><td>{value(r.fours)}</td><td>{value(r.sixes)}</td><td>{value(r.strikeRate)}</td></tr>)}</tbody></table></div></div>}
    {bowling.length>0&&<div className="border-t border-[#20364d] p-6"><h3 className="text-lg font-black">Bowling</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-[#20364d] text-xs uppercase tracking-wider text-slate-500"><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>{bowling.map((r:any,j:number)=><tr key={j} className="border-b border-white/[.04]"><td className="py-4 font-bold">{player(r)}</td><td>{value(r.overs)}</td><td>{value(r.maidens)}</td><td>{value(r.runs)}</td><td className="font-black text-green-300">{value(r.wickets)}</td><td>{value(r.economy)}</td></tr>)}</tbody></table></div></div>}
   </section>
  })}</div>:
  <div className="card mt-8 rounded-3xl p-7"><p className="text-lg font-black">Scorecard is currently unavailable</p><p className="mt-2 text-sm text-slate-400">{error||"The data source did not return player-by-player details for this match."}</p>{debug.length>0&&<details className="mt-4 text-xs text-slate-500"><summary>Technical diagnostics</summary>{debug.map((x,i)=><p key={i}>{x}</p>)}</details>}<button onClick={refresh} className="mt-5 rounded-xl bg-green-500 px-4 py-2 font-black text-slate-950">Try again</button></div>}
 </main>
}
