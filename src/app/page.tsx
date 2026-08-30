const liveMatches = [
  { id: "ind-aus", format: "International T20", a: "India", af: "🇮🇳", as: "186/4", ao: "17.2", b: "Australia", bf: "🇦🇺", bs: "214/7", bo: "20.0", status: "India need 29 runs from 16 balls" },
  { id: "eng-sa", format: "International ODI", a: "England", af: "🏴", as: "142/3", ao: "24.1", b: "South Africa", bf: "🇿🇦", bs: "286/8", bo: "50.0", status: "England require 145 runs" },
  { id: "pak-nz", format: "T20 Series", a: "Pakistan", af: "🇵🇰", as: "97/2", ao: "11.4", b: "New Zealand", bf: "🇳🇿", bs: "184/6", bo: "20.0", status: "Pakistan require 88 runs" },
];

const rankings = [
  ["1","India","121"],["2","Australia","118"],["3","England","112"],["4","South Africa","109"],["5","New Zealand","106"]
];

const upcoming = [
  ["England","Pakistan","Tomorrow","7:30 PM"],
  ["India","South Africa","Tomorrow","2:00 PM"],
  ["Australia","New Zealand","31 Aug","9:30 AM"],
  ["Bangladesh","Sri Lanka","1 Sep","6:30 PM"],
];

export default function Home() {
  const featured = liveMatches[0];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#20364d] bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 text-xl shadow-lg shadow-green-500/20">🏏</div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Cricket<span className="text-green-400">Hub</span></h1>
              <p className="hidden text-xs text-slate-400 sm:block">Live Cricket. Everywhere.</p>
            </div>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex">
            <a className="text-white" href="/">Home</a><a href="/live">Live</a><a href="/schedule">Schedule</a><a href="/rankings">Rankings</a><a href="/teams">Teams</a><a href="/series">Series</a>
          </nav>
          <div className="flex items-center gap-3 text-lg"><button className="rounded-lg p-2 hover:bg-white/5">⌕</button><button className="rounded-lg p-2 hover:bg-white/5">🔔</button><button className="rounded-lg p-2 hover:bg-white/5 lg:hidden">☰</button></div>
        </div>
      </header>

      <div className="border-b border-[#20364d] bg-[#091624]">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 text-xs font-bold md:px-6">
          <span className="whitespace-nowrap rounded-full bg-red-500/10 px-3 py-2 text-red-400">🔴 LIVE {liveMatches.length}</span>
          {["International","Test","ODI","T20","Domestic"].map(x => <span key={x} className="whitespace-nowrap rounded-full px-3 py-2 text-slate-400">{x}</span>)}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="mb-10 grid gap-6 lg:grid-cols-[1.6fr_.9fr]">
          <div className="card overflow-hidden rounded-3xl">
            <div className="min-h-[430px] bg-gradient-to-br from-green-500/10 via-transparent to-sky-500/10 p-6 md:p-10">
              <div className="mb-8 flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-400"><i className="live-dot h-2 w-2 rounded-full bg-red-500" />LIVE NOW</span>
                <span className="text-sm text-slate-400">{featured.format}</span>
              </div>
              <div className="text-center">
                <p className="mb-7 text-sm text-slate-400">Live Match Center</p>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Team name={featured.a} flag={featured.af} score={featured.as} overs={featured.ao} />
                  <div><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#29445e] bg-[#0b1725] text-sm font-black text-slate-400">VS</div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Chase</p></div>
                  <Team name={featured.b} flag={featured.bf} score={featured.bs} overs={featured.bo} />
                </div>
                <div className="mx-auto mt-8 max-w-md rounded-2xl border border-green-500/15 bg-green-500/5 p-4 text-sm font-semibold text-green-300">{featured.status}</div>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a href={"/match/"+featured.id} className="rounded-xl bg-green-500 px-5 py-3 font-bold text-[#07111f] hover:scale-[1.02]">📊 Match Center</a>
                  <a href={"/match/"+featured.id+"/watch"} className="rounded-xl border border-[#29445e] bg-[#0b1725] px-5 py-3 font-bold hover:border-green-500/50">▶ Watch</a>
                </div>
              </div>
            </div>
          </div>

          <aside className="card rounded-3xl p-5">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold text-green-400">ICC</p><h2 className="text-xl font-black">Team Rankings</h2></div><span className="text-2xl">🏆</span></div>
            <div className="space-y-2">
              {rankings.map(([rank,team,points]) => <div key={team} className="flex items-center justify-between rounded-xl bg-white/[.025] p-3"><div className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-slate-400">{rank}</span><span className="font-semibold">{team}</span></div><span className="text-sm font-bold text-green-400">{points}</span></div>)}
            </div>
            <a href="/rankings" className="mt-5 block rounded-xl border border-[#29445e] p-3 text-center text-sm font-bold text-slate-300 hover:border-green-500/50 hover:text-green-400">View Full Rankings →</a>
          </aside>
        </section>

        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between"><div><p className="mb-2 text-xs font-black tracking-[.2em] text-red-400">🔴 LIVE CRICKET</p><h2 className="text-2xl font-black md:text-3xl">Matches happening now</h2></div><a href="/live" className="hidden text-sm font-bold text-green-400 sm:block">View all →</a></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveMatches.map(m => <article key={m.id} className="card rounded-2xl p-5 hover:-translate-y-1 hover:border-green-500/30">
              <div className="mb-5 flex justify-between text-xs"><span className="flex items-center gap-2 font-bold text-red-400"><i className="live-dot h-2 w-2 rounded-full bg-red-500" />LIVE</span><span className="text-slate-500">{m.format}</span></div>
              <ScoreRow name={m.a} score={m.as} overs={m.ao}/><ScoreRow name={m.b} score={m.bs} overs={m.bo}/>
              <div className="mt-5 border-t border-[#20364d] pt-4"><p className="mb-4 text-xs text-slate-400">{m.status}</p><div className="flex gap-2"><a href={"/match/"+m.id} className="flex-1 rounded-lg bg-white/5 py-2.5 text-center text-sm font-bold hover:bg-green-500 hover:text-[#07111f]">Scorecard</a><a href={"/match/"+m.id+"/watch"} className="rounded-lg border border-[#29445e] px-4 py-2 hover:border-green-500">📺</a></div></div>
            </article>)}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card rounded-3xl p-6"><div className="mb-6 flex items-center justify-between"><div><p className="mb-2 text-xs font-black tracking-[.2em] text-sky-400">📅 UPCOMING</p><h2 className="text-2xl font-black">Next Matches</h2></div><a href="/schedule" className="text-sm font-bold text-green-400">Full Schedule</a></div>
            <div className="space-y-3">{upcoming.map(([a,b,date,time]) => <div key={a+b} className="flex items-center justify-between rounded-2xl border border-[#20364d] bg-[#091624]/70 p-4"><div><p className="font-bold">{a} <span className="text-slate-600">vs</span> {b}</p><p className="mt-1 text-xs text-slate-500">International Match</p></div><div className="text-right"><p className="text-sm font-bold text-green-400">{date}</p><p className="text-xs text-slate-500">{time}</p></div></div>)}</div>
          </div>
          <div className="card rounded-3xl p-6"><p className="mb-2 text-xs font-black tracking-[.2em] text-purple-400">🏆 PLATFORM</p><h2 className="text-2xl font-black">Built for Cricket Fans</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{[["📊","Live Scorecards"],["📺","Watch Center"],["🏆","ICC Rankings"],["📅","Fixtures & Results"],["👥","Teams & Players"],["📈","Match Statistics"]].map(([icon,title]) => <div key={title} className="rounded-2xl border border-[#20364d] bg-[#091624]/70 p-4"><span className="text-xl">{icon}</span><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-xs text-slate-500">Coming online in CricketHub</p></div>)}</div>
          </div>
        </section>
      </div>
      <footer className="mt-10 border-t border-[#20364d] bg-[#06101c]"><div className="mx-auto flex max-w-7xl justify-between px-4 py-8 text-sm text-slate-500 md:px-6"><span className="font-bold text-slate-300">Cricket<span className="text-green-400">Hub</span></span><span>Live Cricket Platform</span></div></footer>
    </main>
  );
}

function Team({name,flag,score,overs}:{name:string;flag:string;score:string;overs:string}) {
  return <div><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-3xl">{flag}</div><h2 className="text-xl font-black md:text-2xl">{name}</h2><p className="mt-2 text-3xl font-black">{score}</p><p className="text-sm text-slate-400">{overs} overs</p></div>
}
function ScoreRow({name,score,overs}:{name:string;score:string;overs:string}) {
  return <div className="mb-4 flex items-center justify-between"><span className="font-bold">{name}</span><div><span className="font-black">{score}</span><span className="ml-2 text-xs text-slate-500">{overs}</span></div></div>
}
