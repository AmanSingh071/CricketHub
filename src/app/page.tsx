import { classify, getCurrentMatches, scoreText } from "@/lib/cricket";
import { channels } from "@/lib/channels";

export const revalidate = 1800;

export default async function Home() {
  let all:any[] = [];
  try { all = await getCurrentMatches(); } catch { all = []; }
  const { live: rawLive, upcoming, recent } = classify(all);

// The provider can return the same live match more than once. Keep one card
// per unique match ID/name before rendering.
const seen = new Set<string>();
const live = rawLive.filter((match:any) => {
  const key = String(match.id || match.name || "").trim().toLowerCase();
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
});

const featured = live[0] || upcoming[0] || recent[0];

  return <main className="min-h-screen">
    <header className="border-b border-[#20364d] bg-[#07111f]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <a href="/" className="text-2xl font-black">🏏 Cricket<span className="text-green-400">Hub</span></a>
        <nav className="flex gap-3 text-sm font-bold">
          <a href="/channels" className="text-green-400">Channels</a>
          <a href="/live">Live</a>
          <a href="/schedule">Schedule</a>
          <a href="/rankings">Rankings</a>
        </nav>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-8">
      <section>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-black tracking-[.2em] text-green-400">WATCH CRICKET</p>
            <h1 className="mt-2 text-4xl font-black">📺 Channels</h1>
            <p className="mt-2 text-slate-400">Choose from your configured channel directory.</p>
          </div>
          <a href="/channels" className="rounded-xl bg-green-500 px-4 py-3 font-bold text-slate-950">View All</a>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {channels.map((channel) => (
            <a key={channel.id} href={"/channels/" + channel.id} className="card rounded-2xl p-5 hover:border-green-400/60">
              <div className="flex items-center justify-between">
                <span className="text-3xl">📺</span>
                <span className={channel.url ? "text-xs font-bold text-green-400" : "text-xs text-slate-500"}>
                  {channel.url ? "READY" : "SETUP"}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-black">{channel.channel_name}</h2>
              <p className="mt-2 text-xs text-slate-400">{channel.url ? "Open channel" : "Configure URL later"}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-[.2em] text-red-400">LIVE SCORES</p>
            <h2 className="mt-2 text-3xl font-black">🔴 Live Matches</h2>
          </div>
          <a href="/live" className="text-sm font-bold text-green-400">View all →</a>
        </div>

        {live.length ? <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {live.map((match:any, index:number) => <MatchCard key={String(match.id || match.name || index)} match={match} />)}
        </div> : <div className="card mt-6 rounded-2xl p-6">
          <p className="font-bold">No live matches right now</p>
          <p className="mt-2 text-sm text-slate-400">Check upcoming fixtures or refresh later.</p>
        </div>}
      </section>

      {featured && <section className="card mt-10 rounded-3xl p-7">
        <p className="text-xs font-black tracking-[.2em] text-green-400">FEATURED MATCH</p>
        <h2 className="mt-3 text-2xl font-black">{featured.name}</h2>
        <p className="mt-4 rounded-xl bg-green-500/5 p-4 font-bold text-green-300">{scoreText(featured.score)}</p>
        <p className="mt-3 text-sm text-slate-400">{featured.status}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={"/match/" + featured.id} className="rounded-xl bg-green-500 px-4 py-3 font-bold text-slate-950">Match Center</a>
          <a href={"/match/" + featured.id + "/scorecard"} className="rounded-xl border border-[#29445e] px-4 py-3 font-bold">Scorecard</a>
          <a href={"/match/" + featured.id + "/watch"} className="rounded-xl border border-[#29445e] px-4 py-3 font-bold">Watch</a>
        </div>
      </section>}
    </div>
  </main>;
}

function MatchCard({ match }: { match:any }) {
  return <article className="card rounded-3xl p-6">
    <div className="flex justify-between text-xs"><span className="font-black text-red-400">🔴 LIVE</span><span className="text-slate-500">{match.matchType}</span></div>
    <h3 className="mt-4 text-xl font-black">{match.name}</h3>
    <div className="mt-5 grid grid-cols-2 gap-3">
      {(match.teams || ["Team 1", "Team 2"]).slice(0,2).map((team:string) => <div key={team} className="rounded-xl bg-white/[.03] p-3 text-center font-bold">🏏<p className="mt-1">{team}</p></div>)}
    </div>
    <p className="mt-5 rounded-xl bg-green-500/5 p-3 font-bold text-green-300">{scoreText(match.score)}</p>
    <div className="mt-5 flex gap-2">
      <a href={"/match/" + match.id} className="flex-1 rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-black text-slate-950">Match</a>
      <a href={"/match/" + match.id + "/scorecard"} className="rounded-xl border border-[#29445e] px-4 py-3 text-sm font-bold">Scorecard</a>
    </div>
  </article>;
}