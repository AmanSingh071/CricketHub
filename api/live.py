import re
import time
from typing import Any
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="CricketHub Cricbuzz Live", docs_url=None, redoc_url=None)

CACHE: dict[str, Any] = {"at": 0.0, "data": [], "error": None}
TTL = 20
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
LIVE_URLS = (
    "https://www.cricbuzz.com/cricket-match/live-scores",
    "https://www.cricbuzz.com/",
)

def clean(value: Any) -> str:
    return " ".join(str(value or "").split())

def parse_teams(title: str):
    title = clean(re.sub(r"^\s*(?:live|cricket|match)\s*[:\-]?\s*", "", title, flags=re.I))
    m = re.search(r"(.+?)\s+vs\.?\s+(.+?)(?:\s*,|\s*\||$)", title, flags=re.I)
    if m:
        return [clean(m.group(1)), clean(m.group(2))]
    return []

def match_card_text(link):
    node = link
    best = clean(link.get_text(" ", strip=True))
    # Cricbuzz markup changes; climb a few containers and keep the richest compact block.
    for _ in range(5):
        parent = getattr(node, "parent", None)
        if not parent:
            break
        candidate = clean(parent.get_text(" ", strip=True))
        if 20 <= len(candidate) <= 1400:
            best = candidate
            node = parent
        else:
            break
    return best

def score_from_text(text: str, title: str):
    scores = []
    # Examples: IND 122-4 (15.2), India 122/4 (15.2)
    patterns = [
        r"\b([A-Za-z][A-Za-z .&'-]{1,35})\s+(\d+)\s*[-/]\s*(\d+)\s*\((\d+(?:\.\d+)?)\)",
        r"\b([A-Z]{2,8})\s+(\d+)\s*[-/]\s*(\d+)",
    ]
    seen = set()
    for pattern in patterns:
        for m in re.finditer(pattern, text):
            team = clean(m.group(1))
            key = team.lower()
            if key in seen:
                continue
            seen.add(key)
            scores.append({
                "inning": team,
                "r": int(m.group(2)),
                "w": int(m.group(3)),
                "o": m.group(4) if len(m.groups()) >= 4 else None,
            })
    return scores[:2]

async def fetch_html(client: httpx.AsyncClient, url: str):
    response = await client.get(url)
    response.raise_for_status()
    return response.text

async def scrape_live_matches():
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
        pages = []
        for url in LIVE_URLS:
            try:
                pages.append(await fetch_html(client, url))
            except Exception:
                continue

    matches = {}
    for html in pages:
        soup = BeautifulSoup(html, "lxml")
        for link in soup.find_all("a", href=re.compile(r"/live-cricket-scores/\d+")):
            href = link.get("href", "")
            id_match = re.search(r"/live-cricket-scores/(\d+)", href)
            if not id_match:
                continue
            match_id = id_match.group(1)
            title = clean(link.get("title") or link.get_text(" ", strip=True))
            card_text = match_card_text(link)

            # If the anchor text is just a score/label, derive a readable title from nearby card text.
            if not title or len(title) < 6 or not re.search(r"vs\.?|v\.?|women|men", title, re.I):
                m = re.search(r"([A-Za-z][A-Za-z .&'-]{2,50}\s+vs\.?\s+[A-Za-z][A-Za-z .&'-]{2,50})", card_text, re.I)
                if m:
                    title = clean(m.group(1))
            if not title:
                continue

            lower = card_text.lower()
            ended_markers = (" won by ", " match abandoned", " no result", " match drawn", "stumps", "result:")
            if any(marker in lower for marker in ended_markers):
                continue

            teams = parse_teams(title)
            score = score_from_text(card_text, title)
            status = "Live"
            status_match = re.search(r"(live[^|]{0,120}|day \d+[^|]{0,120}|innings break[^|]{0,120})", card_text, re.I)
            if status_match:
                status = clean(status_match.group(1))

            matches[match_id] = {
                "id": match_id,
                "name": title,
                "teams": teams,
                "teamInfo": [{"name": t} for t in teams],
                "score": score,
                "status": status,
                "matchStarted": True,
                "matchEnded": False,
                "source": "cricbuzz-live-scraper",
                "url": "https://www.cricbuzz.com" + href,
            }

    return list(matches.values())

@app.get("/")
async def root():
    now = time.time()
    if CACHE["data"] and now - CACHE["at"] < TTL:
        return JSONResponse({"source": "cricbuzz-live-scraper", "cached": True, "data": CACHE["data"], "error": CACHE["error"]})
    try:
        data = await scrape_live_matches()
        CACHE.update({"at": now, "data": data, "error": None})
        return JSONResponse({"source": "cricbuzz-live-scraper", "cached": False, "data": data})
    except Exception:
        CACHE["error"] = "cricbuzz live feed temporarily unavailable"
        CACHE["at"] = now
        return JSONResponse({"source": "cricbuzz-live-scraper", "cached": False, "data": CACHE["data"], "error": CACHE["error"]})
