"use client";

import { useMemo, useState, type ReactNode } from "react";

export type AnalyticsMatch = {
  id: string;
  name: string;
  status?: string;
  date?: string;
  teams?: string[];
  score?: { r?: number; w?: number; o?: number | string; inning?: string }[];
  matchStarted?: boolean;
  matchEnded?: boolean;
};

type Props = {
  liveCount: number;
  recentCount: number;
  inningsAnalysed: number;
  runsAnalysed: number;
  averageRunRate: string;
  scorecardCoverage: number;
  matches: AnalyticsMatch[];
  topTeams: { name: string; matches: number }[];
};

const tabs = [
  { id: "health", icon: "📈", title: "Live match health", subtitle: "Data freshness, match status and source confidence" },
  { id: "runrate", icon: "⚡", title: "Run-rate analysis", subtitle: "Compare scoring tempo across available innings" },
  { id: "impact", icon: "⭐", title: "Player impact", subtitle: "Jump to player statistics and recent contributions" },
  { id: "probability", icon: "🎯", title: "Win probability", subtitle: "Only shown when reliable ball-by-ball data exists" },
  { id: "headtohead", icon: "🤝", title: "Head-to-head", subtitle: "Compare recent matchups between the same teams" },
  { id: "form", icon: "📉", title: "Form trends", subtitle: "Review the latest completed and live results" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function scoreText(match: AnalyticsMatch) {
  if (!match.score?.length) return "Score not available";
  return match.score
    .map((s) => `${s.inning || "Innings"} ${s.r ?? 0}/${s.w ?? 0} (${s.o ?? 0})`)
    .join(" • ");
}

export default function AnalyticsDashboard(props: Props) {
  const [active, setActive] = useState<TabId>("health");

  const recentRows = useMemo(() => props.matches.slice(0, 8), [props.matches]);

  const headToHead = useMemo(() => {
    const map = new Map<string, { teams: string[]; count: number; ids: string[] }>();
    for (const match of props.matches) {
      const teams = (match.teams || []).filter(Boolean).slice(0, 2);
      if (teams.length < 2) continue;
      const key = [...teams].sort().join(" vs ");
      const current = map.get(key) || { teams: [...teams].sort(), count: 0, ids: [] };
      current.count += 1;
      current.ids.push(match.id);
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [props.matches]);

  const content = {
    health: (
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Live now", String(props.liveCount), "Matches currently marked active"],
          ["Recent results", String(props.recentCount), "Completed matches available to inspect"],
          ["Score coverage", String(props.scorecardCoverage), "Matches carrying score data in the loaded feed"],
        ].map(([label, value, description]) => (
          <div key={label} className="rounded-2xl border border-[#20364d] bg-[#0b1726] p-5">
            <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-green-300">{value}</p>
            <p className="mt-2 text-sm text-slate-400">{description}</p>
          </div>
        ))}
      </div>
    ),
    runrate: (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#20364d] bg-[#0b1726] p-5">
          <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Loaded sample</p>
          <p className="mt-2 text-3xl font-black text-green-300">{props.averageRunRate}</p>
          <p className="mt-2 text-sm text-slate-400">
            Average run rate across {props.inningsAnalysed} innings with usable runs and overs in the currently loaded feed.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {recentRows.filter((m) => m.score?.length).slice(0, 6).map((m) => (
            <a key={m.id} href={"/match/" + encodeURIComponent(m.id) + "/scorecard"} className="rounded-xl border border-[#20364d] bg-white/[.02] p-4 transition hover:border-green-400/60">
              <p className="font-black">{m.name}</p>
              <p className="mt-2 text-sm text-green-300">{scoreText(m)}</p>
            </a>
          ))}
        </div>
      </div>
    ),
    impact: (
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl border border-[#20364d] bg-[#0b1726] p-6">
          <h3 className="text-xl font-black">Player impact is linked to real scorecard data</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Open the Players directory to inspect aggregated runs, wickets and innings from parsed scorecards. The analytics page does not invent player-impact values when a scorecard has not supplied them.
          </p>
        </div>
        <a href="/players" className="rounded-xl bg-green-500 px-5 py-3 text-center font-black text-slate-950">Open Players →</a>
      </div>
    ),
    probability: (
      <div className="rounded-2xl border border-[#20364d] bg-[#0b1726] p-6">
        <h3 className="text-xl font-black">Win probability needs ball-by-ball coverage</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          CricketHub will only calculate a probability when a reliable live feed provides enough information such as score, wickets, overs, target and match context. Until then, this panel stays transparent instead of displaying a made-up percentage.
        </p>
        <a href="/live" className="mt-5 inline-block rounded-xl border border-green-400/40 px-5 py-3 font-black text-green-300">View live matches →</a>
      </div>
    ),
    headtohead: (
      <div className="space-y-3">
        {headToHead.length ? headToHead.map((pair) => (
          <div key={pair.teams.join("|")} className="flex flex-col justify-between gap-3 rounded-2xl border border-[#20364d] bg-[#0b1726] p-5 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-black">{pair.teams.join(" vs ")}</p>
              <p className="mt-1 text-sm text-slate-400">{pair.count} matchup{pair.count === 1 ? "" : "s"} found in the loaded match set</p>
            </div>
            <a href={"/search?q=" + encodeURIComponent(pair.teams.join(" "))} className="font-black text-green-300">Find matches →</a>
          </div>
        )) : <p className="rounded-2xl border border-[#20364d] bg-[#0b1726] p-6 text-slate-400">No repeated team pair is available in the currently loaded results.</p>}
      </div>
    ),
    form: (
      <div className="space-y-3">
        {recentRows.length ? recentRows.map((m) => (
          <a key={m.id} href={"/match/" + encodeURIComponent(m.id) + "/scorecard"} className="block rounded-2xl border border-[#20364d] bg-[#0b1726] p-5 transition hover:border-green-400/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black">{m.name}</p>
                <p className="mt-2 text-sm text-slate-400">{m.status || (m.matchEnded ? "Completed" : m.matchStarted ? "Live" : "Scheduled")}</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">{m.date || "Recent"}</span>
            </div>
            <p className="mt-3 text-sm text-green-300">{scoreText(m)}</p>
          </a>
        )) : <p className="rounded-2xl border border-[#20364d] bg-[#0b1726] p-6 text-slate-400">No recent match rows are available yet.</p>}
      </div>
    ),
  } satisfies Record<TabId, ReactNode>;

  return (
    <div className="mt-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-pressed={selected}
              className={`card rounded-3xl p-6 text-left transition focus:outline-none focus:ring-2 focus:ring-green-400 ${selected ? "border-green-400 bg-green-500/[.06]" : "hover:-translate-y-0.5 hover:border-green-400/50"}`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <h2 className="mt-4 text-xl font-black">{tab.title}</h2>
              <p className="mt-2 min-h-10 text-sm text-slate-400">{tab.subtitle}</p>
              <span className="mt-5 inline-block text-sm font-black text-green-300">{selected ? "Showing details ↓" : "Open analysis →"}</span>
            </button>
          );
        })}
      </div>

      <section className="card mt-6 rounded-3xl p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#20364d] pb-5">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-green-300">ACTIVE ANALYSIS</p>
            <h2 className="mt-2 text-2xl font-black">{tabs.find((t) => t.id === active)?.title}</h2>
          </div>
          <span className="rounded-full bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-400">Interactive</span>
        </div>
        {content[active]}
      </section>
    </div>
  );
}
