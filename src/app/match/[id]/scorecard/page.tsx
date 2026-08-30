import { getScorecard } from "@/lib/cricket";

export const revalidate = 3600;

function value(v:any, fallback="—") {
  return v === undefined || v === null || v === "" ? fallback : String(v);
}

function PlayerName(row:any) {
  return row?.batsman || row?.batter || row?.name || row?.bowler || row?.player || "Unknown player";
}

export default async function Scorecard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getScorecard(id);
  const innings = Array.isArray(data?.scorecard) ? data.scorecard : Array.isArray(data?.score) ? data.score : [];
  const matchName = data?.name || data?.matchName || "Detailed Scorecard";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href={"/match/" + id} className="text-sm font-bold text-green-400">← Match Center</a>

      <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black tracking-[.2em] text-red-400">🔴 LIVE SCORECARD</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">{matchName}</h1>
          {data?.status && <p className="mt-3 text-slate-400">{data.status}</p>}
        </div>
        <a href={"/match/" + id + "/watch"} className="rounded-xl bg-green-500 px-5 py-3 text-center font-black text-slate-950">▶ Watch Match</a>
      </div>

      {innings.length ? (
        <div className="mt-8 space-y-8">
          {innings.map((inn:any, i:number) => {
            const batting = Array.isArray(inn?.batting) ? inn.batting : Array.isArray(inn?.batsmen) ? inn.batsmen : [];
            const bowling = Array.isArray(inn?.bowling) ? inn.bowling : [];
            const total = inn?.total || inn?.score || {};
            return (
              <section key={i} className="card overflow-hidden rounded-3xl">
                <div className="border-b border-[#20364d] p-6">
                  <p className="text-xs font-black tracking-[.18em] text-green-400">INNINGS {i + 1}</p>
                  <h2 className="mt-2 text-2xl font-black">{inn?.inning || inn?.teamName || inn?.team || "Innings " + (i + 1)}</h2>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {total && typeof total === "object" && (
                      <>
                        {(total.r !== undefined || total.runs !== undefined) && <span className="rounded-full bg-green-500/10 px-3 py-2 font-black text-green-300">{value(total.r ?? total.runs)}/{value(total.w ?? total.wickets, "0")}</span>}
                        {(total.o !== undefined || total.overs !== undefined) && <span className="rounded-full bg-white/[.04] px-3 py-2 text-slate-300">{value(total.o ?? total.overs)} overs</span>}
                      </>
                    )}
                  </div>
                </div>

                {batting.length > 0 && (
                  <div className="p-6">
                    <h3 className="text-lg font-black">Batting</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="border-b border-[#20364d] text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Batter</th><th className="px-3 py-3">Dismissal</th><th className="px-3 py-3 text-right">R</th><th className="px-3 py-3 text-right">B</th><th className="px-3 py-3 text-right">4s</th><th className="px-3 py-3 text-right">6s</th><th className="px-3 py-3 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batting.map((row:any, j:number) => (
                            <tr key={j} className="border-b border-white/[.04]">
                              <td className="px-3 py-4 font-bold">{PlayerName(row)} {row?.captain && " (c)"} {row?.keeper && " (wk)"}</td>
                              <td className="max-w-[260px] px-3 py-4 text-xs text-slate-400">{value(row?.dismissal || row?.howOut || row?.dismissalText)}</td>
                              <td className="px-3 py-4 text-right font-black">{value(row?.r ?? row?.runs)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.b ?? row?.balls)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.["4s"] ?? row?.fours)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.["6s"] ?? row?.sixes)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.sr ?? row?.strikeRate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {inn?.extras && <p className="mt-4 text-sm text-slate-400">Extras: <span className="font-bold text-white">{value(typeof inn.extras === "object" ? inn.extras.r ?? inn.extras.runs : inn.extras)}</span></p>}
                  </div>
                )}

                {bowling.length > 0 && (
                  <div className="border-t border-[#20364d] p-6">
                    <h3 className="text-lg font-black">Bowling</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="border-b border-[#20364d] text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Bowler</th><th className="px-3 py-3 text-right">O</th><th className="px-3 py-3 text-right">M</th><th className="px-3 py-3 text-right">R</th><th className="px-3 py-3 text-right">W</th><th className="px-3 py-3 text-right">NB</th><th className="px-3 py-3 text-right">WD</th><th className="px-3 py-3 text-right">Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bowling.map((row:any, j:number) => (
                            <tr key={j} className="border-b border-white/[.04]">
                              <td className="px-3 py-4 font-bold">{PlayerName(row)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.o ?? row?.overs)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.m ?? row?.maidens)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.r ?? row?.runs)}</td>
                              <td className="px-3 py-4 text-right font-black text-green-300">{value(row?.w ?? row?.wickets)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.nb ?? row?.noBalls)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.wd ?? row?.wides)}</td>
                              <td className="px-3 py-4 text-right">{value(row?.econ ?? row?.economy)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card mt-8 rounded-3xl p-7">
          <p className="text-lg font-black">Detailed scorecard is not available yet</p>
          <p className="mt-2 text-sm text-slate-400">This can happen when the provider has not published player-by-player batting and bowling data for this match.</p>
        </div>
      )}
    </main>
  );
}