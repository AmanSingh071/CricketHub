import re,requests
from bs4 import BeautifulSoup
from fastapi import FastAPI,Query
from fastapi.responses import JSONResponse
app=FastAPI(title="CricketHub Scorecard",docs_url=None,redoc_url=None)
H={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Accept-Language":"en-US,en;q=0.9"}
def clean(v):return " ".join(str(v or "").split())
def n(v):
 v=clean(v)
 if v.isdigit():return int(v)
 try:return float(v)
 except:return v or "—"
@app.get("/")
async def root(score:str=Query(...,min_length=4,max_length=20)):
 if not score.isdigit():return JSONResponse({"status":"error","message":"invalid match id"},status_code=422)
 try:
  r=requests.get("https://www.cricbuzz.com/live-cricket-scorecard/"+score,headers=H,timeout=15);r.raise_for_status();soup=BeautifulSoup(r.content,"lxml")
  h=soup.find("h1",class_="cb-nav-hdr") or soup.find("h1");name=clean(h.get_text(" ",strip=True) if h else soup.title.get_text(" ",strip=True))
  st=soup.find("div",class_="cb-text-live") or soup.find("div",class_="cb-text-complete") or soup.find("div",class_="cb-text-preview");status=clean(st.get_text(" ",strip=True) if st else "Live")
  teams=[];m=re.search(r"(.+?)\s+vs\.?\s+(.+?)(?:\s*,|$)",name,re.I)
  if m:teams=[clean(m.group(1)),clean(m.group(2))]
  bat=[];bowl=[]
  for row in soup.find_all("div",class_="cb-scrd-itms"):
   c=row.find_all("div",class_=lambda z:z and "cb-col" in z)
   if len(c)<6:continue
   p=c[0].find("a",href=lambda z:z and "/profiles/" in z)
   if not p:continue
   v=[clean(z.get_text(" ",strip=True)) for z in c];player=clean(p.get_text(" ",strip=True))
   if re.fullmatch(r"\d+(?:\.\d+)?",v[1] or ""):bowl.append({"bowler":player,"overs":n(v[1]),"maidens":n(v[2]),"runs":n(v[3]),"wickets":n(v[4]),"economy":n(v[5])})
   elif v[1].isdigit() or v[2].isdigit():bat.append({"batsman":player.replace(" *","").replace("†",""),"dismissal":"","runs":n(v[1]),"balls":n(v[2]),"fours":n(v[3]),"sixes":n(v[4]),"strikeRate":n(v[5])})
  return {"status":"success","id":score,"name":name,"matchStatus":status,"teams":teams,"scorecard":[{"inning":name,"batting":bat,"bowling":bowl}],"rawSource":"cricketHub-cricbuzz-scraper"}
 except Exception:return JSONResponse({"status":"error","message":"scorecard temporarily unavailable"},status_code=200)