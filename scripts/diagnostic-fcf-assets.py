import re, urllib.request, html, json
from html.parser import HTMLParser
URLS={
"Amateur A":"https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats",
"Amateur Fem A":"https://www.fcf.cat/ca/competicio/2026-2027/segona-divisio-femeni/grup-5/resultats"}
for name,url in URLS.items():
 print("\n=== "+name+" ===")
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(req,timeout=20) as response: page=response.read(1500000).decode("utf-8","replace")
  scripts=re.findall(r'<script\\b[^>]*src=["\\']([^"\\']+)',page,re.I)
  print("Scripts externs (camins):")
  for src in scripts[:25]: print(" ",src.split("?")[0][:160])
  print("Marcadors de dades:",{key:len(re.findall(re.escape(key),page,re.I)) for key in ["__NEXT_DATA__","__NUXT__","__INITIAL_STATE__","application/json","data-page","axios","fetch(","inertia","livewire","partits","matches","fixtures","resultats"]})
  for pattern in [r'<script[^>]+type=["\\']application/json["\\'][^>]*>',r'<div[^>]+id=["\\'](?:app|__next)["\\'][^>]*>',r'<meta[^>]+name=["\\']csrf-token["\\'][^>]*>']:
   found=re.findall(pattern,page,re.I)
   print("Indicador:",pattern[:48],"quantitat",len(found))
  for token in ["TERCERA CATALANA","SEGONA DIVISIO FEMENI","resultats"]:
   indices=[m.start() for m in re.finditer(re.escape(token),page,re.I)]
   print("Context de",token,":",re.sub(r'\\s+',' ',html.unescape(page[max(0,indices[-1]-150):indices[-1]+250]))[:400] if indices else "absent")
 except Exception as e: print("Error:",type(e).__name__,str(e)[:150])
