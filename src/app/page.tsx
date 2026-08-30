type CricketScore = { r?: number; w?: number; o?: number; inning?: string };
type CricketMatch = { id: string; name: string; matchType?: string; status?: string; date?: string; dateTimeGMT?: string; venue?: string; teams?: string[]; teamInfo?: { name?: string; shortname?: string }[]; score?: CricketScore[]; matchStarted?: boolean; matchEnded?: boolean };

const API = "https://api.cricapi.com/v1";

async function getMatches(): Promise<CricketMatch[]> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${API}/currentMatches?apikey=${key}&offset=0`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch { return []; }
}

function scoreText(scores?: CricketScore[]) {
  if (!scores?.length) return "Score not available";
  return scores.map(s => `${s.inning || "Innings"} ${s.r ?? 0}/${s.w ?? 0} (${s.o ?? 0})`).join(" • ");
}

export default async function Home() {
  const matches = await getMatches();
  const live = matches.filter(m => m.matchStarted && !m.matchEnded);
  const upcoming = matches.filter(m => !m.matchStarted).slice(0, 8);
  const recent = matches.filter(m => m.matchEnded).slice(0, 6);
  const featured = live[0] || matches[0];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#20364d] bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <a href="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 text-xl">🏏</div><div><h1 className="text-xl font-black">Cricket<span className="text-green-400">Hub</span></h1><p className="hidden text-xs text-slate-400 sm:block">Live Cricket. Everywhere.</p></div></a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex"><a className="text-white" href="/">Home</a><a href="/live">Live</a><a href="/schedule">Schedule</a><a href="/rankings">Rankings</a><a href="/teams">Teams</a><a href="/series">Series</a></nav>
          <div className="rounded-full border border-[#29445e] px-3 py-2 text-xs text-slate-400">{live.length} live</div>
        </div>
      </header>

      <div className="border-b border-[#20364d] bg-[#091624]"><div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 text-xs font-bold md:px-6"><span className="whitespace-nowrap rounded-full bg-red-500/10 px-3 py-2 text-red-400">🔴 LIVE {live.length}</span>{["International","Test","ODI","T20","Domestic","Women"].map(x => <span key={x} className="whitespace-nowrap rounded-full px-3 py-2 text-slate-400">{x}</span>)}</div></div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {!process.env.CRICAPI_KEY && <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200"><b>Real data setup:</b> add <code>CRICAPI_KEY</code> in Vercel Environment Variables. Until then CricketHub shows empty live sections.</div>}

        {featured ? <section className="card mb-10 overflow-hidden rounded-3xl"><div className="bg-gradient-to-br from-green-500/10 via-transparent to-sky-500/10 p-6 md:p-10"><div className="mb-7 flex items-center justify-between"><span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-400"><i className="live-dot h-2 w-2 rounded-full bg-red-500" />{featured.matchStarted && !featured.matchEnded ? "LIVE NOW" : featured.matchEnded ? "RESULT" : "UPCOMING"}</span><span className="text-sm text-slate-400">{featured.matchType || "Cricket"}</span></div><div className="text-center"><p className="mb-2 text-sm text-slate-400">{featured.name}</p><div className="my-7 grid grid-cols-3 items-center gap-3"><Team name={featured.teams?.[0] || featured.teamInfo?.[0]?.name || "Team 1"} /><div className="font-black text-slate-500">VS</div><Team name={featured.teams?.[1] || featured.teamInfo?.[1]?.name || "Team 2"} /></div><p className="mx-auto max-w-3xl rounded-2xl border border-green-500/15 bg-green-500/5 p-4 text-sm font-semibold text-green-300">{scoreText(featured.score)}</p><p className="mt-4 text-sm text-slate-400">{featured.status}</p><div className="mt-7 flex justify-center gap-3"><a href={"/match/"+featured.id} className="rounded-xl bg-green-500 px-5 py-3 font-bold text-[#07111f]">📊 Match Center</a><a href={"/match/"+featured.id+"/watch"} className="rounded-xl border border-[#29445e] px-5 py-3 font-bold">▶ Watch Center</a></div></div></div></section> : <EmptyState title="No match data loaded yet" text="Connect your CricketData API key and live matches will appear automatically." />}

        <Section title="Live Cricket" eyebrow="🔴 LIVE NOW" matches={live} empty="There are currently no live matches returned by the provider." />
        <Section title="Upcoming Fixtures" eyebrow="📅 SCHEDULE" matches={upcoming} empty="No upcoming fixtures returned." />
        <Section title="Recent Results" eyebrow="🏆 RESULTS" matches={recent} empty="No recent results returned." />
      </div>

      <footer className="mt-10 border-t border-[#20364d] bg-[#06101c]"><div className="mx-auto flex max-w-7xl justify-between px-4 py-8 text-sm text-slate-500 md:px-6"><span className="font-bold text-slate-300">Cricket<span className="text-green-400">Hub</span></span><span>Live scores • fixtures • match centre</span></div></footer>
    </main>
  );
}

function Team({name}:{name:string}) { return <div><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-3xl">🏏</div><h2 className="text-xl font-black md:text-2xl">{name}</h2></div>; }

function Section({title,eyebrow,matches,empty}:{title:string;eyebrow:string;matches:CricketMatch[];empty:string}) {
 return <section className="mb-10"><p className="mb-2 text-xs font-black tracking-[.2em] text-green-400">{eyebrow}</p><h2 className="mb-5 text-2xl font-black md:text-3xl">{title}</h2>{matches.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.map(m => <article key={m.id} className="card rounded-2xl p-5 hover:-translate-y-1 hover:border-green-500/30"><div className="mb-4 flex justify-between gap-3 text-xs"><span className={m.matchStarted && !m.matchEnded ? "font-bold text-red-400" : "text-slate-500"}>{m.matchStarted && !m.matchEnded ? "🔴 LIVE" : m.matchEnded ? "FINAL" : "UPCOMING"}</span><span className="text-slate-500">{m.matchType}</span></div><h3 className="font-bold">{m.name}</h3><p className="mt-3 text-sm text-green-300">{scoreText(m.score)}</p><p className="mt-3 text-xs text-slate-400">{m.status}</p><div className="mt-5 flex gap-2"><a href={"/match/"+m.id} className="flex-1 rounded-lg bg-white/5 py-2.5 text-center text-sm font-bold hover:bg-green-500 hover:text-[#07111f]">Match Center</a><a href={"/match/"+m.id+"/watch"} className="rounded-lg border border-[#29445e] px-4 py-2">📺</a></div></article>)}</div> : <EmptyState title={empty} text="The page automatically refreshes server-side on the configured cache interval." />}</section>
}

function EmptyState({title,text}:{title:string;text:string}) { return <div className="card rounded-2xl p-6 text-slate-400"><p className="font-bold text-slate-200">{title}</p><p className="mt-2 text-sm">{text}</p></div>; }
