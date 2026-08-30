import { getCurrentMatches, uniqueTeams } from "@/lib/cricket";

export const revalidate = 1800;

export default async function Teams() {
  const teams = uniqueTeams(await getCurrentMatches());

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href="/" className="text-green-400">← CricketHub</a>
      <h1 className="mt-8 text-4xl font-black">Teams</h1>
      <p className="mt-2 text-slate-400">Teams discovered from the cached real-time feed.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div className="card rounded-2xl p-6" key={t}>
            <div className="text-4xl">🏏</div>
            <h2 className="mt-4 text-xl font-black">{t}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Fixtures and match appearances update from the provider.
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}