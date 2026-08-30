import { getMatch, scoreText } from "@/lib/cricket";

export const revalidate = 3600;

const channels = [
  { channel_name: "Willow Cricket", url: "https://daddylive.app/player/embed.php?id=346" },
  { channel_name: "Willow 2 Cricket", url: "https://daddylive.app/player/embed.php?id=598" },
  { channel_name: "SONY TEN 1", url: "https://daddylive.app/player/embed.php?id=885" },
  { channel_name: "SONY TEN 2", url: "https://daddylive.app/player/embed.php?id=886" },
  { channel_name: "SONY TEN 3", url: "https://daddylive.app/player/embed.php?id=887" },
  { channel_name: "Star Sports 1 IN", url: "https://daddylive.app/player/embed.php?id=267" },
  { channel_name: "Star Sports Hindi IN", url: "https://daddylive.app/player/embed.php?id=268" },
  { channel_name: "Sky Sports Cricket", url: "https://daddylive.app/player/embed.php?id=65" },
  { channel_name: "Sky Sports Cricket UK", url: "https://daddylive.app/player/embed.php?id=stream-65" },
];

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMatch(id);

  if (!m)
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
        <a href="/" className="text-green-400">← CricketHub</a>
        <h1 className="mt-8 text-3xl font-black">Match unavailable</h1>
      </main>
    );

  const teams = m.teams || [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href="/" className="text-green-400">← CricketHub</a>

      <section className="card mt-8 rounded-3xl p-6 md:p-10">
        <div className="flex justify-between text-sm text-slate-400">
          <span>{m.matchType || "Cricket"}</span>
          <span>
            {m.matchStarted && !m.matchEnded
              ? "🔴 LIVE"
              : m.matchEnded
                ? "FINAL"
                : "UPCOMING"}
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-black md:text-5xl">{m.name}</h1>

        <div className="mt-8 grid grid-cols-3 items-center text-center">
          <div>
            <div className="text-3xl">🏏</div>
            <p className="mt-2 font-bold">{teams[0] || "Team 1"}</p>
          </div>
          <b className="text-slate-500">VS</b>
          <div>
            <div className="text-3xl">🏏</div>
            <p className="mt-2 font-bold">{teams[1] || "Team 2"}</p>
          </div>
        </div>

        <p className="mt-8 rounded-2xl bg-green-500/5 p-4 text-center text-lg font-bold text-green-300">
          {scoreText(m.score)}
        </p>
        <p className="mt-4 text-center text-slate-400">{m.status}</p>
      </section>

      <nav className="mt-6 flex gap-3 overflow-x-auto text-sm font-bold">
        <a className="rounded-xl bg-white/5 px-4 py-3" href={"/match/" + id}>
          Overview
        </a>
        <a
          className="rounded-xl border border-[#29445e] px-4 py-3"
          href={"/match/" + id + "/scorecard"}
        >
          Scorecard
        </a>
        <a
          className="rounded-xl border border-[#29445e] px-4 py-3"
          href={"/match/" + id + "/watch"}
        >
          ▶ Watch
        </a>
      </nav>

      <section className="card mt-6 rounded-3xl p-6">
        <p className="text-xs font-black tracking-[.18em] text-green-400">
          LIVE CHANNEL DIRECTORY
        </p>
        <h2 className="mt-2 text-2xl font-black">Channel URL configuration</h2>
        <p className="mt-2 text-sm text-slate-400">
          Add an authorized embed URL to a channel later by replacing its empty url value in this file.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <div
              key={channel.channel_name}
              className="rounded-2xl border border-[#29445e] bg-black/20 p-4"
            >
              <p className="font-bold">{channel.channel_name}</p>
              <p className="mt-2 truncate text-xs text-slate-500">
                {channel.url || "URL not configured"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 overflow-hidden rounded-3xl bg-black">
        <div className="flex aspect-video items-center justify-center p-8 text-center">
          <div>
            <div className="text-5xl">📺</div>
            <h2 className="mt-5 text-xl font-bold">Player ready for configuration</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Add an authorized channel URL above and connect it to the player when ready.
            </p>
          </div>
        </div>
      </section>

      <section className="card mt-6 rounded-2xl p-6">
        <h2 className="text-xl font-black">Match Information</h2>
        <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <p><span className="text-slate-500">Venue:</span> {m.venue || "Not available"}</p>
          <p><span className="text-slate-500">Date:</span> {m.dateTimeGMT || m.date || "Not available"}</p>
          <p>
            <span className="text-slate-500">Toss:</span>{" "}
            {m.tossWinner
              ? m.tossWinner + " chose " + (m.tossChoice || "")
              : "Not available"}
          </p>
          <p><span className="text-slate-500">Status:</span> {m.status || "Not available"}</p>
        </div>
      </section>
    </main>
  );
}
