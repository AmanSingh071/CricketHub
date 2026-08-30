import random,re,time
from typing import Any
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import JSONResponse
app=FastAPI(title="CricketHub Cricbuzz Scraper",docs_url=None,redoc_url=None)
BASE="https://www.cricbuzz.com";URLS=[BASE+"/cricket-match/live-scores",BASE+"/"]
UAS=["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"]
CACHE:dict[str,Any]={"at":0.0,"data":[],"debug":{}};TTL=15
def clean(v):return " ".join(str(v or "").split())
def fetch(url):
 r=requests.get(url,headers={"User-Agent":random.choice(UAS),"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"en-US,en;q=0.9","Cache-Control":"no-cache"},timeout=15);r.raise_for_status();return r.text
def ctx(a):
 out=[];node=a
 for _ in range(5):
  if not node:break
  t=clean(node.get_text(" ",strip=True))
  if 5<len(t)<1800:out.append(t)
  node=getattr(node,"parent",None)
 return " | ".join(dict.fromkeys(out))
def get_title(a,x):
 t=clean(a.get("title") or a.get_text(" ",strip=True))
 if re.search(r"\bvs\.?\b",t,re.I):return t
 m=re.search(r"([A-Za-z][A-Za-z .&'()\-]{1,70}\s+vs\.?\s+[A-Za-z][A-Za-z .&'()\-]{1,70}?)(?:\s+(?:LIVE|\d+(?:st|nd|rd|th)\s+Match)|\||$)",x,re.I)
 return clean(m.group(1)) if m else t
def is_live(t,x):
 s=(" "+t+" "+x+" ").lower()
 if any(z in s for z in [" won by "," match abandoned"," no result"," match drawn"," stumps"," completed"," complete"]):return False
 return any(z in s for z in [" live "," need ","need ","target ","trail by","lead by","innings break","in progress"])
def get_teams(t):
 t=re.sub(r"\s+LIVE\b","",t,flags=re.I);m=re.search(r"(.+?)\s+vs\.?\s+(.+?)(?:\s+(?:LIVE|\d+(?:st|nd|rd|th)\s+Match)|$)",t,re.I)
 return [clean(m.group(1)),clean(m.group(2))] if m else []
def get_scores(x):
 out=[];seen=set()
 for m in re.finditer(r"\b([A-Z]{2,8})\s+(\d+)\s*[-/]\s*(\d+)\s*\(([^)]+)\)",x):
  if m.group(1) in seen:continue
  seen.add(m.group(1));out.append({"inning":m.group(1),"r":int(m.group(2)),"w":int(m.group(3)),"o":clean(m.group(4)).replace(" Balls","").replace(" balls","")})
 return out[:2]
def scrape():
 matches={};debug={"pages":[],"links":0,"liveCandidates":0}
 for url in URLS:
  try:html=fetch(url);debug["pages"].append({"url":url,"ok":True,"bytes":len(html)})
  except Exception as e:debug["pages"].append({"url":url,"ok":False,"error":type(e).__name__});continue
  soup=BeautifulSoup(html,"lxml")
  for a in soup.find_all("a",href=True):
   m=re.search(r"/live-cricket-scores/(\d+)",a.get("href",""))
   if not m:continue
   debug["links"]+=1;x=ctx(a);name=get_title(a,x)
   if not name or not is_live(name,x):continue
   debug["liveCandidates"]+=1;mid=m.group(1);ts=get_teams(name)
   matches[mid]={"id":mid,"name":re.sub(r"\s+LIVE\b","",name,flags=re.I).strip(),"teams":ts,"teamInfo":[{"name":z} for z in ts],"score":get_scores(x),"status":"Live","matchStarted":True,"matchEnded":False,"source":"cricketHub-cricbuzz-scraper"}
 return list(matches.values()),debug
@app.get("/")
async def root():
 now=time.time()
 if CACHE["data"] and now-CACHE["at"]<TTL:return JSONResponse({"ok":True,"cached":True,"data":CACHE["data"],"debug":CACHE["debug"]})
 data,debug=scrape();CACHE.update({"at":now,"data":data,"debug":debug})
 return JSONResponse({"ok":True,"cached":False,"data":data,"debug":debug})