export type CricketScore={r?:number;w?:number;o?:number|string;inning?:string};
export type CricketMatch={id:string;name:string;matchType?:string;status?:string;date?:string;dateTimeGMT?:string;venue?:string;teams?:string[];teamInfo?:{name?:string;shortname?:string;img?:string}[];score?:CricketScore[];matchStarted?:boolean;matchEnded?:boolean;tossWinner?:string;tossChoice?:string;seriesId?:string;seriesName?:string;source?:string};

const SELF_HOSTED_BASE=(process.env.CRICKET_SCRAPER_URL||process.env.NEXT_PUBLIC_CRICKET_SCRAPER_URL||"").replace(/\/$/,"");

function ownBase(){
  if(SELF_HOSTED_BASE)return SELF_HOSTED_BASE;
  const host=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_BRANCH_URL||process.env.VERCEL_URL;
  if(host)return "https://"+host.replace(/^https?:\/\//,"");
  return null;
}

async function own(path:string,revalidate:number){
  const base=ownBase();
  if(!base)return null;
  try{
    const res=await fetch(base+path,{next:{revalidate}});
    if(!res.ok)return null;
    return await res.json();
  }catch{return null}
}

/* Self-hosted cricket data only. No third-party API key or quota. */
export async function getCurrentMatches():Promise<CricketMatch[]>{
  try{
    const j=await own("/api/live",60);
    return Array.isArray(j?.data)?j.data:[];
  }catch{return []}
}

export async function getMatch(id:string):Promise<any|null>{
  try{
    const live=await getCurrentMatches();
    return live.find(m=>String(m.id)===String(id))||null;
  }catch{return null}
}

export async function getScorecard(id:string):Promise<any|null>{
  try{
    const j=await own("/api/score?score="+encodeURIComponent(id),15);
    if(!j||j.status!=="success")return null;
    return {
      id:j.id||id,
      name:j.name||"Live Match",
      status:j.statusText||j.matchStatus||"Live",
      teams:j.teams||[],
      scorecard:Array.isArray(j.scorecard)?j.scorecard:[],
      source:j.rawSource||"espn-public-feed",
    };
  }catch{return null}
}

export function classify(matches:CricketMatch[]){
 return{
   live:matches.filter(m=>m.matchStarted&&!m.matchEnded),
   upcoming:matches.filter(m=>!m.matchStarted),
   recent:matches.filter(m=>m.matchEnded)
 };
}
export function scoreText(scores?:CricketScore[]){
 if(!scores?.length)return "Score not available";
 return scores.map(s=>(s.inning||"Innings")+" "+(s.r??0)+"/"+(s.w??0)+" ("+(s.o??0)+")").join(" • ");
}
export function uniqueTeams(matches:CricketMatch[]){
 const set=new Set<string>();
 matches.forEach(m=>(m.teams||m.teamInfo?.map(t=>t.name||"")||[]).filter(Boolean).forEach(t=>set.add(t)));
 return [...set].sort();
}
export function uniqueSeries(matches:CricketMatch[]){
 return [...new Set(matches.map(m=>m.seriesName||m.name.split(",")[0]).filter(Boolean))];
}
