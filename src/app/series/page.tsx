import { getCurrentMatches, uniqueSeries } from "@/lib/cricket";

export const revalidate = 1800;

export default async function Series() {
  const series = uniqueSeries(await getCurrentMatches());

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href="/" className="text-green-400">← CricketHub</a>
      <h1 className="mt-8 text-4xl font-black">Series</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {series.map((s, i) => (
          <div className="card rounded-2xl p-6" key={s}>
            <span className="text-2xl">🏆</span>
            <h2 className="mt-4 text-xl font-black">{s}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Series detected from current match data.
            </p>
            <span className="mt-4 inline-block rounded-full bg-white/5 px-3 py-1 text-xs">
              Series #{i + 1}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}