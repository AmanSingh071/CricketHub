import { getCurrentMatches, uniqueTeams } from "@/lib/cricket";

export const revalidate = 1800;

export default async function Rankings() {
  const teams = uniqueTeams(await getCurrentMatches());

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href="/" className="text-green-400">← CricketHub</a>
      <p className="mt-8 text-xs font-black tracking-[.2em] text-green-400">
        🏆 DATA CENTER
      </p>
      <h1 className="mt-2 text-4xl font-black">Rankings</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        Official ICC ranking values are not fabricated here. This page is prepared
        for a licensed/official rankings provider; below are teams currently
        appearing in the live data feed.
      </p>

      <div className="card mt-8 rounded-3xl p-5">
        {teams.map((t, i) => (
          <div
            key={t}
            className="flex items-center justify-between border-b border-[#20364d] py-4 last:border-0"
          >
            <span className="text-slate-500">{i + 1}</span>
            <span className="font-bold">🏏 {t}</span>
            <span className="text-xs text-slate-500">Feed team</span>
          </div>
        ))}
      </div>
    </main>
  );
}