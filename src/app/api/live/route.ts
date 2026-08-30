import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Score = { inning: string; r: number | null; w: number | null; o: string };
type Match = {
  id: string;
  name: string;
  teams: string[];
  teamInfo: { name: string }[];
  score: Score[];
  status: string;
  matchStarted: boolean;
  matchEnded: boolean;
  source: string;
};

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "application/json,text/plain,*/*",
  "accept-language": "en-US,en;q=0.9",
  referer: "https://www.cricbuzz.com/",
};

function text(v: unknown) {
  return String(v ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitTeams(name: string) {
  const m = name.match(/^(.+?)\s+vs\.?\s+(.+?)(?:,|$)/i);
  return m ? [m[1].trim(), m[2].trim()] : [];
}

function liveState(value: unknown) {
  const s = text(value).toLowerCase();
  return /inprogress|in progress|live|innings break|stumps|rain|delay|need|trail by|lead by|session/.test(s);
}

function finishedState(value: unknown) {
  const s = text(value).toLowerCase();
  return /complete|completed|won by|match drawn|no result|abandoned|abandon/.test(s);
}

function scoreList(raw: any, teams: string[]): Score[] {
  const out: Score[] = [];
  const score = raw?.score ?? raw?.scores ?? {};
  const candidates = [
    score?.batting,
    score?.bowling,
    raw?.score?.innings,
    raw?.innings,
    raw?.score,
  ].filter(Boolean);

  for (const c of candidates) {
    if (Array.isArray(c)) {
      for (const item of c) {
        const r = num(item?.runs ?? item?.r ?? item?.score);
        const w = num(item?.wickets ?? item?.w ?? item?.wkts);
        const o = text(item?.overs ?? item?.o ?? item?.ov);
        const inning = text(item?.team ?? item?.teamName ?? item?.inning ?? teams[out.length] ?? "Innings");
        if (r !== null || w !== null || o) out.push({ inning, r, w, o });
      }
      continue;
    }

    const rawScore = text(c?.score ?? c);
    const m = rawScore.match(/(\d+)\s*[-/]\s*(\d+)(?:\s*\(([^)]+)\))?/);
    const r = num(c?.runs ?? c?.r ?? m?.[1]);
    const w = num(c?.wickets ?? c?.w ?? c?.wkts ?? m?.[2]);
    const o = text(c?.overs ?? c?.o ?? c?.ov ?? m?.[3]);
    const inning = text(c?.team ?? c?.teamName ?? c?.batTeam ?? teams[out.length] ?? "Innings");
    if (r !== null || w !== null || o) {
      const key = inning + "|" + r + "|" + w + "|" + o;
      if (!out.some((x) => x.inning + "|" + x.r + "|" + x.w + "|" + x.o === key)) out.push({ inning, r, w, o });
    }
  }

  return out.slice(0, 4);
}

function mapNative(data: any): Match[] {
  const matches = data?.matches;
  const rows = Array.isArray(matches)
    ? matches.map((m) => [m?.id ?? m?.matchId, m])
    : matches && typeof matches === "object"
      ? Object.entries(matches)
      : [];

  const out: Match[] = [];

  for (const [key, raw] of rows as Array<[string, any]>) {
    const id = text(raw?.id ?? raw?.matchId ?? raw?.match_id ?? key);
    if (!/^\d+$/.test(id)) continue;

    const header = raw?.header ?? raw?.matchHeader ?? {};
    const t1 = text(raw?.team1?.name ?? raw?.team1?.teamName ?? raw?.team1?.shortName);
    const t2 = text(raw?.team2?.name ?? raw?.team2?.teamName ?? raw?.team2?.shortName);
    const teams = [t1, t2].filter(Boolean);
    const description = text(
      header?.matchDescription ?? header?.matchDesc ?? raw?.matchDescription ?? raw?.description ?? raw?.title
    );
    const name = teams.length === 2
      ? teams.join(" vs ") + (description ? ", " + description : "")
      : text(raw?.name ?? raw?.title ?? description);

    const status = text(
      header?.status ?? raw?.status ?? raw?.statusText ?? raw?.overview ?? raw?.stateTitle ?? header?.state
    );
    const state = text(header?.state ?? raw?.state ?? status);
    const ended = finishedState(status) || finishedState(state);
    const started = !ended && (
      liveState(status) ||
      liveState(state) ||
      /inprogress/i.test(state) ||
      scoreList(raw, teams).length > 0
    );

    if (!started || ended) continue;

    out.push({
      id,
      name: name || teams.join(" vs ") || "Live Match",
      teams,
      teamInfo: teams.map((name) => ({ name })),
      score: scoreList(raw, teams),
      status: status || "Live",
      matchStarted: true,
      matchEnded: false,
      source: "cricbuzz-match-api",
    });
  }

  return out;
}

function mapUnofficial(payload: any): Match[] {
  const rows = [
    ...(Array.isArray(payload?.data?.matches) ? payload.data.matches : []),
    ...(Array.isArray(payload?.data) ? payload.data : []),
  ];

  return rows.map((raw: any) => {
    const id = text(raw?.id ?? raw?.matchId);
    const teams: string[] = Array.isArray(raw?.teams)
      ? raw.teams.map((x: any) => text(x?.team ?? x?.name ?? x)).filter(Boolean)
      : splitTeams(text(raw?.title ?? raw?.name));
    const score: Score[] = (Array.isArray(raw?.teams) ? raw.teams : []).map((x: any, i: number) => {
      const s = text(x?.run ?? x?.score);
      const m = s.match(/(\d+)\s*[-/]\s*(\d+)(?:\s*\(([^)]+)\))?/);
      return {
        inning: teams[i] || "Innings",
        r: num(m?.[1]),
        w: num(m?.[2]),
        o: text(m?.[3]),
      };
    }).filter((x: Score) => x.r !== null || x.w !== null || x.o);

    return {
      id,
      name: text(raw?.title ?? raw?.name) || teams.join(" vs ") || "Live Match",
      teams,
      teamInfo: teams.map((name) => ({ name })),
      score,
      status: text(raw?.overview ?? raw?.status) || "Live",
      matchStarted: true,
      matchEnded: false,
      source: "cricbuzz-live-fallback",
    };
  }).filter((x: Match) => /^\d+$/.test(x.id));
}

async function getJson(url: string) {
  const r = await fetch(url, { cache: "no-store", headers: HEADERS });
  const body = await r.text();
  if (!r.ok) throw new Error("HTTP " + r.status);
  return JSON.parse(body);
}

export async function GET() {
  const debug: Array<{ source: string; ok: boolean; count?: number; error?: string }> = [];

  try {
    const data = await getJson("https://www.cricbuzz.com/match-api/livematches.json");
    const matches = mapNative(data);
    debug.push({ source: "cricbuzz-match-api", ok: true, count: matches.length });
    if (matches.length) {
      return NextResponse.json({ ok: true, data: matches, debug, fetchedAt: new Date().toISOString() }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  } catch (e) {
    debug.push({ source: "cricbuzz-match-api", ok: false, error: e instanceof Error ? e.message : "fetch failed" });
  }

  for (const type of ["international", "league", "domestic", "women"]) {
    try {
      const data = await getJson("https://cricbuzz-live.vercel.app/v1/matches/live?type=" + type);
      const matches = mapUnofficial(data);
      debug.push({ source: "cricbuzz-live-" + type, ok: true, count: matches.length });
      if (matches.length) {
        return NextResponse.json({ ok: true, data: matches, debug, fetchedAt: new Date().toISOString() }, {
          headers: { "Cache-Control": "no-store, max-age=0" },
        });
      }
    } catch (e) {
      debug.push({ source: "cricbuzz-live-" + type, ok: false, error: e instanceof Error ? e.message : "fetch failed" });
    }
  }

  return NextResponse.json(
    { ok: true, data: [], debug, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
