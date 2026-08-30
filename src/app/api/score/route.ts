import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtml(s:string){
  return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/&#x27;/gi,"'");
}
function clean(s:string){
  return decodeHtml(s.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
}
function balancedObject(text:string,start:number){
  if(start<0||text[start]!=="{") return null;
  let depth=0,inString=false,escaped=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i];
    if(inString){
      if(escaped){escaped=false;continue;}
      if(ch==="\\"){escaped=true;continue;}
      if(ch==='"')inString=false;
      continue;
    }
    if(ch==='"'){inString=true;continue;}
    if(ch==="{")depth++;
    else if(ch==="}"){
      depth--;
      if(depth===0)return text.slice(start,i+1);
    }
  }
  return null;
}
function extractEmbeddedScorecard(html:string){
  // Cricbuzz now renders scorecardApiData inside Next.js RSC self.__next_f.push payloads.
  const re=/self\.__next_f\.push\(\[\d+,\s*("(?:(?:\\.)|[^"])*")\]\)/g;
  let m:RegExpExecArray|null;
  const chunks:string[]=[];
  while((m=re.exec(html))){
    try{chunks.push(JSON.parse(m[1]));}catch{}
  }
  // Some pages split the RSC payload; inspect the whole decoded stream as well.
  const decoded=chunks.join("\n");
  const candidates=[decoded,html];
  for(const text of candidates){
    let from=0;
    while(true){
      const key=text.indexOf("scorecardApiData",from);
      if(key<0)break;
      const start=text.indexOf("{",key);
      const json=balancedObject(text,start);
      if(json){
        try{
          const parsed=JSON.parse(json);
          if(parsed&&typeof parsed==="object"&&(parsed.scoreCard||parsed.matchHeader))return parsed;
        }catch{}
      }
      from=key+"scorecardApiData".length;
    }
  }
  return null;
}
function normalizeScorecard(data:any,id:string){
  const scoreCards=Array.isArray(data?.scoreCard)?data.scoreCard:[];
  const innings=scoreCards.map((sc:any,index:number)=>{
    const score=sc?.scoreDetails||{};
    const bat=sc?.batTeamDetails||{};
    const bowl=sc?.bowlTeamDetails||{};
    const batData=bat?.batsmenData||{};
    const bowlData=bowl?.bowlersData||{};
    const batting=Object.values(batData).map((p:any)=>({
      batsman:p?.batName||p?.batNameShort||p?.name||"",
      dismissal:p?.outDesc||p?.outDescription||"not out",
      runs:p?.runs??"",
      balls:p?.balls??"",
      fours:p?.fours??"",
      sixes:p?.sixes??"",
      strikeRate:p?.strikeRate??"",
    })).filter((p:any)=>p.batsman);
    const bowling=Object.values(bowlData).map((p:any)=>({
      bowler:p?.bowlName||p?.bowlNameShort||p?.name||"",
      overs:p?.overs??"",
      maidens:p?.maidens??"",
      runs:p?.runs??"",
      wickets:p?.wickets??"",
      noBalls:p?.no_balls??p?.noBalls??"",
      wides:p?.wides??"",
      economy:p?.economy??"",
    })).filter((p:any)=>p.bowler);
    return {
      inning:bat?.batTeamName||score?.batTeamName||"Innings "+(index+1),
      batting,
      bowling,
      extras:{runs:score?.extras??""},
      total:{runs:score?.runs,wickets:score?.wickets,overs:score?.overs},
    };
  }).filter((x:any)=>x.batting.length||x.bowling.length||x.total.runs!==undefined);

  const header=data?.matchHeader||{};
  const toss=header?.tossResults||{};
  const result=header?.result||{};
  const teamPlayers:any={};
  for(const sc of scoreCards){
    const team=sc?.batTeamDetails?.batTeamName;
    const players=Object.values(sc?.batTeamDetails?.batsmenData||{}).map((p:any)=>p?.batName).filter(Boolean);
    if(team&&players.length)teamPlayers[team]=players;
  }
  return {
    status:"success",
    id,
    name:header?.matchDescription||header?.seriesName||"Detailed Scorecard",
    matchStatus:header?.status||"Live",
    scorecard:innings,
    toss:toss?.tossWinnerName?{winner:toss.tossWinnerName,decision:toss.decision||""}:null,
    result:result?.winningTeam?{winner:result.winningTeam,margin:result.winningMargin,byRuns:result.winByRuns,byInnings:result.winByInnings}:null,
    playingEleven:teamPlayers,
    source:"cricketHub-nextjs-rsc-scraper",
  };
}

// Fallback for older/static Cricbuzz HTML.
function fallbackParse(html:string,id:string){
  const title=clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"Detailed Scorecard").replace(/\s*-\s*Cricbuzz.*$/i,"");
  const status=clean((html.match(/class=["'][^"']*(?:cb-text-live|cb-text-complete|cb-text-preview|cb-min-stts)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)||[])[1]||"")||"Live";
  return {status:"success",id,name:title,matchStatus:status,scorecard:[],source:"cricketHub-html-fallback"};
}

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("score")||"";
  if(!/^\d+$/.test(id))return NextResponse.json({status:"error",message:"Invalid match id"},{status:400});
  try{
    const r=await fetch("https://www.cricbuzz.com/live-cricket-scorecard/"+id,{
      cache:"no-store",
      headers:{"user-agent":UA,"referer":"https://www.cricbuzz.com/","accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","accept-language":"en-US,en;q=0.9"}
    });
    const html=await r.text();
    if(!r.ok)return NextResponse.json({status:"error",message:"Score source returned HTTP "+r.status});
    const embedded=extractEmbeddedScorecard(html);
    const data=embedded?normalizeScorecard(embedded,id):fallbackParse(html,id);
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store, max-age=0"}});
  }catch(e){
    return NextResponse.json({status:"error",message:e instanceof Error?e.message:"Score source temporarily unavailable"});
  }
}