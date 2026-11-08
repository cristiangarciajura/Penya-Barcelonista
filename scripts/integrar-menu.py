#!/usr/bin/env python3
from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
if 'data-view="sponsors"' in s:
    print("Sponsors already integrated");raise SystemExit(0)
nav='<button data-view="club">El club</button>'
assert s.count(nav)==1,"Main navigation changed; no modifications made"
s=s.replace(nav,nav+'\n   <button data-view="sponsors">Patrocinadors</button>',1)
needle="['El club','El club']];"
assert s.count(needle)==1,"Translation array changed"
s=s.replace(needle,"['El club','El club'],['Patrocinadors','Patrocinadores']];",1)
section='''<section class="view" id="sponsors">
 <div class="page-title"><div class="kicker" data-ca="Gràcies pel vostre suport" data-es="Gracias por vuestro apoyo">Gràcies pel vostre suport</div><h1 data-ca="Patrocinadors i col·laboradors" data-es="Patrocinadores y colaboradores">Patrocinadors i col·laboradors</h1><p data-ca="Entitats i empreses que fan costat a la Penya." data-es="Entidades y empresas que apoyan a la Penya.">Entitats i empreses que fan costat a la Penya.</p></div>
 <div class="pbsv-sponsor-grid" id="pbsvSponsorGrid"></div>
</section>'''
assert s.count("</main>")==1
s=s.replace("</main>",section+"\n</main>",1)
css="""<style id="pbsv-sponsor-styles">
.pbsv-sponsor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;margin-top:24px}
.pbsv-sponsor-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column}
.pbsv-sponsor-logo{height:145px;display:flex;align-items:center;justify-content:center;text-align:center;padding:18px;background:linear-gradient(135deg,#e7effb,#f8e7ed);color:var(--navy2);font-weight:850;font-size:18px}
.pbsv-sponsor-logo img{max-width:100%;max-height:112px;object-fit:contain}
.pbsv-sponsor-content{padding:18px;display:flex;flex:1;flex-direction:column;gap:12px}
.pbsv-sponsor-content h3{margin:0;font-size:17px}
.pbsv-sponsor-content a{margin-top:auto;align-self:flex-start;background:var(--blue);color:#fff;border-radius:999px;padding:10px 15px;font-size:13px;font-weight:800}
</style>"""
s=s.replace("</head>",css+"</head>",1)
js="""<script id="pbsv-sponsors-script">
(function(){
const fallback=[
{name:"Recuperaciones y Transportes Santiago Rubio",url:"https://www.instagram.com/recuptrans.santiago?vrfl=MW4zcmtsaWExOWxhNA=="},
{name:"Pneumàtics García",url:"https://www.instagram.com/pneumaticsgarciagt?xtok=dXZmcGVuajlwZDZj"},
{name:"Transmar",url:"https://transmar.net/es/"},
{name:"Ajuntament Sant Vicenç dels Horts",url:"https://svh.cat/"},
{name:"Agrupació FCB",url:"https://agrupaciofcb.cat/"}
];
function render(items){
 const grid=document.getElementById("pbsvSponsorGrid");if(!grid)return;
 grid.replaceChildren(...items.map(s=>{
 const card=document.createElement("article");card.className="pbsv-sponsor-card";
 const logo=document.createElement("div");logo.className="pbsv-sponsor-logo";
 if(s.image&&(/^(assets\\/|\\.\\/|https:\\/\\/)/.test(s.image)||s.image.startsWith("data:image/jpeg;base64,"))){const img=document.createElement("img");img.src=s.image;img.alt=s.name;img.onerror=()=>logo.replaceChildren(document.createTextNode(s.name));logo.append(img)}else logo.textContent=s.name;
 const body=document.createElement("div");body.className="pbsv-sponsor-content";
 const name=document.createElement("h3");name.textContent=s.name;
 const link=document.createElement("a");link.href=s.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Visitar ↗";
 body.append(name,link);card.append(logo,body);return card;
 }));
}
render(fallback);
fetch("./data/patrocinadors.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("fetch failed");return r.json()}).then(d=>{if(Array.isArray(d.sponsors)){const items=d.sponsors.filter(s=>typeof s.name==="string"&&typeof s.url==="string"&&s.url.startsWith("https://"));if(items.length)render(items)}}).catch(console.warn);
})();
</script>"""
s=s.replace("</body>",js+"</body>",1)
assert 'data-view="sponsors"' in s and 'id="pbsvSponsorGrid"' in s
p.write_text(s,encoding="utf-8")
print("Sponsor tab integrated in existing single-page app; alerts preserved")
