"""Prova final de Matchapp via Browserless; no modifica dades de la web."""
import json, os, pathlib, sys, urllib.request, urllib.error
from urllib.parse import urlencode
token=os.environ.get("BROWSERLESS_TOKEN","").strip()
if not token: sys.exit("Falta BROWSERLESS_TOKEN")
code=r"""
export default async ({page}) => {
 const url='https://go.matchapp.es/team/43244/-1/round/CAT/football';
 const navigation=[];
 page.on('response', r => {if (/matchapp\.es/.test(r.url())) navigation.push({status:r.status(), url:r.url().split('?')[0]});});
 let error=null, status=null;
 try {const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}); status=response?.status()||null;}
 catch(e){error=String(e).slice(0,250);}
 await new Promise(r=>setTimeout(r,8000));
 const info=await page.evaluate(()=>({
   url:location.href, title:document.title,
   text:(document.body?.innerText||'').slice(0,2400),
   links:[...document.querySelectorAll('a[href]')].slice(0,15).map(a=>({text:a.innerText.slice(0,60),href:a.href.split('?')[0]})),
   deepLinks:[...document.querySelectorAll('a[href]')].filter(a=>/^(intent:|matchapp:|market:)/.test(a.href)).length
 }));
 return {data:{status,error,info,navigation:navigation.slice(-25)},type:'application/json'};
};
"""
payload=json.dumps({"code":code}).encode()
url="https://production-sfo.browserless.io/function?"+urlencode({"token":token})
request=urllib.request.Request(url,data=payload,headers={"Content-Type":"application/json"},method="POST")
try:
 with urllib.request.urlopen(request,timeout=90) as response:
  raw=response.read(180000)
  parsed=json.loads(raw)
  pathlib.Path("captures-matchapp").mkdir(exist_ok=True)
  pathlib.Path("captures-matchapp/diagnostic.json").write_text(json.dumps(parsed,ensure_ascii=False,indent=2))
  print("Diagnòstic Matchapp:",json.dumps(parsed,ensure_ascii=False)[:4000])
except urllib.error.HTTPError as e:
 print("Browserless HTTP:",e.code,"Detall:",e.read(400).decode("utf-8","replace").replace(token,"[SECRET]"))
 sys.exit(1)
except Exception as e:
 print("Error:",str(e).replace(token,"[SECRET]"))
 sys.exit(1)
