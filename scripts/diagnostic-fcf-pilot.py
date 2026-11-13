import re,html,urllib.request
from html.parser import HTMLParser
URLS={
"Amateur A":"https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats",
"Amateur Fem A":"https://www.fcf.cat/ca/competicio/2026-2027/segona-divisio-femeni/grup-5/resultats"
}
class Visible(HTMLParser):
 def __init__(self): super().__init__();self.skip=0;self.words=[]
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.skip=max(0,self.skip-1)
 def handle_data(self,data):
  if not self.skip and data.strip():self.words.append(data.strip())
for team,url in URLS.items():
 print("\\n=== "+team+" ===")
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"text/html"})
  with urllib.request.urlopen(req,timeout=20) as response: source=response.read(1500000).decode("utf-8","replace")
  parser=Visible();parser.feed(source)
  text=" ".join(parser.words)
  print("Titol:",(re.search(r'<title[^>]*>(.*?)</title>',source,re.I|re.S).group(1) if re.search(r'<title[^>]*>(.*?)</title>',source,re.I|re.S) else "no trobat")[:150])
  print("Text visible inicial:",re.sub(r'\\s+',' ',text)[:800])
  for word in ('sant vicen','sant vicenç','penya','barcelonista','jornada','resultats','ajax','api/'):
   hits=[m.start() for m in re.finditer(re.escape(word),source,re.I)]
   print("Patro",repr(word),"aparicions",len(hits))
   if hits:
    i=hits[0];print("Context:",re.sub(r'\\s+',' ',html.unescape(source[max(0,i-110):i+150]))[:260])
  print("Formularis:",len(re.findall(r'<form\\b',source,re.I)),"scripts externs:",len(re.findall(r'<script[^>]+src=',source,re.I)))
 except Exception as e:print("Error:",type(e).__name__,str(e)[:180])
