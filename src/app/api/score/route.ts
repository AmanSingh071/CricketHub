import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const HEADERS={
  "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language":"en-US,en;q=0.9",
  "referer":"https://www.cricbuzz.com/"
};

function clean(s:string){return s.replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim()}

function extractBalanced(text:string,start:number){
  if(start<0||text[start]!=="{")return null;
  let depth=0,inString=false,escape=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i];
    if(inString){
      if(escape){escape=false;continue}
      if(ch==="\\"){escape=true;continue}
      if(ch==='"')inString=false;
      continue;
    }
    if(ch==='"'){inString=true;continue}
    if(ch==="{")depth++;
    else if(ch==="}"&&--depth===0)return text.slice(start,i+1);
  }
  return null;
}

/*
 Exact Next.js/RSC extraction strategy:
 find scorecardApiData -> find the self.__next_f.push chunk immediately before it ->
 decode the quoted JS payload -> extract the balanced JSON object.
*/
function extractScorecardApiData(html:string){
  let from=0;
  while(true){
    const idx=html.indexOf("scorecardApiData",from);
    if(idx<0)return null;
    const push=html.lastIndexOf("self.__next_f.push",idx);
    if(push>=0){
      const chunk=html.slice(push);
      const q1=chunk.indexOf('"');
      if(q1>=0){
        let q2=-1,escaped=false;
        for(let i=q1+1;i<chunk.length;i++){
          const ch=chunk[i];
          if(escaped){escaped=false;continue}
          if(ch==="\\"){escaped=true;continue}
          if(ch==='"'){q2=i;break}
        }
        if(q2>q1){
          const raw=chunk.slice(q1,q2+1);
          try{
            const decoded=JSON.parse(raw);
            const key=decoded.indexOf("scorecardApiData");
            const start=decoded.indexOf("{",key);
            const json=extractBalanced(decoded,start);
            if(json){
              const parsed=JSON.parse(json);
              if(parsed&&Array.isArray(parsed.scoreCard))return parsed;
            }
          }catch{}
        }
      }
    }
    from=idx+"scorecardApiData".length;
  }
}

function normalize(data:any,id:string){
  const scoreCard=Array.isArray(data?.scoreCard)?data.scoreCard:[];
  const innings=scoreCard.map((sc:any,n:number)=>{
    const sd=sc?.scoreDetails||{};
    const bd=sc?.batTeamDetails||{};
    const wd=sc?.bowlTeamDetails||{};
    const batting=Object.values(bd?.batsmenData||{}).map((b:any)=>({
      batsman:b?.batName||"",
      dismissal:b?.outDesc||"not out",
      runs:b?.runs??"",
      balls:b?.balls??"",
      fours:b?.fours??"",
      sixes:b?.sixes??"",
      strikeRate:b?.strikeRate??""
    })).filter((x:any)=>x.batsman);
    const bowling=Object.values(wd?.bowlersData||{}).map((b:any)=>({
      bowler:b?.bowlName||"",
      overs:b?.overs??"",
      maidens:b?.maidens??"",
      runs:b?.runs??"",
      wickets:b?.wickets??"",
      noBalls:b?.no_balls??b?.noBalls??"",
      wides:b?.wides??"",
      economy:b?.economy??""
    })).filter((x:any)=>x.bowler);
    return {
      inning:bd?.batTeamName||"Innings "+(n+1),
      batting,bowling,
      extras:{runs:sd?.extras??""},
      total:{runs:sd?.runs,wickets:sd?.wickets,overs:sd?.overs}
    };
  }).filter((x:any)=>x.batting.length||x.bowling.length||x.total.runs!==undefined);

  const h=data?.matchHeader||{};
  const teams:any={};
  for(const sc of scoreCard){
    const add=(team:any,players:any)=>{
      const name=team?.batTeamName||team?.bowlTeamName;
      const vals=Object.values(players||{}).map((p:any)=>p?.batName||p?.bowlName).filter(Boolean);
      if(name&&vals.length)teams[name]=Array.from(new Set([...(teams[name]||[]),...vals]));
    };
    add(sc?.batTeamDetails,sc?.batTeamDetails?.batsmenData);
    add(sc?.bowlTeamDetails,sc?.bowlTeamDetails?.bowlersData);
  }
  return {
    status:"success",id,
    name:h?.matchDescription||h?.seriesName||"Detailed Scorecard",
    matchStatus:h?.status||"Live",
    scorecard:innings,
    toss:h?.tossResults?.tossWinnerName?{winner:h.tossResults.tossWinnerName,decision:h.tossResults.decision||""}:null,
    result:h?.result?.winningTeam?{winner:h.result.winningTeam,margin:h.result.winningMargin,byRuns:h.result.winByRuns,byInnings:h.result.winByInnings}:null,
    playingEleven:teams,
    source:"cricketHub-cricbuzz-rsc-scraper"
  };
}

function fallbackStatic(html:string,id:string){
  // Static scorecard fallback: retain match title/status and signal that the page was reached.
  const title=clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"Detailed Scorecard");
  const status=clean((html.match(/class=["'][^"']*(?:cb-text-live|cb-text-complete|cb-min-stts)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)||[])[1]||"")||"Live";
  return {status:"success",id,name:title.replace(/\s*-\s*Cricbuzz.*$/i,""),matchStatus:status,scorecard:[],playingEleven:{},source:"cricketHub-static-scraper"};
}

async function fetchScorePage(id:string){
  const urls=[
    "https://www.cricbuzz.com/live-cricket-scorecard/"+id,
    "https://www.cricbuzz.com/live-cricket-scores/"+id
  ];
  const attempts:any[]=[];
  for(const url of urls){
    try{
      const r=await fetch(url,{cache:"no-store",headers:HEADERS,redirect:"follow"});
      const html=await r.text();
      attempts.push({url,status:r.status,bytes:html.length});
      if(r.ok&&html.length>1000)return {html,attempts};
    }catch(e){attempts.push({url,error:e instanceof Error?e.message:"fetch failed"})}
  }
  return {html:"",attempts};
}

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("score")||"";
  if(!/^\d+$/.test(id))return NextResponse.json({status:"error",message:"Invalid Cricbuzz match id"},{status:400});
  try{
    const {html,attempts}=await fetchScorePage(id);
    if(!html)return NextResponse.json({status:"error",message:"Cricbuzz score page could not be reached",debug:attempts},{status:502});
    const embedded=extractScorecardApiData(html);
    const data=embedded?normalize(embedded,id):fallbackStatic(html,id);
    return NextResponse.json({...data,debug:{attempts,embedded:Boolean(embedded)}},{headers:{"Cache-Control":"no-store, max-age=0"}});
  }catch(e){
    return NextResponse.json({status:"error",message:e instanceof Error?e.message:"Score scraper failed"},{status:500});
  }
}