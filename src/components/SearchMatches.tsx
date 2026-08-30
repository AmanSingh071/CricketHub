"use client";

import { FormEvent, useState } from "react";

type Match = {
  id: string;
  name: string;
  date?: string;
  venue?: string;
  status?: string;
};

export default function SearchMatches() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      const trimmedQuery = query.trim();

      if (trimmedQuery) params.set("q", trimmedQuery);
      if (date) params.set("date", date);

      const response = await fetch(`/api/search?${params.toString()}`, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Search failed");
      }

      const matches: Match[] = Array.isArray(payload?.data) ? payload.data : [];

      setRows(matches);

      if (matches.length === 0) {
        setMessage("No matches found. Try a team name, match ID, or another date.");
      }
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <a href="/" className="text-green-400">
        ← CricketHub
      </a>

      <p className="mt-8 text-xs font-black tracking-[.2em] text-sky-400">
        MATCH FINDER
      </p>

      <h1 className="mt-2 text-4xl font-black">Search cricket matches</h1>

      <p className="mt-3 text-slate-400">
        Search by team, match name or match ID, and narrow the results by date.
      </p>

      <form
        onSubmit={search}
        className="card mt-7 grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_220px_auto]"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="England vs Pakistan, India, IPL, match ID…"
          className="rounded-xl border border-[#29445e] bg-black/20 px-4 py-3 outline-none focus:border-green-400"
        />

        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-xl border border-[#29445e] bg-black/20 px-4 py-3 outline-none focus:border-green-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-green-500 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {rows.map((match) => (
          <a
            key={match.id}
            href={`/match/${match.id}`}
            className="card block rounded-2xl p-5 hover:border-green-400/60"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black">{match.name}</p>

                <p className="mt-2 text-sm text-slate-400">
                  {match.date || "Date not published"}
                  {match.venue ? ` • ${match.venue}` : ""}
                </p>

                <p className="mt-2 text-xs text-green-400">
                  {match.status || "Match center available"}
                </p>
              </div>

              <span className="font-bold text-green-400">Open →</span>
            </div>
          </a>
        ))}
      </div>

      {message ? (
        <div className="card mt-8 rounded-2xl p-5 text-slate-400">
          {message}
        </div>
      ) : null}
    </main>
  );
}
