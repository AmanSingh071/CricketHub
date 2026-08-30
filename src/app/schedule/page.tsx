import { getCurrentMatches } from "@/lib/cricket";
export const revalidate=300;
export default async function SchedulePage(){
 const matches=(await getCurrentMatches()).filter(m=>!m.matchEnded);
 return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8"><a href="/" className="text-green-400">← CricketHub</a><p className="mt-8 text-xs font-black tracking-[.2em] text-sky-400">📅 FIXTURES</p><h1 className="mt-2 text-4xl font-black">Cricket Schedule</h1><div className="mt-8 space-y-3">{matches.map(m=><a key={m.id} href={"/match/"+m.id} className="card flex flex-col gap-3 rounded-2xl p-5 hover:border-green-500/50 md:flex-row md:items-center md:justify-between"><div><p className="font-bold">{m.name}</p><p className="mt-1 text-sm text-slate-400">{m.matchType} • {m.venue||"Venue TBA"}</p></div><div className="text-sm text-green-400">{m.dateTimeGMT||m.date||"Date TBA"}</div></a>)}</div></main>
}