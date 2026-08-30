import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const HEADERS={"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36","accept":"application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8","accept-language":"en-US,en;q=0.9","referer":"https://www.cricbuzz.com/"};

function clean(s:any){return String(s??"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim()}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n:v}
function balanced(t:string,start:number){if(start<0||t[start]!=="{")return null;let d=0,q=false,e=false;for(let i=start;i<t.length;i++){const c=t[i];if(q){if(e)e=false;else if(c==="\\")e=true;else if(c==='"')q=false;continue}if(c==='"'){q=true;continue}if(c==="{")d++;else if(c==="}"&&--d===0)return t.slice(start,i+1)}return null}

async function getJson(url:string){
  const r=await fetch(url,{cache:"no-store",headers:HEADERS,redirect:"follow"});
  const text=await r.text();
  if(!r.ok)throw new Error("HTTP "+r.status+" from "+new URL(url).hostname);
  try{return JSON.parse(text)}catch{throw new Error("Non-JSON response from "+new URL(url).hostname)}
}

function extractRsc(html:string){
  let from=0;
  while(true){
    const idx=html.indexOf("scorecardApiData",from); if(idx<0)return null;
    const push=html.lastIndexOf("self.__next_f.push",idx);
    if(push>=0){
      const chunk=html.slice(push); const a=chunk.indexOf('"');
      if(a>=0){let b=-1,esc=false;for(let i=a+1;i<chunk.length;i++){const c=chunk[i];if(esc){esc=false;continue}if(c==="\\"){esc=true;continue}if(c==='"'){b=i;break}}
        if(b>a){try{const decoded=JSON.parse(chunk.slice(a,b+1));const k=decoded.indexOf("scorecardApiData");const raw=balanced(decoded,decoded.indexOf("{",k));if(raw){const data=JSON.parse(raw);if(Array.isArray(data?.scoreCard))return data}}catch{}}
      }
    }
    from=idx+16;
  }
}

function normalizeNative(data:any,id:string,source:string){
  const cards=Array.isArray(data?.scoreCard)?data.scoreCard:[];
  const innings=cards.map((sc:any,i:number)=>{
    const sd=sc?.scoreDetails||{},bd=sc?.batTeamDetails||{},wd=sc?.bowlTeamDetails||{};
    const batting=Object.values(bd?.batsmenData||{}).map((x:any)=>({batsman:x?.batName||x?.name||"",dismissal:x?.outDesc||"not out",runs:x?.runs??"",balls:x?.balls??"",fours:x?.fours??"",sixes:x?.sixes??"",strikeRate:x?.strikeRate??""})).filter((x:any)=>x.batsman);
    const bowling=Object.values(wd?.bowlersData||{}).map((x:any)=>({bowler:x?.bowlName||x?.name||"",overs:x?.overs??"",maidens:x?.maidens??"",runs:x?.runs??"",wickets:x?.wickets??"",noBalls:x?.no_balls??x?.noBalls??"",wides:x?.wides??"",economy:x?.economy??""})).filter((x:any)=>x.bowler);
    return {inning:bd?.batTeamName||"Innings "+(i+1),batting,bowling,extras:{runs:sd?.extras??""},total:{runs:sd?.runs,wickets:sd?.wickets,overs:sd?.overs}};
  }).filter((x:any)=>x.batting.length||x.bowling.length||x.total.runs!==undefined);
  const h=data?.matchHeader||{};
  return {status:"success",id,name:h?.matchDescription||h?.seriesName||"Detailed Scorecard",matchStatus:h?.status||"Live",scorecard:innings,toss:h?.tossResults?.tossWinnerName?{winner:h.tossResults.tossWinnerName,decision:h.tossResults.decision||""}:null,result:h?.result?.winningTeam?{winner:h.result.winningTeam,margin:h.result.winningMargin,byRuns:h.result.winByRuns,byInnings:h.result.winByInnings}:null,playingEleven:{},source};
}

function normalizeBridge(raw:any,id:string,source:string){
  const d=raw?.data||raw?.result||raw;
  // Common unofficial Cricbuzz wrappers expose innings under one of these keys.
  const candidate=d?.scorecard||d?.scoreCard||d?.innings||d?.scoreCardData||[];
  const arr=Array.isArray(candidate)?candidate:[];
  const innings=arr.map((inn:any,i:number)=>{
    const bat=inn?.batting||inn?.Batsman||inn?.batsmen||inn?.batsman||[];
    const bowl=inn?.bowling||inn?.Bowlers||inn?.bowlers||[];
    const bArr=Array.isArray(bat)?bat:Object.values(bat||{});
    const bwArr=Array.isArray(bowl)?bowl:Object.values(bowl||{});
    return {inning:inn?.inning||inn?.team||inn?.battingTeam||inn?.batTeamName||"Innings "+(i+1),
      batting:bArr.map((x:any)=>({batsman:x?.name||x?.batsman||x?.batName||x?.player||"",dismissal:x?.dismissal||x?.outDesc||"not out",runs:x?.runs??x?.R??"",balls:x?.balls??x?.B??"",fours:x?.fours??x?.["4s"]??"",sixes:x?.sixes??x?.["6s"]??"",strikeRate:x?.sr??x?.strikeRate??""})).filter((x:any)=>x.batsman),
      bowling:bwArr.map((x:any)=>({bowler:x?.name||x?.bowler||x?.bowlName||x?.player||"",overs:x?.overs??x?.O??"",maidens:x?.maidens??x?.M??"",runs:x?.runs??x?.R??"",wickets:x?.wickets??x?.W??x?.wicket??"",noBalls:x?.noBalls??x?.no_balls??"",wides:x?.wides??"",economy:x?.economy??x?.econ??""})).filter((x:any)=>x.bowler),
      extras:{runs:inn?.extras?.runs??inn?.extras??""},total:{runs:inn?.runs??inn?.score?.runs,wickets:inn?.wickets??inn?.score?.wickets,overs:inn?.overs??inn?.score?.overs}
    };
  }).filter((x:any)=>x.batting.length||x.bowling.length||x.total.runs!==undefined);
  return {status:"success",id,name:clean(d?.title||d?.name||d?.matchTitle||"Detailed Scorecard"),matchStatus:clean(d?.update||d?.status||"Live"),scorecard:innings,playingEleven:d?.playingEleven||d?.playing_eleven||{},source};
}

function miniScore(raw:any,id:string){
  const m=raw?.miniscore||raw?.miniScore||{};
  const h=raw?.matchHeader||{};
  const score=m?.batTeam||{};
  const striker=m?.batsmanStriker||{},non=m?.batsmanNonStriker||{},bowler=m?.bowlerStriker||m?.bowler||{};
  const team=m?.batTeamScoreObj?.teamName||h?.team1?.teamName||"Current innings";
  const bat=[
    {batsman:striker?.name||striker?.batName||"",dismissal:"batting",runs:striker?.runs??"",balls:striker?.balls??"",fours:striker?.fours??"",sixes:striker?.sixes??"",strikeRate:striker?.strikeRate??striker?.sr??""},
    {batsman:non?.name||non?.batName||"",dismissal:"batting",runs:non?.runs??"",balls:non?.balls??"",fours:non?.fours??"",sixes:non?.sixes??"",strikeRate:non?.strikeRate??non?.sr??""}
  ].filter(x=>x.batsman);
  const bowl=[{bowler:bowler?.name||bowler?.bowlName||"",overs:bowler?.overs??bowler?.bowlOvs??"",maidens:bowler?.maidens??"",runs:bowler?.runs??bowler?.bowlRuns??"",wickets:bowler?.wickets??bowler?.bowlWkts??"",economy:bowler?.economy??bowler?.bowlEcon??""}].filter(x=>x.bowler);
  const runs=score?.teamScore??m?.teamScore, wickets=score?.teamWkts??m?.teamWkts, overs=m?.overs;
  if(!bat.length&&!bowl.length&&runs===undefined)return null;
  return {status:"success",id,name:h?.matchDescription||h?.seriesName||"Live Score",matchStatus:m?.status||h?.status||"Live",scorecard:[{inning:team,batting:bat,bowling:bowl,extras:{runs:""},total:{runs,wickets,overs}}],playingEleven:{},source:"cricbuzz-public-live-json"};
}

async function tryDirect(id:string){
  const errors:string[]=[];
  // 1) Structured scorecard page scrape.
  try{
    const r=await fetch("https://www.cricbuzz.com/live-cricket-scorecard/"+id,{cache:"no-store",headers:HEADERS});
    const html=await r.text();
    if(r.ok){const data=extractRsc(html);if(data)return {data:normalizeNative(data,id,"cricbuzz-direct-rsc"),errors};errors.push("direct page reached but scorecard payload was absent")}
    else errors.push("direct scorecard HTTP "+r.status);
  }catch(e){errors.push(e instanceof Error?e.message:"direct scorecard failed")}
  // 2) Public live JSON, independent of HTML/RSC parsing.
  try{const j=await getJson("https://www.cricbuzz.com/api/mcenter/comm/"+id);const data=miniScore(j,id);if(data)return {data,errors};errors.push("public live JSON had no score")}catch(e){errors.push(e instanceof Error?e.message:"public live JSON failed")}
  // 3) Detailed bridge scraper, only as a resilience fallback.
  try{const j=await getJson("https://cric-api.vercel.app/i?id="+encodeURIComponent(id));const data=normalizeBridge(j,id,"fallback-detailed-scraper");if(data.scorecard.length)return {data,errors};errors.push("detailed bridge returned no innings")}catch(e){errors.push(e instanceof Error?e.message:"detailed bridge failed")}
  // 4) Last-resort live scraper bridge.
  try{const j=await getJson("https://cricbuzz-live.vercel.app/v1/score/"+encodeURIComponent(id));const d=j?.data||{};const score=String(d?.liveScore||"").match(/(.*?)\s*(\d+)\s*[\/-]\s*(\d+)\s*\(([^)]+)\)/);const bat=[{batsman:d?.batsmanOne||"",dismissal:"batting",runs:d?.batsmanOneRun||"",balls:String(d?.batsmanOneBall||"").replace(/[()]/g,""),fours:"",sixes:"",strikeRate:d?.batsmanOneSR||""},{batsman:d?.batsmanTwo||"",dismissal:"batting",runs:d?.batsmanTwoRun||"",balls:String(d?.batsmanTwoBall||"").replace(/[()]/g,""),fours:"",sixes:"",strikeRate:d?.batsmanTwoSR||""}].filter(x=>x.batsman);const bowl=[{bowler:d?.bowlerOne||"",overs:d?.bowlerOneOver||"",maidens:"",runs:d?.bowlerOneRun||"",wickets:d?.bowlerOneWickets||"",economy:d?.bowlerOneEconomy||""},{bowler:d?.bowlerTwo||"",overs:d?.bowlerTwoOver||"",maidens:"",runs:d?.bowlerTwoRun||"",wickets:d?.bowlerTwoWicket||"",economy:d?.bowlerTwoEconomy||""}].filter(x=>x.bowler);if(bat.length||bowl.length||score)return {data:{status:"success",id,name:d?.title||"Live Score",matchStatus:d?.update||"Live",scorecard:[{inning:score?.[1]?.trim()||"Current innings",batting:bat,bowling:bowl,extras:{runs:""},total:{runs:score?num(score[2]):"",wickets:score?num(score[3]):"",overs:score?.[4]||""}}],playingEleven:{},source:"fallback-live-scraper"},errors};errors.push("live bridge returned no player data")}catch(e){errors.push(e instanceof Error?e.message:"live bridge failed")}
  return {data:null,errors};
}

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("score")||"";
  if(!/^\d+$/.test(id))return NextResponse.json({status:"error",message:"Invalid match id"},{status:400});
  const {data,errors}=await tryDirect(id);
  if(data)return NextResponse.json({...data,debug:process.env.NODE_ENV==="development"?errors:undefined},{headers:{"Cache-Control":"no-store, max-age=0"}});
  return NextResponse.json({status:"error",message:"Scorecard source temporarily unavailable",debug:errors},{status:502});
}