import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;
const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const decode=(s:string)=>s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/&#x27;/gi,"'");
const clean=(s:string)=>decode(s.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
const numeric=(v:string)=>/^-?\d+(?:\.\d+)?$/.test(v)?Number(v):v;
function rowBlocks(html:string){const re=/<div\b[^>]*class=["'][^"']*\bcb-scrd-itms\b[^"']*["'][^>]*>/gi,starts:number[]=[];let m:RegExpExecArray|null;while((m=re.exec(html)))starts.push(m.index);return starts.map((s,i)=>html.slice(s,starts[i+1]??Math.min(html.length,s+18000)))}
function parse(html:string,id:string){
 const title=clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"Detailed Scorecard").replace(/\s*-\s*Cricbuzz.*$/i,"");
 const status=clean((html.match(/class=["'][^"']*(?:cb-text-live|cb-text-complete|cb-text-preview|cb-min-stts)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)||[])[1]||"")||"Live";
 const innings:any[]=[];let current:any=null;let mode:"batting"|"bowling"|null=null;
 const ensure=(name="Innings")=>{if(!current){current={inning:name,batting:[],bowling:[],total:{}};innings.push(current)}};
 for(const block of rowBlocks(html)){
  const text=clean(block);if(!text)continue;
  if(/\bBatter\b.*\bR\b.*\bB\b.*\b4s\b.*\b6s\b/i.test(text)){mode="batting";continue}
  if(/\bBowler\b.*\bO\b.*\bM\b.*\bR\b.*\bW\b.*(?:ECO|Econ)/i.test(text)){mode="bowling";continue}
  const h=text.match(/^(.+?)\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/);
  const pm=(block.match(/href=["'][^"']*\/profiles\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)||[])[1];const player=pm?clean(pm):"";
  if(!player){
   if(h&&!/^(Total|Extras)\b/i.test(h[1])){current={inning:clean(h[1]),batting:[],bowling:[],total:{runs:Number(h[2]),wickets:Number(h[3]),overs:clean(h[4]).replace(/\s*(Overs?|Ov)/i,"")}};innings.push(current);mode=null;continue}
   if(/^Extras\b/i.test(text)){ensure();const x=text.match(/Extras\s+(\d+)/i);if(x)current.extras={runs:Number(x[1])};continue}
   if(/^Total\b/i.test(text)){ensure();const x=text.match(/Total\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/i);if(x)current.total={runs:Number(x[1]),wickets:Number(x[2]),overs:clean(x[3]).replace(/\s*(Overs?|Ov)/i,"")};continue}
   continue;
  }
  ensure();const after=clean(text.startsWith(player)?text.slice(player.length):text);const nums=after.match(/-?\d+(?:\.\d+)?/g)||[];
  if(mode==="batting"&&nums.length>=2){const last=nums.slice(-5),stats=last.map(numeric),cut=after.lastIndexOf(last[0]),dismissal=clean(after.slice(0,Math.max(0,cut)));current.batting.push({batsman:player,dismissal,runs:stats[0],balls:stats[1],fours:stats[2]??"",sixes:stats[3]??"",strikeRate:stats[4]??""})}
  else if(mode==="bowling"&&nums.length>=4){const stats=nums.slice(-7).map(numeric);current.bowling.push({bowler:player,overs:stats[0],maidens:stats[1],runs:stats[2],wickets:stats[3],noBalls:stats.length>6?stats[4]:"",wides:stats.length>6?stats[5]:"",economy:stats[stats.length-1]})}
 }
 return {status:"success",id,name:title,matchStatus:status,scorecard:innings.filter(x=>x.batting.length||x.bowling.length||x.total?.runs!==undefined),source:"cricketHub-direct-cricbuzz"};
}
export async function GET(req:NextRequest){const id=req.nextUrl.searchParams.get("score")||"";if(!/^\d+$/.test(id))return NextResponse.json({status:"error",message:"Invalid match id"},{status:400});try{const r=await fetch("https://www.cricbuzz.com/live-cricket-scorecard/"+id,{cache:"no-store",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","accept-language":"en-US,en;q=0.9"}});const html=await r.text();if(!r.ok)return NextResponse.json({status:"error",message:"Score source returned HTTP "+r.status});return NextResponse.json(parse(html,id),{headers:{"Cache-Control":"no-store, max-age=0"}})}catch(e){return NextResponse.json({status:"error",message:e instanceof Error?e.message:"Score source temporarily unavailable"})}}