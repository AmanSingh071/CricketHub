import { notFound } from "next/navigation";
import { channels } from "@/lib/channels";
import { getCurrentMatches, getScorecard, scoreText } from "@/lib/cricket";

export const revalidate = 60;

const value=(v:any,f="—")=>v===undefined||v===null||v===""?f:String(v);
const player=(r:any)=>r?.batsman||r?.batter||r?.name||r?.bowler||r?.player||"Unknown player";

export default async function LiveScorecard({params}:{params:Promise<{channelId:string}>}) {
  const {channelId}=await params;
  const channel=channels.find(c=>c.id===channelId);
  if(!channel) notFound();

  let matches:any[]=[];
  try{matches=await getCurrentMatches();}catch{}

  const wanted=(channel.teams||[]).map(t=>t.toLowerCase());
  const match=matches.find((m:any)=>{
    const text=[m.name,...(m.teams||[]),...(m.teamInfo||[]).map((t:any)=>t.name||"")].join(" ").toLowerCase();
    return wanted.length>0&&wanted.every(t=>text.includes(t));
  });

  let data:any=null;
  if(match?.id) try{data=await getScorecard(match.id);}catch{}
  const innings=Array.isArray(data?.scorecard)?data.scorecard:Array.isArray(data?.score)?data.score:[];

  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
    <a href="/" className="text-sm font-bold text-green-400">← Back to home</a>
    <section className="card mt-6 rounded-3xl p-6 md:p-8">
      <p className="text-xs font-black tracking-[.2em] text-red-400">🔴 LIVE SCORECARD</p>
      <h1 className="mt-3 text-3xl font-black md:text-5xl">{channel.nowPlaying||channel.channel_name}</h1>
      <p className="mt-3 text-slate-400">Currently configured as showing on {channel.channel_name}.</p>
      {match&&<><p className="mt-4 text-xl font-black text-green-300">{scoreText(match.score)}</p>{match.status&&<p className="mt-2 text-sm text-slate-400">{match.status}</p>}</>}
    </section>

    {innings.length? <div className="mt-8 space-y-8">{innings.map((inn:any,i:number)=>{
      const batting=Array.isArray(inn?.batting)?inn.batting:Array.isArray(inn?.batsmen)?inn.batsmen:[];
      const bowling=Array.isArray(inn?.bowling)?inn.bowling:[];
      const total=inn?.total||inn?.score||{};
      return <section key={i} className="card overflow-hidden rounded-3xl">
        <div className="border-b border-[#20364d] p-6"><p className="text-xs font-black tracking-[.18em] text-green-400">INNINGS {i+1}</p><h2 className="mt-2 text-2xl font-black">{inn?.inning||inn?.teamName||inn?.team||"Innings "+(i+1)}</h2>{(total.r!==undefined||total.runs!==undefined)&&<p className="mt-3 text-xl font-black text-green-300">{value(total.r??total.runs)}/{value(total.w??total.wickets,"0")} · {value(total.o??total.overs)} overs</p>}</div>
        {batting.length>0&&<div className="p-6"><h3 className="text-lg font-black">Batting</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-[#20364d] text-xs uppercase text-slate-500"><tr><th className="p-3">Batter</th><th className="p-3">Dismissal</th><th className="p-3 text-right">R</th><th className="p-3 text-right">B</th><th className="p-3 text-right">4s</th><th className="p-3 text-right">6s</th><th className="p-3 text-right">SR</th></tr></thead><tbody>{batting.map((r:any,j:number)=><tr key={j} className="border-b border-white/[.04]"><td className="p-3 font-bold">{player(r)}</td><td className="p-3 text-xs text-slate-400">{value(r?.dismissal||r?.howOut||r?.dismissalText)}</td><td className="p-3 text-right font-black">{value(r?.r??r?.runs)}</td><td className="p-3 text-right">{value(r?.b??r?.balls)}</td><td className="p-3 text-right">{value(r?.["4s"]??r?.fours)}</td><td className="p-3 text-right">{value(r?.["6s"]??r?.sixes)}</td><td className="p-3 text-right">{value(r?.sr??r?.strikeRate)}</td></tr>)}</tbody></table></div></div>}
        {bowling.length>0&&<div className="border-t border-[#20364d] p-6"><h3 className="text-lg font-black">Bowling</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-[#20364d] text-xs uppercase text-slate-500"><tr><th className="p-3">Bowler</th><th className="p-3 text-right">O</th><th className="p-3 text-right">M</th><th className="p-3 text-right">R</th><th className="p-3 text-right">W</th><th className="p-3 text-right">Econ</th></tr></thead><tbody>{bowling.map((r:any,j:number)=><tr key={j} className="border-b border-white/[.04]"><td className="p-3 font-bold">{player(r)}</td><td className="p-3 text-right">{value(r?.o??r?.overs)}</td><td className="p-3 text-right">{value(r?.m??r?.maidens)}</td><td className="p-3 text-right">{value(r?.r??r?.runs)}</td><td className="p-3 text-right font-black text-green-300">{value(r?.w??r?.wickets)}</td><td className="p-3 text-right">{value(r?.econ??r?.economy)}</td></tr>)}</tbody></table></div></div>}
      </section>
    })}</div> : <section className="card mt-8 rounded-3xl p-7"><p className="text-lg font-black">Scorecard data is not available from the provider right now</p><p className="mt-2 text-sm text-slate-400">The page is active and clickable. It will show player-by-player runs, balls, fours, sixes and bowling figures automatically when the current match is returned by the cricket data feed.</p><div className="mt-6 grid grid-cols-2 gap-4">{(channel.teams||[]).map(t=><div key={t} className="rounded-2xl bg-white/[.04] p-5 text-center font-black">🏏<p className="mt-2">{t}</p></div>)}</div></section>}
  </main>
}