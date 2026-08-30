import { getMatch, scoreText } from "@/lib/cricket";

export const revalidate = 3600;

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
        <a href="/" className="text-green-400">
          ← CricketHub
        </a>
        <h1 className="mt-8 text-3xl font-black">Match unavailable</h1>
      </main>
    );

  const teams = m.teams || [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href="/" className="text-green-400">
        ← CricketHub
      </a>
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

      {/* Embedded Stream Player */}
      <section className="card mt-6 overflow-hidden rounded-3xl bg-black">
        <iframe
          src="https://daddylive.app/player/embed.php?id=admin/ppv-2-nd-test-england-vs-pakistan/1"
          width="100%"
          height="380px"
          style={{ border: 0 }}
          scrolling="no"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          title="Cricket Stream Player"
        />
      </section>

      <section className="card mt-6 rounded-2xl p-6">
        <h2 className="text-xl font-black">Match Information</h2>
        <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <p>
            <span className="text-slate-500">Venue:</span>{" "}
            {m.venue || "Not available"}
          </p>
          <p>
            <span className="text-slate-500">Date:</span>{" "}
            {m.dateTimeGMT || m.date || "Not available"}
          </p>
          <p>
            <span className="text-slate-500">Toss:</span>{" "}
            {m.tossWinner
              ? m.tossWinner + " chose " + (m.tossChoice || "")
              : "Not available"}
          </p>
          <p>
            <span className="text-slate-500">Status:</span>{" "}
            {m.status || "Not available"}
          </p>
        </div>
      </section>
    </main>
  );
}
