import re
from typing import Any
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI(title="CricketHub Cricbuzz Scorecard", docs_url=None, redoc_url=None)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

def clean(value: Any) -> str:
    return " ".join(str(value or "").split())

def num(value: str):
    value = clean(value)
    try:
        return int(value)
    except Exception:
        try:
            return float(value)
        except Exception:
            return value or "—"

def parse_scorecard(soup: BeautifulSoup, match_id: str):
    title_node = soup.select_one("h1.cb-nav-hdr") or soup.find("h1")
    title = clean(title_node.get_text(" ", strip=True) if title_node else "")
    if not title:
        title_tag = soup.title
        title = clean(title_tag.get_text(" ", strip=True) if title_tag else "Live Match")

    status_node = soup.select_one(".cb-text-live, .cb-text-complete, .cb-text-preview")
    status = clean(status_node.get_text(" ", strip=True) if status_node else "Live")

    teams = []
    m = re.search(r"(.+?)\s+vs\.?\s+(.+?)(?:\s*,|\s*\||$)", title, re.I)
    if m:
        teams = [clean(m.group(1)), clean(m.group(2))]

    innings = []
    # Each Cricbuzz scorecard header is followed by scorecard rows.
    headers = soup.select(".cb-scrd-hdr-rw")
    for header in headers:
        header_text = clean(header.get_text(" ", strip=True))
        section = header.parent
        rows = []
        if section:
            rows = section.select(".cb-scrd-itms")

        batting = []
        bowling = []
        mode = "batting"
        for row in rows:
            row_text = clean(row.get_text(" ", strip=True))
            if not row_text:
                continue
            low = row_text.lower()
            if "bowler" in low and ("overs" in low or "wkts" in low):
                mode = "bowling"
                continue
            if "batter" in low or ("runs" in low and "balls" in low and "sr" in low):
                mode = "batting"
                continue

            cols = [clean(x.get_text(" ", strip=True)) for x in row.select(":scope > .cb-col")]
            if len(cols) < 2:
                continue
            link = row.find("a")
            name = clean(link.get_text(" ", strip=True) if link else cols[0])
            if not name or name.lower() in ("extras", "total"):
                continue

            if mode == "bowling":
                if len(cols) >= 6:
                    bowling.append({
                        "bowler": name,
                        "overs": num(cols[1]),
                        "maidens": num(cols[2]),
                        "runs": num(cols[3]),
                        "wickets": num(cols[4]),
                        "economy": num(cols[5]),
                    })
            else:
                if len(cols) >= 6:
                    dismissal = cols[0]
                    batting.append({
                        "batsman": name,
                        "dismissal": dismissal,
                        "runs": num(cols[-5]),
                        "balls": num(cols[-4]),
                        "fours": num(cols[-3]),
                        "sixes": num(cols[-2]),
                        "strikeRate": num(cols[-1]),
                    })

        if batting or bowling:
            innings.append({"inning": header_text or "Innings", "batting": batting, "bowling": bowling})

    return {
        "status": "success",
        "id": match_id,
        "name": title,
        "matchStatus": status,
        "teams": teams,
        "scorecard": innings,
        "rawSource": "cricbuzz-live-scraper",
    }

@app.get("/")
async def root(score: str = Query(..., min_length=4, max_length=30)):
    if not score.isdigit():
        return JSONResponse({"status": "error", "message": "invalid Cricbuzz match id"}, status_code=422)
    url = "https://www.cricbuzz.com/live-cricket-scorecard/" + score
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
            response = await client.get(url)
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")
        data = parse_scorecard(soup, score)
        return JSONResponse(data)
    except Exception:
        return JSONResponse({"status": "error", "message": "scorecard temporarily unavailable"}, status_code=200)
