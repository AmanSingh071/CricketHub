import { getScorecard } from "@/lib/cricket";

export const revalidate = 3600;

export default async function Scorecard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getScorecard(id);
  const innings = data?.score || data?.scorecard || [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href={"/match/" + id} className="text-green-400">← Match Center</a>
      <h1 className="mt-8 text-4xl font-black">Scorecard</h1>
      <p className="mt-2 text-sm text-slate-400">
        Cached for up to one hour to protect the free API quota.
      </p>

      {innings?.length ? (
        <div className="mt-8 space-y-5">
          {innings.map((inn: any, i: number) => (
            <section key={i} className="card rounded-2xl p-6">
              <h2 className="text-xl font-black">
                {inn.inning || "Innings " + (i + 1)}
              </h2>
              <pre className="mt-5 overflow-auto rounded-xl bg-black/20 p-4 text-xs text-slate-300">
                {JSON.stringify(inn, null, 2)}
              </pre>
            </section>
          ))}
        </div>
      ) : (
        <div className="card mt-8 rounded-2xl p-6 text-slate-400">
          A detailed scorecard was not returned for this match or endpoint.
        </div>
      )}
    </main>
  );
}