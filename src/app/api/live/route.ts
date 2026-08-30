import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Match = {
  id: string;
  name: string;
  teams: string[];
  teamInfo: { name: string }[];
  score: { inning: string; r: number | null; w: number | null; o: string }[];
  status: string;
  matchStarted: boolean;
  matchEnded: boolean;
  source: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function clean(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isFinished(text: string) {
  return /(won by|match abandoned|no result|match drawn|stumps|completed|complete)/i.test(text);
}

function isLive(text: string) {
  return /(\bLIVE\b|\bneed\b|target|trail by|lead by|in progress|innings break)/i.test(text);
}

function teamsFrom(text: string) {
  const match = text.match(
    /([A-Za-z][A-Za-z .&'()\-]{1,80}?)\s+vs\.?\s+([A-Za-z][A-Za-z .&'()\-]{1,80}?)(?=\s+(?:LIVE|\d+(?:st|nd|rd|th)\s+Match)|\s*[|,]|$)/i
  );
  return match ? [match[1].trim(), match[2].trim()] : [];
}

function scoresFrom(text: string) {
  const result: Match["score"] = [];
  const seen = new Set<string>();
  const re = /\b([A-Z]{2,8})\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    result.push({
      inning: m[1],
      r: Number(m[2]),
      w: Number(m[3]),
      o: m[4].replace(/\s*(balls?|Balls?)\b/g, "").trim(),
    });
    if (result.length >= 2) break;
  }
  return result;
}

function parse(html: string): Match[] {
  const matches = new Map<string, Match>();
  const linkRe = /<a\b[^>]*href=["']([^"']*\/live-cricket-scores\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let link: RegExpExecArray | null;

  while ((link = linkRe.exec(html))) {
    const id = link[2];
    const around = html.slice(Math.max(0, link.index - 2500), Math.min(html.length, link.index + 6000));
    const text = clean(around);
    const anchorText = clean(link[3]);

    let name = anchorText;
    if (!/\bvs\.?\b/i.test(name)) {
      const titleMatch = text.match(
        /([A-Za-z][A-Za-z .&'()\-]{1,80}?\s+vs\.?\s+[A-Za-z][A-Za-z .&'()\-]{1,80}?)(?=\s+(?:LIVE|\d+(?:st|nd|rd|th)\s+Match)|\s*[|]|$)/i
      );
      if (titleMatch) name = titleMatch[1].trim();
    }

    const combined = name + " " + text;
    if (!name || isFinished(combined) || !isLive(combined)) continue;

    const teams = teamsFrom(name) || teamsFrom(text);
    matches.set(id, {
      id,
      name: name.replace(/\s+LIVE\s*$/i, "").trim(),
      teams,
      teamInfo: teams.map((name) => ({ name })),
      score: scoresFrom(text),
      status: "Live",
      matchStarted: true,
      matchEnded: false,
      source: "cricketHub-next-scraper",
    });
  }

  return [...matches.values()];
}

async function fetchPage(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  const html = await response.text();
  return { ok: response.ok, status: response.status, html };
}

export async function GET() {
  const urls = [
    "https://www.cricbuzz.com/cricket-match/live-scores",
    "https://www.cricbuzz.com/",
  ];

  const debug: Array<{ url: string; status?: number; bytes?: number; error?: string }> = [];
  const all = new Map<string, Match>();

  for (const url of urls) {
    try {
      const page = await fetchPage(url);
      debug.push({ url, status: page.status, bytes: page.html.length });
      if (!page.ok) continue;
      for (const match of parse(page.html)) all.set(match.id, match);
    } catch (error) {
      debug.push({ url, error: error instanceof Error ? error.message : "fetch failed" });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      data: [...all.values()],
      debug,
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}