import { NextResponse } from "next/server";
import { getCurrentMatches,getRecentMatches } from "@/lib/cricket";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const H={"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36","accept-language":"en-US,en;q=0.9","referer":"https://www.cricbuzz.com/"};
const clean=(v:string)=>v.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();
const split=(s:string)=>{const m=s.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*,|$)/i);return m?[m[1].trim(),m[2].trim()]:[]};
const dateNear=(html:string,pos:number)=>{const before=clean(html.slice(Math.max(0,pos-10000),pos));const hits=[...before.matchAll(/\b(?:MON|TUE|WED|THU|FRI|SAT|SUN),\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\s+202\d\b/gi)];return hits.length?hits[hits.length-1][0]:""};
function parseRecent(html:string){
 const out=new Map<string,any>();
 const re=/<a\\b[^>]*href=["']([^"']*\\/live-cricket-(?:scores|scorecard)\\/(\\d+)(?:\\/[^"']*)?)["'][^>]*>([\\s\\S]*?)<\\/a>/gi;
 let m:RegExpExecArray|null;
 while((m=re.exec(html))){
   const id=m[2],name=clean(m[3]),teams=split(name);
   if(!id||!name||teams.length!==2)continue;
   const near=clean(html.slice(Math.max(0,m.index-5000),Math.min(html.length,m.index+5000)));
   if(!/\\b(?:won by|match drawn|no result|abandoned|cancelled)\\b/i.test(near))continue;
   const date=dateNear(html,m.index);
   if(!date)continue;
   out.set(id,{id,name,teams,date,status:"Completed",matchStarted:true,matchEnded:true,source:"cricbuzz-recent-html"});
 }
 return [...out.values()];
}
async function fetchRecentDated(){
 try{const r=await fetch("https://www.cricbuzz.com/cricket-match/live-scores/recent-matches",{cache:"no-store",headers:H});if(!r.ok)return [];return parseRecent(await r.text());}catch{return []}
}
function parseUpcoming(html:string){
 const out=new Map<string,any>();
 const re=/<a\b[^>]*href=["']([^"']*\/live-cricket-(?:scores|scorecard)\/(\d+)(?:\/[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
 let m:RegExpExecArray|null;
 while((m=re.exec(html))){
   const id=m[2],name=clean(m[3]),teams=split(name),date=dateNear(html,m.index);
   if(!id||!name||teams.length!==2||!date)continue;
   out.set(id,{id,name,teams,date,status:"Upcoming",matchStarted:false,matchEnded:false,source:"cricbuzz-upcoming-html"});
 }
 return [...out.values()];
}
async function fetchUpcoming(){
 const urls=["https://www.cricbuzz.com/cricket-schedule/upcoming-series/all","https://www.cricbuzz.com/cricket-schedule/series/all"];
 const rows:any[]=[];
 for(const url of urls){try{const r=await fetch(url,{cache:"no-store",headers:H});if(r.ok)rows.push(...parseUpcoming(await r.text()));}catch{}}
 return [...new Map(rows.map(x=>[x.id,x])).values()];
}
function dayValue(s:string){const m=s.match(/(?:MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s+(\d{4})/i);if(!m)return NaN;const months:any={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};return new Date(Date.UTC(Number(m[3]),months[m[1].toUpperCase()],Number(m[2]))).getTime();}
export async function GET(){
 const [live,recentFromApi,recentDated,upcoming]=await Promise.all([getCurrentMatches(),getRecentMatches(),fetchRecentDated(),fetchUpcoming()]);
 const recent=[...new Map([...recentFromApi,...recentDated].map(m=>[String(m.id),m])).values()];
 const liveIds=new Set(live.map(m=>String(m.id)));
 const now=Date.now(),today=new Date();const todayUtc=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
 const recent2d=recent.filter((m:any)=>{const d=dayValue(String(m.date||""));return Number.isFinite(d)&&d>=todayUtc-2*86400000&&d<=todayUtc&&!liveIds.has(String(m.id));});
 const upcomingRows=upcoming.filter(m=>{const d=dayValue(String(m.date||""));return Number.isFinite(d)&&d>=todayUtc&&!liveIds.has(String(m.id))&&!recent2d.some(r=>String(r.id)===String(m.id));}).sort((a,b)=>dayValue(a.date)-dayValue(b.date));
 return NextResponse.json({updatedAt:new Date().toISOString(),ongoing:live,upcoming:upcomingRows,recent:recent2d,counts:{ongoing:live.length,upcoming:upcomingRows.length,recent:recent2d.length}},{headers:{"Cache-Control":"no-store, max-age=0"}});
}