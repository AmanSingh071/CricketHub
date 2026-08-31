import { NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

type Score={inning:string;r:number|null;w:number|null;o:string};
type Match={id:string;name:string;teams:string[];teamInfo:{name:string}[];score:Score[];status:string;matchStarted:boolean;matchEnded:boolean;source:string;matchType?:string};

const H={
  "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "accept-language":"en-US,en;q=0.9",
  "referer":"https://www.cricbuzz.com/",
  "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const clean=(v:any)=>String(v??"")
  .replace(/<[^>]*>/g," ")
  .replace(/&nbsp;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&#39;/g,"'")
  .replace(/&quot;/gi,'"')
  .replace(/\s+/g," ")
  .trim();

const stripLive=(s:string)=>clean(s)
  .replace(/\bLIVE\b/gi,"")
  .replace(/\s+(?:\d+(?:st|nd|rd|th)\s+)?(?:Match|Test|ODI|T20I|T20|Final|Semi-Final|Qualifier).*$/i,"")
  .trim();

const split=(s:string)=>{
  const m=s.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*,|$)/i);
  return m?[m[1].trim(),m[2].trim()]:[];
};

const terminal=(s:string)=>/\b(?:won by|match drawn|drawn|no result|abandoned|abandon|cancelled|match over|match completed|complete|concluded|result)\b/i.test(s);
const upcoming=(s:string)=>/\b(?:match starts at|scorecard will appear once the match starts|has not started|starts at)\b/i.test(s);

function htmlLines(html:string){
  const text=html
    .replace(/<script[\s\S]*?<\/script>/gi,"")
    .replace(/<style[\s\S]*?<\/style>/gi,"")
    .replace(/<(?:br|\/p|\/div|\/span|\/li|\/tr|\/td|\/th|h[1-6])\b[^>]*>/gi,"\n")
    .replace(/<[^>]*>/g,"\n")
    .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'");
  return text.split(/\n+/).map(clean).filter(Boolean);
}

function parseScore(lines:string[],teams:string[]):Score[]{
  const out:Score[]=[];
  const seen=new Set<string>();
  for(let i=0;i<lines.length;i++){
    if(!/\b(?:1st|2nd|3rd|4th)\s+Inn(?:ings)?\b/i.test(lines[i]))continue;
    const block=lines.slice(i,Math.min(lines.length,i+80));
    const joined=block.join(" ");
    const m=joined.match(/(?:Total\s*)?(\d+)\s*-\s*(\d+)(?:\s*(?:d|all out))?\s*\(([\d.]+)\s*(?:Ov|Overs)\b/i);
    if(!m)continue;
    const team=clean(lines[i].replace(/\s+(?:1st|2nd|3rd|4th)\s+Inn(?:ings)?\b.*$/i,""))||teams[out.length]||"Innings";
    const row={inning:lines[i],r:Number(m[1]),w:Number(m[2]),o:m[3]};
    const key=JSON.stringify(row);
    if(!seen.has(key)){seen.add(key);out.push(row);}
  }
  if(!out.length){
    const joined=lines.join(" ");
    const m=joined.match(/\b(\d+)\s*-\s*(\d+)\s*\(([\d.]+)\s*(?:Ov|Overs)\b/i);
    if(m)out.push({inning:teams[0]||"Current innings",r:Number(m[1]),w:Number(m[2]),o:m[3]});
  }
  return out.slice(0,4);
}

function extractStatus(lines:string[]){
  const joined=lines.join(" ");
  const end=joined.match(/(?:[A-Z][A-Za-z .&'()\-]{1,80}\s+won by\s+[^.]{1,100}|Match drawn|No result|Abandoned)/i);
  if(end)return clean(end[0]);
  const live=lines.find(x=>/\b(?:Day\s+\d+.*(?:Session|Stumps|Lunch|Tea)|Innings Break|Rain Delay|Rain|Stumps|Lunch|Tea)\b/i.test(x));
  return live?clean(live):"Live";
}

function extractCandidates(html:string){
  const out=new Map<string,{id:string;name:string;slug:string}>();
  const re=/<a\b([^>]*?)href=["']([^"']*\/live-cricket-(?:scores|scorecard)\/(\d+)(?:\/[^"']*)?)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let m:RegExpExecArray|null;
  while((m=re.exec(html))){
    const id=m[3];
    const attrs=(m[1]+" "+m[4]);
    const title=attrs.match(/\btitle=["']([^"']+)["']/i)?.[1]||"";
    const aria=attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1]||"";
    const name=stripLive(title||aria||clean(m[5]));
    const teams=split(name);
    if(!/^\d+$/.test(id)||teams.length!==2||name.length>140)continue;
    out.set(id,{id,name:name.replace(/\s*,\s*$/,""),slug:m[2]});
  }
  return [...out.values()];
}

async function get(url:string){
  const r=await fetch(url,{cache:"no-store",headers:H,redirect:"follow"});
  const text=await r.text();
  if(!r.ok)throw new Error("HTTP "+r.status);
  return text;
}

async function verify(candidate:{id:string;name:string;slug:string}):Promise<Match|null>{
  const [a,b]=await Promise.allSettled([
    get("https://m.cricbuzz.com/live-cricket-scorecard/"+candidate.id),
    get("https://www.cricbuzz.com"+candidate.slug)
  ]);
  const html=a.status==="fulfilled" ? a.value : (b.status==="fulfilled" ? b.value : "");
  if(!html)return null;
  const text=clean(html);
  if(terminal(text)||upcoming(text))return null;

  const teams=split(candidate.name);
  if(teams.length!==2)return null;
  const lines=htmlLines(html);
  const score=parseScore(lines,teams);
  const status=extractStatus(lines);

  // A candidate is live only when the match page has an active score surface.
  // This prevents unrelated "LIVE" labels elsewhere on Cricbuzz from reviving
  // old completed matches.
  const hasActiveSignal=score.length>0||/\b(?:day\s+\d+|session|innings break|stumps|rain delay|lunch|tea)\b/i.test(text);
  if(!hasActiveSignal)return null;

  return {
    id:candidate.id,
    name:candidate.name,
    teams,
    teamInfo:teams.map(name=>({name})),
    score,
    status,
    matchStarted:true,
    matchEnded:false,
    source:"cricbuzz-verified-html"
  };
}

export async function GET(){
  const debug:any[]=[];
  try{
    const html=await get("https://www.cricbuzz.com/cricket-match/live-scores");
    const candidates=extractCandidates(html);
    debug.push({source:"listing",ok:true,candidates:candidates.length});

    const checked=await Promise.all(candidates.slice(0,24).map(async c=>{
      try{return await verify(c);}catch{return null;}
    }));
    const data=checked.filter(Boolean) as Match[];
    debug.push({source:"verification",ok:true,live:data.length});

    return NextResponse.json(
      {ok:true,data,debug,fetchedAt:new Date().toISOString()},
      {headers:{"Cache-Control":"no-store, max-age=0"}}
    );
  }catch(e){
    return NextResponse.json(
      {ok:false,data:[],message:e instanceof Error?e.message:"Live feed failed",debug},
      {status:502,headers:{"Cache-Control":"no-store, max-age=0"}}
    );
  }
}