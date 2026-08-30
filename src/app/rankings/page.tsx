const rankings = {
  test: [
    ["Australia",131],["South Africa",119],["New Zealand",106],["India",104],["England",99],
    ["Sri Lanka",86],["Pakistan",75],["Bangladesh",73],["West Indies",68],["Zimbabwe",17]
  ],
  odi: [
    ["India",118],["New Zealand",113],["Australia",109],["South Africa",102],["Pakistan",98],
    ["Sri Lanka",96],["Afghanistan",93],["England",89],["Bangladesh",84],["West Indies",74]
  ],
  t20: [
    ["India",275],["England",262],["Australia",258],["New Zealand",247],["South Africa",244],
    ["West Indies",238],["Pakistan",235],["Sri Lanka",224],["Afghanistan",220],["Bangladesh",214]
  ],
};

const groups = [
  { key: "test", title: "Men's Test" },
  { key: "odi", title: "Men's ODI" },
  { key: "t20", title: "Men's T20I" },
] as const;

export default function Rankings() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <a href="/" className="text-green-400">← CricketHub</a>

      <section className="card mt-8 rounded-3xl p-6 md:p-10">
        <p className="text-xs font-black tracking-[.2em] text-green-400">🏆 ICC WORLD RANKINGS</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">Team Rankings</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          A quick CricketHub view of leading international teams across the three men's formats.
          Rankings change regularly, so use the official ICC rankings page for the complete live table.
        </p>
        <a
          href="https://www.icc-cricket.com/rankings"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex rounded-xl bg-green-500 px-5 py-3 font-bold text-slate-950"
        >
          View complete official ICC rankings ↗
        </a>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {groups.map(({ key, title }) => (
          <section key={key} className="card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">{title}</h2>
              <span className="text-xs text-slate-500">Top 10</span>
            </div>
            <div className="mt-5 space-y-2">
              {rankings[key].map(([team, points], i) => (
                <div key={team} className="flex items-center gap-3 rounded-xl bg-white/[.03] px-4 py-3">
                  <span className={"w-7 text-center font-black " + (i < 3 ? "text-green-400" : "text-slate-500")}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-bold">🏏 {team}</span>
                  <span className="text-sm text-slate-400">{points} pts</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="card mt-8 rounded-3xl p-6">
        <h2 className="text-2xl font-black">More rankings coming next</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {["Women's teams","Men's players","Women's players"].map((item) => (
            <div key={item} className="rounded-2xl border border-[#29445e] p-5">
              <div className="text-2xl">📊</div>
              <h3 className="mt-3 font-bold">{item}</h3>
              <p className="mt-2 text-sm text-slate-400">Reserved for a dedicated rankings data source.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}