export type CricketScore={r?:number;w?:number;o?:number;inning?:string};
export type CricketMatch={id:string;name:string;matchType?:string;status?:string;date?:string;dateTimeGMT?:string;venue?:string;teams?:string[];teamInfo?:{name?:string;shortname?:string;img?:string}[];score?:CricketScore[];matchStarted?:boolean;matchEnded?:boolean;tossWinner?:string;tossChoice?:string;seriesId?:string;seriesName?:string};

const API="https://api.cricapi.com/v1";
async function api(path:string,revalidate:number){
 const k=process.env.CRICAPI_KEY;if(!k)return null;
 const sep=path.includes("?")?"&":"?";
 const res=await fetch(API+"/"+path+sep+"apikey="+k,{next:{revalidate}});
 if(!res.ok)throw new Error("Cricket provider unavailable");
 return res.json();
}
/* Cache aggressively: current feed ~48 upstream requests/day max per cache region, not per visitor. */
export async function getCurrentMatches():Promise<CricketMatch[]>{try{const j=await api("currentMatches?offset=0",1800);return Array.isArray(j?.data)?j.data:[]}catch{return []}}
/* Match pages are cached longer to protect a 100-hit/day quota. */
export async function getMatch(id:string):Promise<any|null>{try{const j=await api("match_info?id="+encodeURIComponent(id),3600);return j?.data||null}catch{return null}}
export async function getScorecard(id:string):Promise<any|null>{try{const j=await api("match_scorecard?id="+encodeURIComponent(id),3600);return j?.data||null}catch{return null}}
export function classify(matches:CricketMatch[]){return{live:matches.filter(m=>m.matchStarted&&!m.matchEnded),upcoming:matches.filter(m=>!m.matchStarted),recent:matches.filter(m=>m.matchEnded)}}
export function scoreText(scores?:CricketScore[]){if(!scores?.length)return "Score not available";return scores.map(s=>(s.inning||"Innings")+" "+(s.r??0)+"/"+(s.w??0)+" ("+(s.o??0)+")").join(" • ")}
export function uniqueTeams(matches:CricketMatch[]){const set=new Set<string>();matches.forEach(m=>(m.teams||m.teamInfo?.map(t=>t.name||"")||[]).filter(Boolean).forEach(t=>set.add(t)));return [...set].sort()}
export function uniqueSeries(matches:CricketMatch[]){return [...new Set(matches.map(m=>m.seriesName||m.name.split(",")[0]).filter(Boolean))]}
