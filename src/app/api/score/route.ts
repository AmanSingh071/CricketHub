import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const HEADERS={
  "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer":"https://www.cricbuzz.com/",
  "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language":"en-US,en;q=0.9"
};

function decodeUnicodeEscape(value:string){
  // Decode one escape layer from Cricbuzz's Next.js RSC string payload.
  // Do not double backslashes: doing that leaves scorecardApiData escaped.
  try{return JSON.parse('"'+value.replace(/"/g,'\\\"')+'"')}catch{}
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
    .replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\\t/g,"\t")
    .replace(/\\\"/g,'"').replace(/\\\\/g,"\\");
}

function extractBalanced(text:string,start:number){
  if(start<0||text[start]!=="{")return null;
  let depth=0,inString=false,escape=false;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(inString){if(escape){escape=false;continue}if(c==="\\"){escape=true;continue}if(c==='"')inString=false;continue}
    if(c==='"'){inString=true;continue}
    if(c==="{")depth++;
    if(c==="}"&&--depth===0)return text.slice(start,i+1);
  }
  return null;
}

function extractScorecardApiData(html:string){
  const idx=html.indexOf("scorecardApiData");
  if(idx===-1)return null;

  // Exact scraper pattern used by the working Cricbuzz v2 project:
  // find the RSC push immediately before scorecardApiData and decode that chunk.
  const start=html.lastIndexOf("self.__next_f.push",idx);
  if(start<0)return null;
  const chunk=html.slice(start);
  const firstQuote=chunk.indexOf('"');
  if(firstQuote<0)return null;

  const markers=['"]\n','"])','"]</script>'];
  let end=-1;
  for(const marker of markers){
    const p=chunk.indexOf(marker,firstQuote+1);
    if(p!==-1){end=p;break}
  }
  if(end<0)return null;

  let payload=chunk.slice(firstQuote+1,end);
  payload=decodeUnicodeEscape(payload);

  const key=payload.indexOf("scorecardApiData");
  if(key<0)return null;
  const brace=payload.indexOf("{",key);
  const raw=extractBalanced(payload,brace);
  if(!raw)return null;
  try{
    const data=JSON.parse(raw);
    return Array.isArray(data?.scoreCard)?data:null;
  }catch{return null}
}

function normalize(data:any,id:string){
  // extractScorecardApiData can return either the full Cricbuzz object or
  // the scoreCard array itself. The previous implementation only accepted
  // the object shape, so a successfully scraped array was discarded.
  const cards=Array.isArray(data)?data:Array.isArray(data?.scoreCard)?data.scoreCard:[];
  const innings=cards.map((sc:any,index:number)=>{
    const score=sc?.scoreDetails||{};
    const bat=sc?.batTeamDetails||{};
    const bowl=sc?.bowlTeamDetails||{};
    const batting=Object.values(bat?.batsmenData||{}).map((p:any)=>({
      batsman:p?.batName||"",
      dismissal:p?.outDesc||"batting",
      runs:p?.runs??"",
      balls:p?.balls??"",
      fours:p?.fours??"",
      sixes:p?.sixes??"",
      strikeRate:p?.strikeRate??""
    })).filter((p:any)=>p.batsman);
    const bowling=Object.values(bowl?.bowlersData||{}).map((p:any)=>({
      bowler:p?.bowlName||"",
      overs:p?.overs??"",
      maidens:p?.maidens??"",
      runs:p?.runs??"",
      wickets:p?.wickets??"",
      noBalls:p?.noBalls??p?.no_balls??"",
      wides:p?.wides??"",
      economy:p?.economy??""
    })).filter((p:any)=>p.bowler);
    return {
      inning:bat?.batTeamName||"Innings "+(index+1),
      batting,bowling,
      extras:{runs:score?.extras??""},
      total:{runs:score?.runs,wickets:score?.wickets,overs:score?.overs}
    };
  }).filter((x:any)=>x.batting.length||x.bowling.length||x.total.runs!==undefined);

  const header=data?.matchHeader||{};
  const playing:any={};
  for(const sc of cards){
    const team=sc?.batTeamDetails||{};
    const names=Object.values(team?.batsmenData||{}).map((p:any)=>p?.batName).filter(Boolean);
    if(team?.batTeamName&&names.length)playing[team.batTeamName]=Array.from(new Set(names));
  }

  return {
    status:"success",
    id,
    name:header?.matchDescription||header?.seriesName||"Detailed Scorecard",
    matchStatus:header?.status||"Live",
    scorecard:innings,
    playingEleven:playing,
    toss:header?.tossResults?.tossWinnerName?{winner:header.tossResults.tossWinnerName,decision:header.tossResults.decision||""}:null,
    result:header?.result?.winningTeam?{winner:header.result.winningTeam,margin:header.result.winningMargin,byRuns:header.result.winByRuns,byInnings:header.result.winByInnings}:null,
    source:"cricbuzz-next-rsc"
  };
}

function liveFallback(raw:any,id:string){
  const m=raw?.miniscore||{};
  const h=raw?.matchHeader||{};
  const bt=m?.batTeam||{};
  const striker=m?.batsmanStriker||{};
  const non=m?.batsmanNonStriker||{};
  const bowler=m?.bowlerStriker||{};
  const team=m?.batTeamScoreObj?.teamName||"Current innings";
  const batting=[
    {batsman:striker?.name||"",dismissal:"batting",runs:striker?.runs??"",balls:striker?.balls??"",fours:striker?.fours??"",sixes:striker?.sixes??"",strikeRate:striker?.strikeRate??""},
    {batsman:non?.name||"",dismissal:"batting",runs:non?.runs??"",balls:non?.balls??"",fours:non?.fours??"",sixes:non?.sixes??"",strikeRate:non?.strikeRate??""}
  ].filter(x=>x.batsman);
  const bowling=[{
    bowler:bowler?.name||"",
    overs:bowler?.overs??bowler?.bowlOvs??"",
    maidens:bowler?.maidens??"",
    runs:bowler?.runs??bowler?.bowlRuns??"",
    wickets:bowler?.wickets??bowler?.bowlWkts??"",
    noBalls:"",
    wides:"",
    economy:bowler?.economy??bowler?.bowlEcon??""
  }].filter(x=>x.bowler);

  if(!batting.length&&!bowling.length&&bt?.teamScore===undefined)return null;

  return {
    status:"success",id,
    name:h?.matchDescription||h?.seriesName||"Live Score",
    matchStatus:m?.status||h?.status||"Live",
    scorecard:[{
      inning:team,
      batting,bowling,
      extras:{runs:""},
      total:{runs:bt?.teamScore??m?.teamScore,wickets:bt?.teamWkts??m?.teamWkts,overs:m?.overs}
    }],
    playingEleven:{},
    source:"cricbuzz-mcenter-live"
  };
}

async function fetchText(url:string){
  const r=await fetch(url,{cache:"no-store",headers:HEADERS,redirect:"follow"});
  const text=await r.text();
  return {r,text};
}

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("score")||"";
  if(!/^\d+$/.test(id))return NextResponse.json({status:"error",message:"Invalid Cricbuzz match id"},{status:400});

  const debug:string[]=[];

  // Primary: exact Next.js scorecard RSC scrape.
  try{
    const {r,text}=await fetchText("https://www.cricbuzz.com/live-cricket-scorecard/"+id);
    debug.push("scorecard HTTP "+r.status+" bytes="+text.length);
    if(r.ok){
      const embedded=extractScorecardApiData(text);
      if(embedded){
        const normalized=normalize(embedded,id);
        if(normalized.scorecard.length)return NextResponse.json(normalized,{headers:{"Cache-Control":"no-store"}});
        debug.push("RSC parsed but innings were empty");
      }else debug.push("scorecardApiData not extracted");
    }
  }catch(e){debug.push("scorecard fetch failed: "+(e instanceof Error?e.message:"unknown"))}

  // Secondary: current live-state endpoint.
  try{
    const r=await fetch("https://www.cricbuzz.com/api/mcenter/comm/"+id,{cache:"no-store",headers:{...HEADERS,Accept:"application/json"}});
    const text=await r.text();
    debug.push("mcenter HTTP "+r.status+" bytes="+text.length);
    if(r.ok){
      const j=JSON.parse(text);
      const fallback=liveFallback(j,id);
      if(fallback)return NextResponse.json(fallback,{headers:{"Cache-Control":"no-store"}});
    }
  }catch(e){debug.push("mcenter failed: "+(e instanceof Error?e.message:"unknown"))}

  return NextResponse.json({
    status:"error",
    message:"Cricbuzz did not return scorecard data for this match",
    debug
  },{status:502,headers:{"Cache-Control":"no-store"}});
}