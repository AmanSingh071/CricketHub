import { classify, getCurrentMatches, scoreText } from "@/lib/cricket";
import { channels } from "@/lib/channels";

export const revalidate = 1800;

type MatchLike = any;

function matchForChannel(channel:any, matches:MatchLike[]) {
  if (!channel.teams?.length) return null;
  const wanted = channel.teams.map((t:string) => t.toLowerCase());
  return matches.find((match:any) => {
    const text = [
      match.name,
      ...(match.teams || []),
      ...(match.teamInfo || []).map((team:any) => team.name || "")
    ].join(" ").toLowerCase();
    return wanted.every((team:string) => text.includes(team));
  }) || null;
}

export default async function Home() {
  let matches:MatchLike[] = [];
  try { matches = await getCurrentMatches(); } catch { matches = []; }

  const channelMatches = channels
    .filter((channel) => channel.nowPlaying || channel.url)
    .map((channel) => ({ channel, match: matchForChannel(channel, matches) }));

  const liveMatches = classify(matches).live;

  return (
    <main className="min-h-screen">
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
        <section className="card rounded-3xl p-6 md:p-8">
          <p className="text-xs font-black tracking-[.22em] text-green-400">CRICKETHUB LIVE</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Watch channels and follow the match.</h1>
          <p className="mt-3 max-w-2xl text-slate-400">The homepage now shows what you have marked as currently playing on each channel, with a separate live scorecard area below.</p>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[.2em] text-green-400">NOW ON CHANNELS</p>
              <h2 className="mt-2 text-3xl font-black">📺 What is showing now</h2>
            </div>
            <a href="/channels" className="text-sm font-bold text-green-400">View all →</a>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {channelMatches.map(({ channel, match }) => (
              <a key={channel.id} href={"/channels/" + channel.id} className="card rounded-3xl p-6 transition hover:-translate-y-1 hover:border-green-400/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📺</span>
                    <div>
                      <p className="font-black">{channel.channel_name}</p>
                      <p className="text-xs text-green-400">{channel.nowPlaying ? "🔴 NOW PLAYING" : channel.url ? "CHANNEL READY" : "SETUP"}</p>
                    </div>
                  </div>
                  <span className={channel.url ? "rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-black text-green-400" : "text-[10px] text-slate-500"}>{channel.url ? "WATCH" : "SETUP"}</span>
                </div>

                {channel.nowPlaying ? (
                  <div className="mt-6 rounded-2xl bg-red-500/5 p-4">
                    <p className="text-xs font-bold tracking-wider text-red-300">CURRENT MATCH</p>
                    <h3 className="mt-2 text-xl font-black">{channel.nowPlaying}</h3>
                    {match && <p className="mt-3 text-sm font-bold text-green-300">{scoreText(match.score)}</p>}
                    {match?.status && <p className="mt-2 text-xs text-slate-400">{match.status}</p>}
                  </div>
                ) : liveMatches.length ? (
                  <a href="/live" className="mt-6 block rounded-2xl bg-green-500/[.06] p-4 transition hover:bg-green-500/[.12]">
                    <p className="text-xs font-bold tracking-wider text-green-400">🔴 LIVE CRICKET AVAILABLE</p>
                    <h3 className="mt-2 text-lg font-black">{liveMatches.length} live match{liveMatches.length === 1 ? "" : "es"} right now</h3>
                    <p className="mt-2 text-sm text-slate-400">Open live matches to see the current scores and detailed scorecards.</p>
                  </a>
                ) : (
                  <a href="/live" className="mt-6 block rounded-2xl bg-white/[.03] p-4 text-sm text-slate-400 transition hover:border-green-400/40">Open the live cricket feed →</a>
                )}
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[.2em] text-red-400">LIVE SCORECARD</p>
              <h2 className="mt-2 text-3xl font-black">🔴 All live matches</h2>
              <p className="mt-2 text-sm text-slate-400">Automatically populated from the live cricket feed, not limited to channels you manually configured.</p>
            </div>
            <a href="/live" className="text-sm font-bold text-green-400">View all →</a>
          </div>

          {liveMatches.length ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {liveMatches.map((match) => (
                <a key={match.id} href={"/match/" + match.id + "/scorecard"} className="card block rounded-3xl p-6 transition hover:-translate-y-1 hover:border-green-400/60">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black tracking-[.18em] text-red-400">🔴 LIVE NOW</p>
                      <h3 className="mt-3 text-2xl font-black">{match.name}</h3>
                    </div>
                    <span className="rounded-xl bg-green-500 px-4 py-2 text-sm font-black text-slate-950">Scorecard</span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {(match.teams || match.teamInfo?.map((team) => team.name || "") || []).slice(0, 2).map((team) => (
                      <div key={team} className="rounded-2xl bg-white/[.04] p-5 text-center">
                        <div className="text-3xl">🏏</div>
                        <p className="mt-2 font-black">{team}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-green-500/5 p-5">
                    <p className="text-xs font-bold tracking-wider text-green-400">CURRENT SCORE</p>
                    <p className="mt-2 text-xl font-black text-green-300">{scoreText(match.score)}</p>
                    {match.status && <p className="mt-2 text-sm text-slate-400">{match.status}</p>}
                  </div>

                  <p className="mt-5 text-sm font-black text-green-400">Open detailed player-by-player scorecard →</p>
                </a>
              ))}
            </div>
          ) : (
            <div className="card mt-6 rounded-3xl p-7">
              <p className="text-lg font-black">No live matches returned right now</p>
              <p className="mt-2 text-sm text-slate-400">The live feed refreshes every 30 minutes to stay within your 100-request-per-day API limit. Your manually configured channel match remains separate from this automatic live list.</p>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}