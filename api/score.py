# Self-hosted score endpoint adapted from the MIT-licensed
# mskian/live-cricket-score-api project, with simplified output for CricketHub.

import html, re, time
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI(title="CricketHub Score Feed", docs_url=None, redoc_url=None)
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CricketHub/1.0)", "Referer": "https://www.cricbuzz.com/"}

def clean(text):
    return html.escape(" ".join((text or "").split()))

@app.get("/")
async def root(score: str = Query(..., min_length=4, max_length=20)):
    if not score.isdigit():
        return JSONResponse({"status": "error", "message": "invalid match id"}, status_code=422)
    try:
        url = "https://www.cricbuzz.com/live-cricket-scores/" + score + "?_=" + str(time.time_ns())
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")
        title = clean(re.sub(r"^Cricket commentary\s*\|\s*", "", soup.title.get_text(" ", strip=True) if soup.title else "Live Cricket"))
        og = soup.find("meta", property="og:title")
        og_title = clean(og.get("content", "") if og else "")
        score_text = "Score not available"
        found = re.search(r"([A-Z]{2,8})\s+(\d+)/(\d+)\s*\(([\d.]+)\)", og_title)
        if found:
            team, runs, wickets, overs = found.groups()
            score_text = f"{team} {runs}/{wickets} ({overs})"

        batsmen = []
        bracket = re.search(r"\((.*?)\)\s*\|", og_title)
        if bracket:
            for name, value in re.findall(r"([A-Za-z\s.'-]+)\s+(\d+\(\d+\))", bracket.group(1))[:2]:
                batsmen.append({"name": clean(name), "score": clean(value)})
        while len(batsmen) < 2:
            batsmen.append({"name": "Not available", "score": "—"})

        page = clean(soup.get_text(" ", strip=True))
        bowler = re.search(r"Bowler.*?([A-Za-z.'\- ]+?)\s+\d+\s+\d+", page, re.I)
        return {
            "status": "success",
            "title": title,
            "score": score_text,
            "current_batsmen": batsmen,
            "current_bowler": {"name": clean(bowler.group(1)) if bowler else "Not available"},
            "source": "self-hosted-scraper",
        }
    except Exception:
        return JSONResponse({"status": "error", "message": "score temporarily unavailable"}, status_code=200)
