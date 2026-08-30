import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.cricbuzz.com/",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function decodeRsc(value:string) {
  // This is the JavaScript equivalent of Python's
  // .encode().decode("unicode_escape") used by the proven scraper.
  try {
    return JSON.parse("\"" + value.replace(/"/g, "\\\\\"") + "\"");
  } catch {
    return value
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
      .replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function balancedObject(text:string, start:number) {
  if (start < 0 || text[start] !== "{") return null;
  let depth = 0, quote = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quote = false;
      continue;
    }
    if (c === '"') quote = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function extractNextScorecard(html:string) {
  const marker = "scorecardApiData";
  const idx = html.indexOf(marker);
  if (idx < 0) return null;

  // Deliberately mirror the working Python implementation line-for-line.
  const start = html.lastIndexOf("self.__next_f.push", idx);
  if (start < 0) return null;
  const chunk = html.slice(start);
  const innerStart = chunk.indexOf('"') + 1;
  if (!innerStart) return null;

  let end = chunk.indexOf('"]\\n', innerStart);
  if (end < 0) end = chunk.indexOf('"])', innerStart);
  if (end < 0) end = chunk.indexOf('"]</script>', innerStart);
  if (end < 0) return null;

  const decoded = decodeRsc(chunk.slice(innerStart, end));
  const key = decoded.indexOf(marker);
  const brace = decoded.indexOf("{", key);
  const raw = balancedObject(decoded, brace);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.scoreCard) ? parsed : null;
  } catch {
    return null;
  }
}

function normalize(data:any, id:string, source:string) {
  const cards = Array.isArray(data?.scoreCard) ? data.scoreCard : [];
  const innings = cards.map((sc:any, index:number) => {
    const score = sc?.scoreDetails || {};
    const bat = sc?.batTeamDetails || {};
    const bowl = sc?.bowlTeamDetails || {};

    const batting = Object.values(bat?.batsmenData || {})
      .map((p:any) => ({
        batsman: p?.batName || "",
        dismissal: p?.outDesc || "batting",
        runs: p?.runs ?? "",
        balls: p?.balls ?? "",
        fours: p?.fours ?? "",
        sixes: p?.sixes ?? "",
        strikeRate: p?.strikeRate ?? "",
      }))
      .filter((p:any) => p.batsman);

    const bowling = Object.values(bowl?.bowlersData || {})
      .map((p:any) => ({
        bowler: p?.bowlName || "",
        overs: p?.overs ?? "",
        maidens: p?.maidens ?? "",
        runs: p?.runs ?? "",
        wickets: p?.wickets ?? "",
        noBalls: p?.noBalls ?? "",
        wides: p?.wides ?? "",
        economy: p?.economy ?? "",
      }))
      .filter((p:any) => p.bowler);

    return {
      inning: bat?.batTeamName || "Innings " + (index + 1),
      batting,
      bowling,
      extras: { runs: score?.extras ?? "" },
      total: { runs: score?.runs, wickets: score?.wickets, overs: score?.overs },
    };
  }).filter((inn:any) => inn.batting.length || inn.bowling.length || inn.total.runs !== undefined);

  const header = data?.matchHeader || {};
  const playingEleven:any = {};
  for (const sc of cards) {
    const bat = sc?.batTeamDetails || {};
    const names = Object.values(bat?.batsmenData || {}).map((p:any) => p?.batName).filter(Boolean);
    if (bat?.batTeamName && names.length) playingEleven[bat.batTeamName] = Array.from(new Set(names));
  }

  return {
    status: "success",
    id,
    name: header?.matchDescription || header?.seriesName || "Detailed Scorecard",
    matchStatus: header?.status || "Live",
    scorecard: innings,
    playingEleven,
    toss: header?.tossResults?.tossWinnerName
      ? { winner: header.tossResults.tossWinnerName, decision: header.tossResults.decision || "" }
      : null,
    result: header?.result?.winningTeam
      ? { winner: header.result.winningTeam, margin: header.result.winningMargin, byRuns: header.result.winByRuns, byInnings: header.result.winByInnings }
      : null,
    source,
  };
}

function normalizeLive(raw:any, id:string, source:string) {
  const mini = raw?.miniscore || {};
  const header = raw?.matchHeader || {};
  const bat = mini?.batTeam || {};
  const striker = mini?.batsmanStriker || {};
  const nonStriker = mini?.batsmanNonStriker || {};
  const bowler = mini?.bowlerStriker || {};

  const batting = [
    { batsman:striker?.name || striker?.batName || "", dismissal:"batting", runs:striker?.runs ?? striker?.batRuns ?? "", balls:striker?.balls ?? striker?.batBalls ?? "", fours:striker?.fours ?? striker?.batFours ?? "", sixes:striker?.sixes ?? striker?.batSixes ?? "", strikeRate:striker?.strikeRate ?? striker?.batStrikeRate ?? "" },
    { batsman:nonStriker?.name || nonStriker?.batName || "", dismissal:"batting", runs:nonStriker?.runs ?? nonStriker?.batRuns ?? "", balls:nonStriker?.balls ?? nonStriker?.batBalls ?? "", fours:nonStriker?.fours ?? nonStriker?.batFours ?? "", sixes:nonStriker?.sixes ?? nonStriker?.batSixes ?? "", strikeRate:nonStriker?.strikeRate ?? nonStriker?.batStrikeRate ?? "" },
  ].filter(x => x.batsman);

  const bowling = [{
    bowler:bowler?.name || bowler?.bowlName || "",
    overs:bowler?.overs ?? bowler?.bowlOvs ?? "",
    maidens:bowler?.maidens ?? "",
    runs:bowler?.runs ?? bowler?.bowlRuns ?? "",
    wickets:bowler?.wickets ?? bowler?.bowlWkts ?? "",
    noBalls:"", wides:"",
    economy:bowler?.economy ?? bowler?.bowlEcon ?? "",
  }].filter(x => x.bowler);

  const totalRuns = bat?.teamScore ?? mini?.teamScore;
  if (!batting.length && !bowling.length && totalRuns === undefined) return null;

  return {
    status:"success", id,
    name:header?.matchDescription || header?.seriesName || "Live Score",
    matchStatus:mini?.status || header?.status || "Live",
    scorecard:[{
      inning:mini?.batTeamScoreObj?.teamName || bat?.teamName || "Current innings",
      batting, bowling,
      extras:{runs:""},
      total:{runs:totalRuns, wickets:bat?.teamWkts ?? mini?.teamWkts, overs:mini?.overs},
    }],
    playingEleven:{},
    source,
  };
}

function normalizeExternal(raw:any, id:string) {
  const d = raw?.data || raw;
  if (!d || (!d?.batsmanOne && !d?.batsmanTwo && !d?.bowlerOne)) return null;

  const score = String(d.liveScore || "");
  const m = score.match(/(.+?)\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/);

  const batting = [
    { batsman:d.batsmanOne || "", dismissal:"batting", runs:d.batsmanOneRun || "", balls:String(d.batsmanOneBall || "").replace(/[()]/g,""), fours:"", sixes:"", strikeRate:d.batsmanOneSR || "" },
    { batsman:d.batsmanTwo || "", dismissal:"batting", runs:d.batsmanTwoRun || "", balls:String(d.batsmanTwoBall || "").replace(/[()]/g,""), fours:"", sixes:"", strikeRate:d.batsmanTwoSR || "" },
  ].filter(x => x.batsman);

  const bowling = [
    { bowler:d.bowlerOne || "", overs:d.bowlerOneOver || "", maidens:"", runs:d.bowlerOneRun || "", wickets:d.bowlerOneWickets || "", noBalls:"", wides:"", economy:d.bowlerOneEconomy || "" },
    { bowler:d.bowlerTwo || "", overs:d.bowlerTwoOver || "", maidens:"", runs:d.bowlerTwoRun || "", wickets:d.bowlerTwoWicket || d.bowlerTwoWickets || "", noBalls:"", wides:"", economy:d.bowlerTwoEconomy || "" },
  ].filter(x => x.bowler && x.bowler !== "Bowler");

  return {
    status:"success", id,
    name:String(d.title || "Live Score").replace(/\s*-\s*Live Cricket Score.*$/i,""),
    matchStatus:d.update || "Live",
    scorecard:[{
      inning:m?.[1]?.trim() || "Current innings",
      batting, bowling,
      extras:{runs:""},
      total:{runs:m?.[2] ?? "", wickets:m?.[3] ?? "", overs:m?.[4] ?? ""},
    }],
    playingEleven:{},
    source:"cricbuzz-live-fallback",
  };
}

async function fetchText(url:string, accept="text/html") {
  const response = await fetch(url, { cache:"no-store", redirect:"follow", headers:{...HEADERS, Accept:accept} });
  return { status:response.status, ok:response.ok, text:await response.text() };
}

export async function GET(req:NextRequest) {
  const id = req.nextUrl.searchParams.get("score") || "";
  if (!/^\d+$/.test(id)) return NextResponse.json({ status:"error", message:"Invalid match id" }, { status:400 });

  const debug:string[] = [];

  // Strategy 1: scrape Cricbuzz's current Next.js RSC payload.
  for (const host of ["https://www.cricbuzz.com", "https://mlb.cricbuzz.com"]) {
    try {
      const r = await fetchText(host + "/live-cricket-scorecard/" + id);
      debug.push("RSC " + host + " HTTP " + r.status + " bytes=" + r.text.length);
      if (!r.ok) continue;
      const embedded = extractNextScorecard(r.text);
      if (!embedded) { debug.push("RSC marker not parsed on " + host); continue; }
      const normalized = normalize(embedded, id, host.includes("mlb") ? "cricbuzz-mobile-rsc" : "cricbuzz-rsc");
      if (normalized.scorecard.length) {
        return NextResponse.json(normalized, { headers:{ "Cache-Control":"no-store, max-age=0" } });
      }
      debug.push("RSC parsed but innings empty on " + host);
    } catch (e) {
      debug.push("RSC fetch failed on " + host + ": " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // Strategy 2: Cricbuzz live match-center JSON. Works even when the full
  // scorecard page changes its HTML/RSC structure.
  for (const endpoint of [
    "https://www.cricbuzz.com/api/mcenter/comm/" + id,
    "https://www.cricbuzz.com/api/mcenter/" + id,
  ]) {
    try {
      const r = await fetchText(endpoint, "application/json");
      debug.push("MCENTER HTTP " + r.status + " bytes=" + r.text.length);
      if (!r.ok) continue;
      const normalized = normalizeLive(JSON.parse(r.text), id, "cricbuzz-match-center");
      if (normalized) return NextResponse.json(normalized, { headers:{ "Cache-Control":"no-store, max-age=0" } });
    } catch (e) {
      debug.push("MCENTER failed: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // Strategy 3: independent scraper fallback. This prevents a single
  // Cricbuzz HTML change from leaving the UI completely blank.
  try {
    const r = await fetchText("https://cricbuzz-live.vercel.app/v1/score/" + id, "application/json");
    debug.push("FALLBACK HTTP " + r.status + " bytes=" + r.text.length);
    if (r.ok) {
      const normalized = normalizeExternal(JSON.parse(r.text), id);
      if (normalized) return NextResponse.json(normalized, { headers:{ "Cache-Control":"no-store, max-age=0" } });
    }
  } catch (e) {
    debug.push("FALLBACK failed: " + (e instanceof Error ? e.message : "unknown"));
  }

  return NextResponse.json({
    status:"error",
    message:"No scorecard data could be retrieved for match " + id,
    debug,
  }, { status:502, headers:{ "Cache-Control":"no-store, max-age=0" } });
}