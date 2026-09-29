"use client";
import {useEffect,useMemo,useState} from "react";

type M={
 id:string;name:string;teams?:string[];teamInfo?:{name?:string}[];
 score?:{inning?:string;r?:number|null;w?:number|null;o?:string|number}[];
 status?:string;date?:string;matchStarted?:boolean;matchEnded?:boolean
};

const Card=({x,kind}:{x:M;kind:"upcoming"|"ongoing"|"recent"})=>{
 const t=x.teams?.length?x.teams:(x.teamInfo||[]).map(z=>z.name||"").filter(Boolean);
 const score=x.score?.length?x.score.map(s=>`${s.inning||"Innings"} ${s.r??"—"}/${s.w??"—"}${s.o!==undefined&&s.o!==""?` (${s.o} ov)`:""}`).join(" • "):"Scorecard available";
 const label=kind==="ongoing"?"🔴 ONGOING":kind==="upcoming"?"🗓️ UPCOMING":"✓ JUST FINISHED";
 return <a href={"/match/"+x.id+"/scorecard"} className="card block rounded-3xl p-6 hover:-translate-y-1 hover:border-green-400/60">
   <div className="flex items-start justify-between gap-4"><div><p className={kind==="ongoing"?"text-xs font-black tracking-[.18em] text-red-400":"text-xs font-black tracking-[.18em] text-sky-400"}>{label}</p><h3 className="mt-3 text-xl font-black">{x.name}</h3></div><span className="rounded-xl border border-[#29445e] px-3 py-2 text-xs font-black">{x.date||x.status||"Match"}</span></div>
   {t.length>0&&<div className="mt-5 grid grid-cols-2 gap-3">{t.slice(0,2).map(z=><div key={z} className="rounded-2xl bg-white/[.04] p-4 text-center"><div className="text-2xl">🏏</div><p className="mt-2 text-sm font-black">{z}</p></div>)}</div>}
   {kind==="ongoing"&&<div className="mt-4 rounded-2xl bg-green-500/5 p-4"><p className="text-[10px] font-bold tracking-wider text-green-400">CURRENT SCORE</p><p className="mt-1 text-lg font-black text-green-300">{score}</p></div>}
   {kind!=="ongoing"&&<p className="mt-4 text-sm text-slate-400">{x.status|| (kind==="upcoming"?"Upcoming":"Completed")}</p>}
   <p className="mt-4 text-sm font-black text-green-400">Open match center →</p>
 </a>
};

export default function LiveMatches(){
 const[data,setData]=useState<{ongoing:M[];upcoming:M[];recent:M[]}>({ongoing:[],upcoming:[],recent:[]});
 const[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState("");
 async function load(){setLoading(true);try{const r=await fetch("/api/matches?ts="+Date.now(),{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j?.message||"Match feed returned HTTP "+r.status);setData({ongoing:Array.isArray(j.ongoing)?j.ongoing:[],upcoming:Array.isArray(j.upcoming)?j.upcoming:[],recent:Array.isArray(j.recent)?j.recent:[]});setError("")}catch(e){setError(e instanceof Error?e.message:"Match feed could not be reached.")}finally{setLoading(false)}}
 useEffect(()=>{load();const t=setInterval(load,60000);return()=>clearInterval(t)},[]);
 const filter=(rows:M[])=>rows.filter(x=>!query||x.name.toLowerCase().includes(query.toLowerCase())||x.teams?.some(t=>t.toLowerCase().includes(query.toLowerCase())));
 const ongoing=useMemo(()=>filter(data.ongoing),[data.ongoing,query]),upcoming=useMemo(()=>filter(data.upcoming),[data.upcoming,query]),recent=useMemo(()=>filter(data.recent),[data.recent,query]);
 const Section=({title,kicker,rows,kind,empty}:{title:string;kicker:string;rows:M[];kind:"upcoming"|"ongoing"|"recent";empty:string})=><section className="mt-12"><div className="flex items-end justify-between"><div><p className="text-xs font-black tracking-[.2em] text-sky-400">{kicker}</p><h2 className="mt-2 text-3xl font-black">{title}</h2></div><span className="rounded-full border border-[#29445e] px-3 py-1 text-xs font-black">{rows.length}</span></div>{rows.length?<div className="mt-6 grid gap-5 lg:grid-cols-2">{rows.map(x=><Card key={x.id} x={x} kind={kind}/>)}</div>:<div className="card mt-5 rounded-3xl p-6 text-slate-400">{empty}</div>}</section>;
 return <section className="mt-12"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-black tracking-[.2em] text-green-400">MATCH CENTER</p><h2 className="mt-2 text-3xl font-black">Cricket match feed</h2><p className="mt-2 text-sm text-slate-400">Ongoing, upcoming and recently completed matches in one place.</p></div><div className="flex gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter matches…" className="w-52 rounded-xl border border-[#29445e] bg-black/20 px-4 py-2 text-sm outline-none focus:border-green-400"/><button onClick={load} className="rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-slate-950">Refresh</button></div></div>{loading&&!data.ongoing.length&&!data.upcoming.length&&!data.recent.length?<div className="card mt-6 rounded-3xl p-7 font-black">Loading match feed…</div>:<><Section title="Ongoing matches" kicker="🔴 LIVE NOW" rows={ongoing} kind="ongoing" empty={query?"No matching ongoing matches.":"No ongoing matches right now."}/><Section title="Upcoming matches" kicker="🗓️ NEXT UP" rows={upcoming} kind="upcoming" empty={query?"No matching upcoming matches.":"No upcoming matches found."}/><Section title="Just finished" kicker="✓ LAST 2 DAYS" rows={recent} kind="recent" empty={query?"No matching finished matches.":"No matches finished in the last 2 days."}/></>}{error&&<p className="mt-5 text-sm text-red-300">{error}</p>}</section>;
}