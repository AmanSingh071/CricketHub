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
  const add=(inning:string,r:string,w:string,o:string)=>{
    const row={inning:clean(inning)||teams[out.length]||"Current innings",r:Number(r),w:Number(w),o};
    const key=JSON.stringify(row);
    if(Number.isFinite(row.r)&&Number.isFinite(row.w)&&!seen.has(key)){seen.add(key);out.push(row);}
  };
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const legacy=line.match(/(?:Total\s*)?(\d+)\s*-\s*(\d+)(?:\s*(?:d|all out))?\s*\(([\d.]+)\s*(?:Ov|Overs)\b/i);
    if(legacy){add(line.replace(legacy[0],""),legacy[1],legacy[2],legacy[3]);continue;}
    // Current Cricbuzz markup renders the score as separate text nodes:
    // TEAM / RUNS / - / WICKETS / (OVERS).
    if(!/^\d+$/.test(line))continue;
    const r=line;
    if(lines[i+1]!=="-"||!/^\d+$/.test(lines[i+2]||""))continue;
    const w=lines[i+2];
    const ov=String(lines[i+3]||"").match(/^\(([\d.]+)\)$/);
    if(!ov)continue;
    let team="";
    for(let k=i-1;k>=Math.max(0,i-4);k--){
      if(lines[k]&&!/^\d+$/.test(lines[k])&&lines[k]!=="-"&&!/^\([\d.]+\)$/.test(lines[k])){team=lines[k];break;}
    }
    add(team,r,w,ov[1]);
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
  const [page,mobile]=await Promise.allSettled([
    get("https://www.cricbuzz.com"+candidate.slug),
    get("https://m.cricbuzz.com/live-cricket-scorecard/"+candidate.id)
  ]);
  const html=page.status==="fulfilled" ? page.value : "";
  const mobileHtml=mobile.status==="fulfilled" ? mobile.value : "";
  const source=html||mobileHtml;
  if(!source)return null;

  const lines=htmlLines(source);
  const mobileLines=mobile.status==="fulfilled" ? htmlLines(mobileHtml) : [];
  const teams=split(candidate.name);
  if(teams.length!==2)return null;

  // Cricbuzz currently renders live scores as separate text nodes such as
  // 282 / -7 / (87), while other pages use 282-7 (87). Validate the raw
  // document so either representation works.
  const raw=source.replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ");
  const scoreMatch=raw.match(/\\b(\\d{1,4})\\s*(?:-|\\/|<[^>]*>[-\\/]<[^>]*>)\\s*(\\d{1,2})\\s*(?:<[^>]*>\\s*)?\\((\\d+(?:\\.\\d+)?)\\s*(?:Ov|Overs)?\\)/i)
    || raw.match(/\\b(\\d{1,4})\\s*-\\s*(\\d{1,2})\\s*\\((\\d+(?:\\.\\d+)?)\\)/i);
  const parsed=parseScore(lines,teams);
  const fallback=parseScore(mobileLines,teams);
  const score=parsed.length?parsed:fallback;
  if(!score.length && scoreMatch){
    score.push({inning:teams[0]||"Current innings",r:Number(scoreMatch[1]),w:Number(scoreMatch[2]),o:scoreMatch[3]});
  }

  const joined=lines.join(" ");
  const upcomingNow=/\\b(?:match starts at|scorecard will appear once the match starts|has not started)\\b/i.test(joined);
  const terminalNow=/\\b(?:won by|match drawn|no result|abandoned|cancelled|match completed|concluded|result\\s*[-:])\\b/i.test(joined);
  if(upcomingNow||terminalNow||!score.length)return null;

  const status=extractStatus(lines);
  const name=clean(candidate.name);
  return {
    id:candidate.id,
    name,
    teams,
    teamInfo:teams.map(name=>({name})),
    score:score.slice(0,4),
    status:status==="Live" ? "Live" : status,
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