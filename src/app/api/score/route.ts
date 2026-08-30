import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const clean=(v:string)=>v.replace(/\s+/g," ").trim();
const num=(v:string)=>{const x=clean(v);return /^-?\d+(\.\d+)?$/.test(x)?Number(x):x};

function parseScorecard(html:string,id:string){
  const $=load(html);
  const title=clean(($("h1.cb-nav-hdr").first().text()||$("h1").first().text()||$("title").text()).replace(/\s*-\s*Cricbuzz.*$/i,""));
  const status=clean($(".cb-text-live,.cb-text-complete,.cb-text-preview,.cb-min-stts").first().text())||"Live";
  const innings:any[]=[];
  let current:any=null;
  let mode:"batting"|"bowling"|null=null;

  function ensure(titleHint:string){
    if(!current){current={inning:titleHint||"Innings",batting:[],bowling:[],total:{}};innings.push(current);}
  }

  $(".cb-scrd-itms").each((_,el)=>{
    const row=$(el);
    const text=clean(row.text());
    if(!text)return;

    if(/\bBatter\b.*\bR\b.*\bB\b/i.test(text)){mode="batting";return;}
    if(/\bBowler\b.*\bO\b.*\bM\b.*\bR\b.*\bW\b/i.test(text)){mode="bowling";return;}

    const links=row.find('a[href*="/profiles/"]');
    const first=links.first();
    const player=clean(first.text());

    if(!player){
      const heading=row.find(".cb-scrd-hdr-rw,.cb-col-100").first().text();
      const h=clean(heading||text);
      const score=h.match(/^(.*?)\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/);
      if(score && !/Total|Extras/i.test(h)){
        current={inning:clean(score[1]),batting:[],bowling:[],total:{runs:Number(score[2]),wickets:Number(score[3]),overs:clean(score[4]).replace(/\s*Ov(?:ers)?/i,"")}};
        innings.push(current);mode=null;return;
      }
      if(/^Extras\b/i.test(h)){ensure("Innings");const n=h.match(/Extras\s+(\d+)/i);if(n)current.extras={runs:Number(n[1])};return;}
      if(/^Total\b/i.test(h)){ensure("Innings");const n=h.match(/Total\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/i);if(n)current.total={runs:Number(n[1]),wickets:Number(n[2]),overs:clean(n[3]).replace(/\s*(Overs?|Ov)/i,"")};return;}
      return;
    }

    ensure("Innings");
    const cells:string[]=[];
    row.children("div").each((_,c)=>{const t=clean($(c).text());if(t)cells.push(t)});
    const name=player.replace(/\s*\*\s*$/,"");

    if(mode==="batting"){
      let dismissal="";let stats:string[]=[];
      if(cells.length){
        const firstText=cells[0];
        dismissal=clean(firstText.replace(name,""));
        stats=cells.slice(1).filter(Boolean);
      }
      const nums=stats.filter(v=>/^-?\d+(\.\d+)?$/.test(v));
      if(nums.length>=2){
        current.batting.push({batsman:name,dismissal,runs:num(nums[0]),balls:num(nums[1]),fours:num(nums[2]||""),sixes:num(nums[3]||""),strikeRate:num(nums[4]||"")});
      }
      return;
    }

    if(mode==="bowling"){
      const nums=cells.slice(1).filter(v=>/^-?\d+(\.\d+)?$/.test(v));
      if(nums.length>=4){
        current.bowling.push({bowler:name,overs:num(nums[0]),maidens:num(nums[1]),runs:num(nums[2]),wickets:num(nums[3]),noBalls:num(nums[4]||""),wides:num(nums[5]||""),economy:num(nums[nums.length-1]||"")});
      }
    }
  });

  // Fallback for pages whose innings title is outside cb-scrd-itms.
  if(!innings.length){
    const pageText=clean($.root().text());
    const m=pageText.match(/([A-Z]{2,6})\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/);
    if(m)innings.push({inning:m[1],batting:[],bowling:[],total:{runs:Number(m[2]),wickets:Number(m[3]),overs:m[4]}});
  }

  const useful=innings.filter(x=>x.batting.length||x.bowling.length||x.total?.runs!==undefined);
  return {status:"success",id,name:title||"Detailed Scorecard",matchStatus:status,scorecard:useful,source:"cricketHub-direct-cricbuzz"};
}

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("score")||"";
  if(!/^\d+$/.test(id))return NextResponse.json({status:"error",message:"Invalid match id"},{status:400});
  try{
    const r=await fetch("https://www.cricbuzz.com/live-cricket-scorecard/"+id,{cache:"no-store",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","accept-language":"en-US,en;q=0.9"}});
    const html=await r.text();
    if(!r.ok)return NextResponse.json({status:"error",message:"Score source returned HTTP "+r.status},{status:200});
    const data=parseScorecard(html,id);
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store, max-age=0"}});
  }catch(e){return NextResponse.json({status:"error",message:e instanceof Error?e.message:"Score source temporarily unavailable"},{status:200});}
}