import { classify, getCurrentMatches, scoreText } from "@/lib/cricket";
import { channels } from "@/lib/channels";

export const revalidate = 1800;

const nav = [
  ["Live", "/live"],
  ["Channels", "/channels"],
  ["Schedule", "/schedule"],
  ["Rankings", "/rankings"],
  ["Teams", "/teams"],
  ["Series", "/series"],
  ["Players", "/players"],
];

export default async function Home() {
  const all = await getCurrentMatches();
  const { live, upcoming, recent } = classify(all);
  const featured = live[0] || upcoming[0] || recent[0];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#20364d] bg-[#07111f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500">🏏</div>
            <div>
              <h1 className="text-xl font-black">Cricket<span className="text-green-400">Hub</span></h1>
              <p className="text-xs text-slate-400">Live cricket, scores & channels</p>
            </div>
          </a>
          <nav className="hidden gap-5 text-sm font-bold text-slate-300 xl:flex">
            {nav.map(([name, href]) => <a key={href} href={href} className={name === "Channels" ? "text-green-400" : "hover:text-white"}>{name}</a>)}
          </nav>
          <a href="/channels" className="rounded-full bg-green-500 px-4 py-2 text-xs font-black text-[#07111f]">📺 CHANNELS</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="card rounded-3xl p-6 md:p-8">
          <p className="text-xs font-black tracking-[.2em] text-green-400">CRICKET LIVE CENTER</p>
          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="text-4xl font-black md:text-5xl">Watch. Follow. Never miss a ball.</h2>
              <p className="mt-3 max-w-2xl text-slate-400">Live channels, live scores, match centers and scorecards in one place.</p>
            </div>
            <div className="flex gap-3">
              <Stat label="LIVE" value={live.length} />
              <Stat label="UP NEXT" value={upcoming.length} />
              <Stat label="CHANNELS" value={channels.length} />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[.2em] text-green-400">PRIORITY</p>
              <h2 className="mt-2 text-3xl font-black">📺 Live Channels</h2>
              <p className="mt-1 text-sm text-slate-400">Your configured channels are front and center.</p>
            </div>
            <a href="/channels" className="text-sm font-bold text-green-400">View all →</a>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {channels.slice(0, 8).map((channel) => (
              <a key={channel.id} href={"/channels/" + channel.id} className="card rounded-2xl p-5 transition hover:-translate-y-1 hover:border-green-400/50">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">📺</span>
                  <span className={channel.url ? "rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-black text-green-400" : "rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-slate-500"}>
                    {channel.url ? "READY" : "SETUP"}
                  </span>
                </div>
                <h3 className="mt-5 font-black">{channel.channel_name}</h3>
                <p className="mt-2 text-xs text-slate-400">{channel.url ? "Open channel player" : "URL can be configured later"}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[.2em] text-red-400">🔴 LIVE NOW</p>
              <h2 className="mt-2 text-3xl font-black">Matches happening now</h2>
            </div>
            <a href="/live" className="text-sm font-bold text-green-400">All live matches →</a>
          </div>

          {live.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {live.map((match) => <MatchCard key={match.id} match={match} />)}
            </div>
          ) : (
            <div className="card mt-5 rounded-2xl p-6 text-slate-400">No live match is currently returned by the data provider.</div>
          )}
        </section>

        {featured && (
          <section className="card mt-12 rounded-3xl p-6 md:p-8">
            <p className="text-xs font-black tracking-[.2em] text-green-400">MATCH CENTER</p>
            <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-black">{featured.name}</h2>
                <p className="mt-2 text-sm text-slate-400">{featured.matchType}</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-400">{featured.matchStarted && !featured.matchEnded ? "🔴 LIVE" : featured.matchEnded ? "FINAL" : "UPCOMING"}</span>
            </div>
            <p className="mt-6 rounded-2xl bg-green-500/5 p-4 font-bold text-green-300">{scoreText(featured.score)}</p>
            <p className="mt-3 text-sm text-slate-400">{featured.status}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={"/match/" + featured.id} className="rounded-xl bg-green-500 px-5 py-3 font-bold text-[#07111f]">Match Center</a>
              <a href={"/match/" + featured.id + "/scorecard"} className="rounded-xl border border-[#29445e] px-5 py-3 font-bold">Scorecard</a>
              <a href={"/match/" + featured.id + "/watch"} className="rounded-xl border border-[#29445e] px-5 py-3 font-bold">▶ Watch</a>
            </div>
          </section>
        )}

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          <a href="/schedule" className="card rounded-2xl p-6"><div className="text-3xl">📅</div><h3 className="mt-4 text-xl font-black">Fixtures</h3><p className="mt-2 text-sm text-slate-400">Upcoming international and domestic matches.</p></a>
          <a href="/rankings" className="card rounded-2xl p-6"><div className="text-3xl">🏆</div><h3 className="mt-4 text-xl font-black">ICC Rankings</h3><p className="mt-2 text-sm text-slate-400">Explore team rankings by format.</p></a>
          <a href="/series" className="card rounded-2xl p-6"><div className="text-3xl">🏏</div><h3 className="mt-4 text-xl font-black">Series & Teams</h3><p className="mt-2 text-sm text-slate-400">Explore teams and competitions.</p></a>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="min-w-[78px] rounded-xl bg-white/[.04] px-4 py-3 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-bold tracking-wider text-slate-500">{label}</p></div>;
}

function MatchCard({ match }: { match: any }) {
  return (
    <article className="card rounded-3xl p-6">
      <div className="flex items-center justify-between text-xs">
        <span className="font-black text-red-400">🔴 LIVE</span>
        <span className="text-slate-500">{match.matchType}</span>
      </div>
      <h3 className="mt-4 text-xl font-black">{match.name}</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(match.teams || []).slice(0, 2).map((team: string) => <div key={team} className="rounded-xl bg-white/[.03] p-3 text-center font-bold">🏏<p className="mt-1">{team}</p></div>)}
      </div>
      <p className="mt-5 rounded-xl bg-green-500/5 p-3 font-bold text-green-300">{scoreText(match.score)}</p>
      <p className="mt-3 text-sm text-slate-400">{match.status}</p>
      <div className="mt-5 flex gap-2">
        <a href={"/match/" + match.id} className="flex-1 rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-black text-[#07111f]">Match</a>
        <a href={"/match/" + match.id + "/scorecard"} className="rounded-xl border border-[#29445e] px-4 py-3 text-sm font-bold">Scorecard</a>
        <a href={"/match/" + match.id + "/watch"} className="rounded-xl border border-[#29445e] px-4 py-3 text-sm font-bold">▶</a>
      </div>
    </article>
  );
}