import AnalyticsDashboard,{type AnalyticsMatch}from"@/components/AnalyticsDashboard";
import {getCurrentMatches,getRecentMatches}from"@/lib/cricket";

export const dynamic="force-dynamic";

export default async function Analytics(){
  const[live,recent]=await Promise.all([getCurrentMatches(),getRecentMatches()]);
  const matches=[...live,...recent] as AnalyticsMatch[];

  let runs=0;
  let overs=0;
  let innings=0;
  let scorecardCoverage=0;

  for(const match of matches){
    if(match.score?.length)scorecardCoverage++;
    for(const score of match.score||[]){
      const r=Number(score.r);
      const o=Number(score.o);
      if(Number.isFinite(r)&&Number.isFinite(o)&&o>0){
        runs+=r;
        overs+=o;
        innings++;
      }
    }
  }

  const averageRunRate=overs?(runs/overs).toFixed(2):"—";

  const appearances=new Map<string,number>();
  for(const match of matches){
    for(const team of match.teams||[]){
      if(!team)continue;
      appearances.set(team,(appearances.get(team)||0)+1);
    }
  }
  const topTeams=[...appearances.entries()]
    .map(([name,count])=>({name,matches:count}))
    .sort((a,b)=>b.matches-a.matches)
    .slice(0,8);

  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
    <p className="text-xs font-black tracking-[.2em] text-purple-300">CRICKET INTELLIGENCE</p>
    <h1 className="mt-2 text-4xl font-black">Analytics Hub</h1>
    <p className="mt-3 max-w-3xl text-slate-400">Interactive analysis built from the matches currently available to CricketHub. Select any analysis card below to open its data panel.</p>

    <AnalyticsDashboard
      liveCount={live.length}
      recentCount={recent.length}
      inningsAnalysed={innings}
      runsAnalysed={runs}
      averageRunRate={averageRunRate}
      scorecardCoverage={scorecardCoverage}
      matches={matches}
      topTeams={topTeams}
    />
  </main>
}