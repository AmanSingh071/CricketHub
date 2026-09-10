import {channels} from "@/lib/channels";
import {notFound} from "next/navigation";
import PlayerMirrorButton from "@/components/PlayerMirrorButton";

export default async function Channel({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const c=channels.find(x=>x.id===id);
  if(!c)notFound();

  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
    <a href="/channels" className="text-green-400">← All Channels</a>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black tracking-[.2em] text-green-400">LIVE PLAYER</p>
        <h1 className="mt-2 text-4xl font-black">{c.channel_name}</h1>
      </div>
      {c.url&&<PlayerMirrorButton channelName={c.channel_name}/>} 
    </div>
    <div className="card mt-6 overflow-hidden rounded-3xl bg-black">
      {c.url?<iframe title={c.channel_name} src={c.url} className="aspect-video w-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; display-capture" allowFullScreen/>:<div className="flex aspect-video items-center justify-center p-8 text-center"><div><div className="text-5xl">📺</div><h2 className="mt-5 text-xl font-bold">URL not configured</h2><p className="mt-2 text-sm text-slate-400">Add the channel URL in src/lib/channels.ts.</p></div></div>}
    </div>
    {c.url&&<p className="mt-3 text-xs text-slate-500">Use <b className="text-slate-300">Mirror to TV</b> above the player to mirror this entire player tab to a TV browser.</p>}
  </main>
} 
