import asyncio
import time
from typing import Any
import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="CricketHub Live Feed", docs_url=None, redoc_url=None)

CACHE: dict[str, Any] = {"at": 0.0, "data": [], "error": None}
TTL = 15
HEADER_URL = "https://site.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&region=in&tz=Asia/Calcutta"
SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/cricket/{league}/scoreboard"

def clean(v: Any) -> str:
    return " ".join(str(v or "").split())

def status_text(event: dict) -> str:
    competition = (event.get("competitions") or [{}])[0]
    status = competition.get("status") or event.get("status") or {}
    return clean(status.get("type", {}).get("detail") or status.get("type", {}).get("shortDetail") or status.get("displayClock") or "Live")

def normalize_event(event: dict, league_id: str, league_name: str):
    competition = (event.get("competitions") or [{}])[0]
    status = competition.get("status") or event.get("status") or {}
    competitors = competition.get("competitors") or event.get("competitors") or []
    teams, team_info, score = [], [], []
    for c in competitors:
        team = c.get("team") or {}
        name = clean(team.get("displayName") or team.get("shortDisplayName") or team.get("name"))
        if name:
            teams.append(name)
            team_info.append({"name": name, "shortname": clean(team.get("abbreviation")), "img": team.get("logo")})
        lines = c.get("linescores") or []
        if lines:
            ls = lines[-1] or {}
            score.append({
                "inning": clean(team.get("abbreviation") or name),
                "r": ls.get("runs", c.get("score")),
                "w": ls.get("wickets"),
                "o": ls.get("overs"),
            })
        elif c.get("score") not in (None, ""):
            score.append({"inning": clean(team.get("abbreviation") or name), "r": c.get("score")})
    state = clean((status.get("type") or {}).get("state")).lower()
    completed = bool((status.get("type") or {}).get("completed")) or state in ("post", "final")
    started = state in ("in", "live", "inprogress", "active")
    event_id = str(event.get("id"))
    return {
        "id": f"{league_id}:{event_id}",
        "eventId": event_id,
        "leagueId": str(league_id),
        "name": clean(event.get("name") or event.get("shortName") or " vs ".join(teams)),
        "teams": teams,
        "teamInfo": team_info,
        "score": score,
        "status": status_text(event),
        "date": event.get("date"),
        "dateTimeGMT": event.get("date"),
        "seriesName": league_name,
        "matchStarted": started,
        "matchEnded": completed,
        "source": "espn-public-feed",
    }

async def fetch_json(client: httpx.AsyncClient, url: str):
    r = await client.get(url)
    r.raise_for_status()
    return r.json()

async def get_live_matches():
    headers = {"User-Agent": "Mozilla/5.0 (CricketHub live data)", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, headers=headers) as client:
        header = await fetch_json(client, HEADER_URL)
        sports = header.get("sports") or []
        leagues = []
        for sport in sports:
            leagues.extend(sport.get("leagues") or [])

        async def fetch_league(league):
            lid = str(league.get("id") or "")
            if not lid:
                return []
            try:
                data = await fetch_json(client, SCOREBOARD.format(league=lid))
                return [(e, lid, clean(league.get("name"))) for e in (data.get("events") or [])]
            except Exception:
                # Header itself already contains event metadata on ESPN's cricket feed.
                return [(e, lid, clean(league.get("name"))) for e in (league.get("events") or [])]

        groups = await asyncio.gather(*(fetch_league(l) for l in leagues[:40]), return_exceptions=True)
        matches = []
        seen = set()
        for group in groups:
            if isinstance(group, Exception):
                continue
            for event, lid, lname in group:
                item = normalize_event(event, lid, lname)
                key = item["id"]
                if key in seen:
                    continue
                seen.add(key)
                if item["matchStarted"] and not item["matchEnded"]:
                    matches.append(item)
        return matches

@app.get("/")
async def root():
    now = time.time()
    if CACHE["data"] and now - CACHE["at"] < TTL:
        return JSONResponse({"source": "espn-public-feed", "cached": True, "data": CACHE["data"], "error": CACHE["error"]})
    try:
        data = await get_live_matches()
        CACHE.update({"at": now, "data": data, "error": None})
        return JSONResponse({"source": "espn-public-feed", "cached": False, "data": data})
    except Exception as exc:
        CACHE["error"] = "upstream cricket feed temporarily unavailable"
        CACHE["at"] = now
        return JSONResponse({"source": "espn-public-feed", "cached": False, "data": CACHE["data"], "error": CACHE["error"]})
