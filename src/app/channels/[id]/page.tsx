import {channels} from "@/lib/channels";
import {notFound} from "next/navigation";
import PlayerMirrorButton from "@/components/PlayerMirrorButton";

export default async function Channel({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const c=channels.find(x=>x.id===id);
  if(!c)notFound();
  return <main className="mx-auto min-h-screen w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
    <a href="/channels" className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-bold text-green-400 hover:bg-white/[.04]">← All Channels</a>

    <section className="mt-5 overflow-hidden rounded-3xl border border-[#20364d] bg-[#091625] p-4 sm:mt-7 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[.2em] text-green-400">LIVE PLAYER</p>
          <h1 className="mt-1.5 break-words text-2xl font-black leading-tight sm:text-4xl">{c.channel_name}</h1>
        </div>

        {c.url&&<div className="rounded-2xl border border-green-400/20 bg-green-500/[.06] p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl">📺</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">Watch on your TV</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Tap the button below to find TVs on your Wi-Fi. Nothing needs to be installed on the TV.</p>
              <div className="mt-3"><PlayerMirrorButton channelName={c.channel_name} channelUrl={c.url}/></div>
            </div>
          </div>
        </div>}
      </div>
    </section>

    <div className="card mt-4 overflow-hidden rounded-2xl bg-black sm:mt-6 sm:rounded-3xl">
      {c.url?<iframe title={c.channel_name} src={c.url} className="aspect-video w-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; display-capture" allowFullScreen/>:<div className="flex aspect-video items-center justify-center p-8 text-center"><div><div className="text-5xl">📺</div><h2 className="mt-5 text-xl font-bold">URL not configured</h2><p className="mt-2 text-sm text-slate-400">Add the channel URL in src/lib/channels.ts.</p></div></div>}
    </div>

    {c.url&&<div className="mt-3 flex items-start gap-2 px-1 text-[11px] leading-5 text-slate-500"><span>ℹ️</span><p>Free Android casting mirrors the player from your phone to the TV's built-in Cast receiver. Keep your phone and TV on the same Wi-Fi.</p></div>}
  </main>
}
