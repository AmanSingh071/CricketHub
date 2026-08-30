export type CricketScore={r?:number;w?:number;o?:number;inning?:string};
export type CricketMatch={id:string;name:string;matchType?:string;status?:string;date?:string;dateTimeGMT?:string;venue?:string;teams?:string[];teamInfo?:{name?:string;shortname?:string;img?:string}[];score?:CricketScore[];matchStarted?:boolean;matchEnded?:boolean;tossWinner?:string;tossChoice?:string};

const API="https://api.cricapi.com/v1";
const key=()=>process.env.CRICAPI_KEY;

async function api(path:string, revalidate=60){
 if(!key()) return null;
 const sep=path.includes("?")?"&":"?";
 const res=await fetch(`${API}/${path}${sep}apikey=${key()}`,{next:{revalidate}});
 if(!res.ok) throw new Error(`Cricket API error ${res.status}`);
 return res.json();
}

export async function getCurrentMatches():Promise<CricketMatch[]>{
 try{const json=await api("currentMatches?offset=0");return Array.isArray(json?.data)?json.data:[]}catch{return []}
}
export async function getMatch(id:string):Promise<any|null>{
 try{const json=await api(`match_info?id=${encodeURIComponent(id)}`,30);return json?.data||null}catch{return null}
}
export function classify(matches:CricketMatch[]){
 return {live:matches.filter(m=>m.matchStarted&&!m.matchEnded),upcoming:matches.filter(m=>!m.matchStarted),recent:matches.filter(m=>m.matchEnded)};
}
export function scoreText(scores?:CricketScore[]){
 if(!scores?.length)return "Score not available";
 return scores.map(s=>`${s.inning||"Innings"} ${s.r??0}/${s.w??0} (${s.o??0})`).join(" • ");
}
