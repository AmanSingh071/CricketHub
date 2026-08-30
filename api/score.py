from typing import Any
import httpx
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI(title="CricketHub Score Feed", docs_url=None, redoc_url=None)

def clean(v: Any) -> str:
    return " ".join(str(v or "").split())

def event_parts(score: str):
    if ":" not in score:
        return None, None
    league, event = score.split(":", 1)
    return league.strip(), event.strip()

def scorecard_from_summary(data: dict, match_id: str):
    header = data.get("header") or {}
    competition = (header.get("competitions") or [{}])[0]
    competitors = competition.get("competitors") or []
    teams = []
    for c in competitors:
        team = c.get("team") or {}
        teams.append(clean(team.get("displayName") or team.get("shortDisplayName") or team.get("name")))

    cards = data.get("matchcards") or []
    innings = []
    for card in cards:
        batting, bowling = [], []
        title = clean(card.get("title") or card.get("name") or card.get("inning") or "Innings")
        for p in card.get("batsmen") or card.get("batting") or []:
            athlete = p.get("athlete") or p.get("player") or {}
            stats = p.get("stats") or p
            batting.append({
                "batsman": clean(athlete.get("displayName") or athlete.get("name") or p.get("name")),
                "runs": stats.get("runs", stats.get("r", "—")),
                "balls": stats.get("balls", stats.get("b", "—")),
                "fours": stats.get("fours", stats.get("4s", "—")),
                "sixes": stats.get("sixes", stats.get("6s", "—")),
                "dismissal": clean(stats.get("dismissalText") or stats.get("dismissal") or ""),
            })
        for p in card.get("bowlers") or card.get("bowling") or []:
            athlete = p.get("athlete") or p.get("player") or {}
            stats = p.get("stats") or p
            bowling.append({
                "bowler": clean(athlete.get("displayName") or athlete.get("name") or p.get("name")),
                "overs": stats.get("overs", stats.get("o", "—")),
                "maidens": stats.get("maidens", stats.get("m", "—")),
                "runs": stats.get("runsConceded", stats.get("runs", stats.get("r", "—"))),
                "wickets": stats.get("wickets", stats.get("w", "—")),
                "economy": stats.get("economy", stats.get("econ", "—")),
            })
        if batting or bowling or title:
            innings.append({"inning": title, "batting": batting, "bowling": bowling})

    status = clean((((competition.get("status") or {}).get("type") or {}).get("detail")) or "Live")
    return {
        "id": match_id,
        "name": clean(header.get("shortName") or header.get("name") or " vs ".join(teams) or "Live Match"),
        "status": status,
        "teams": teams,
        "scorecard": innings,
        "rawSource": "espn-public-feed",
    }

@app.get("/")
async def root(score: str = Query(..., min_length=3, max_length=80)):
    league, event = event_parts(score)
    if not league or not event:
        return JSONResponse({"status": "error", "message": "invalid match id"}, status_code=422)
    url = f"https://site.web.api.espn.com/apis/site/v2/sports/cricket/{league}/summary?event={event}&lang=en&region=in"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (CricketHub)"}) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        return {"status": "success", **scorecard_from_summary(data, score)}
    except Exception:
        return JSONResponse({"status": "error", "message": "live score temporarily unavailable"}, status_code=200)
