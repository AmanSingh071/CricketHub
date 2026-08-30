# Self-hosted live cricket discovery endpoint.
# Inspired by the MIT-licensed mskian/live-cricket-score-api project.
# This endpoint reads publicly available score pages; it is not an official provider API.

import re, time
from typing import Any
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="CricketHub Live Feed", docs_url=None, redoc_url=None)

CACHE: dict[str, Any] = {"at": 0.0, "data": []}
TTL = 60
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CricketHub/1.0)",
    "Accept-Language": "en-US,en;q=0.9",
}

def clean(value: str) -> str:
    return " ".join((value or "").split())

def team_names(name: str):
    parts = re.split(r"\s+vs\.?\s+", name, flags=re.I)
    return [clean(x) for x in parts[:2]] if len(parts) >= 2 else []

def parse_score(text: str):
    scores = []
    # Compact score examples: IND 123-4 (15.2), IND 123/4 (15.2)
    for team, runs, sep, wickets, overs in re.findall(
        r"\\b([A-Z][A-Z0-9]{1,10})\\s+(\\d+)([-/])(\\d+)\\s*\\((\\d+(?:\\.\\d+)?)\\)", text
    ):
        scores.append({"inning": team, "r": int(runs), "w": int(wickets), "o": overs})
    return scores


@app.get("/")
async def root():
    now = time.time()
    if CACHE["data"] and now - CACHE["at"] < TTL:
        return JSONResponse({"source": "self-hosted-scraper", "cached": True, "data": CACHE["data"]})

    url = "https://m.cricbuzz.com/cricket-match/live-scores"
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")
        cards = soup.select(".cb-lv-scrs-well")
        if not cards:
            cards = soup.select(".cb-lv-scrs-col")

        seen = set()
        matches = []
        for card in cards:
            link = card.find("a", href=re.compile(r"/live-cricket-scores/\d+"))
            if not link:
                continue
            href = link.get("href", "")
            match_id = re.search(r"/live-cricket-scores/(\d+)", href)
            if not match_id or match_id.group(1) in seen:
                continue
            seen.add(match_id.group(1))
            text = clean(card.get_text(" ", strip=True))
            name = clean(link.get_text(" ", strip=True))
            if not name or len(name) < 5:
                slug = href.rstrip("/").split("/")[-1]
                name = clean(re.sub(r"^\d+-", "", slug).replace("-", " "))
            lower = text.lower()
            ended_words = ("won by", "match drawn", "match abandoned", "no result", "stumps", "result")
            match_ended = any(word in lower for word in ended_words)
            # Cards on the live page are current matches; completed cards are marked ended.
            teams = team_names(name)
            matches.append({
                "id": match_id.group(1),
                "name": name,
                "teams": teams,
                "score": parse_score(text),
                "status": text[-220:] if text else "Live score update available",
                "matchStarted": True,
                "matchEnded": match_ended,
                "source": "self-hosted-scraper",
                "url": "https://www.cricbuzz.com" + href,
            })

        CACHE["at"] = now
        CACHE["data"] = matches
        return JSONResponse({"source": "self-hosted-scraper", "cached": False, "data": matches})
    except Exception as exc:
        return JSONResponse({"source": "self-hosted-scraper", "data": CACHE["data"], "error": "live feed temporarily unavailable"}, status_code=200)
