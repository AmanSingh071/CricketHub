export type CricketScore={r?:number;w?:number;o?:number|string;inning?:string};
export type CricketMatch={id:string;name:string;matchType?:string;status?:string;date?:string;dateTimeGMT?:string;venue?:string;teams?:string[];teamInfo?:{name?:string;shortname?:string;img?:string}[];score?:CricketScore[];matchStarted?:boolean;matchEnded?:boolean;tossWinner?:string;tossChoice?:string;seriesId?:string;seriesName?:string;source?:string};

const API="https://api.cricapi.com/v1";

function ownBase(){
 const configured=process.env.CRICKET_SCRAPER_URL||process.env.NEXT_PUBLIC_CRICKET_SCRAPER_URL;
 if(configured)return configured.replace(/\/$/,"");
 if(process.env.VERCEL_URL)return "https://"+process.env.VERCEL_URL;
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

async function api(path:string,revalidate:number){
 const k=process.env.CRICAPI_KEY;if(!k)return null;
 const sep=path.includes("?")?"&":"?";
 const res=await fetch(API+"/"+path+sep+"apikey="+k,{next:{revalidate}});
 if(!res.ok)throw new Error("Cricket provider unavailable");
 return res.json();
}

/* Primary source: self-hosted scraper. Fallback: existing CricAPI quota source. */
export async function getCurrentMatches():Promise<CricketMatch[]>{
 try{
   const j=await own("/api/live",60);
   const data=Array.isArray(j?.data)?j.data:[];
   if(data.length)return data;
 }catch{}
 try{
   const j=await api("currentMatches?offset=0",1800);
   return Array.isArray(j?.data)?j.data:[];
 }catch{return []}
}

export async function getMatch(id:string):Promise<any|null>{
 try{
   const live=await getCurrentMatches();
   const found=live.find(m=>String(m.id)===String(id));
   if(found)return found;
 }catch{}
 try{
   const j=await api("match_info?id="+encodeURIComponent(id),3600);
   return j?.data||null;
 }catch{return null}
}

function normalizeSelfHostedScore(j:any,id:string){
 if(!j||j.status!=="success")return null;
 const batting=(j.current_batsmen||[]).map((p:any)=>({
   batsman:p.name,
   runs:Number((String(p.score||"").match(/^(\d+)/)||[])[1])||0,
   balls:Number((String(p.score||"").match(/\((\d+)\)/)||[])[1])||0,
 }));
 const m=String(j.score||"").match(/(\d+)\/(\d+)\s*\(([\d.]+)\)/);
 const bowling=j.current_bowler?.name&&j.current_bowler.name!=="Not available"
   ?[{bowler:j.current_bowler.name,overs:"—",runs:"—",wickets:"—"}]:[];
 return {
   id,
   name:j.title||"Live Match",
   status:"Live data from self-hosted scraper",
   scorecard:[{
     inning:j.title||"Live innings",
     total:m?{runs:Number(m[1]),wickets:Number(m[2]),overs:m[3]}:{},
     batting,
     bowling,
   }],
   source:"self-hosted-scraper",
 };
}

export async function getScorecard(id:string):Promise<any|null>{
 try{
   const j=await own("/api/score?score="+encodeURIComponent(id),30);
   const normalized=normalizeSelfHostedScore(j,id);
   if(normalized)return normalized;
 }catch{}
 try{
   const j=await api("match_scorecard?id="+encodeURIComponent(id),3600);
   return j?.data||null;
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
